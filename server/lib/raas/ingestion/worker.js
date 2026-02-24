'use strict'
const crypto = require('crypto')
const db = require('../pgdb')
const driveLib = require('../drive')
const { extractText } = require('./parser')
const { chunkText } = require('./chunker')
const { embedBatch } = require('../embeddings')
const { upsert: pineconeUpsert, deleteByDocument } = require('../pinecone')
const { decrypt } = require('../encryption')

// ── In-process job queue ──────────────────────────────────────────────────────
const queue = []
let processing = false

function enqueue(documentId, tenantId) {
  // Avoid duplicates
  if (!queue.find((j) => j.documentId === documentId)) {
    queue.push({ documentId, tenantId })
    console.log(`[worker] Queued document ${documentId}`)
  }
  if (!processing) processNext()
}

async function processNext() {
  if (queue.length === 0) {
    processing = false
    return
  }
  processing = true
  const job = queue.shift()
  try {
    await ingestDocument(job.documentId, job.tenantId)
  } catch (err) {
    console.error(`[worker] Job failed for doc ${job.documentId}:`, err.message)
  }
  setImmediate(processNext)
}

// ── Core ingestion logic ──────────────────────────────────────────────────────
async function ingestDocument(documentId, tenantId) {
  console.log(`[worker] Ingesting document ${documentId}`)

  // 1. Fetch document record
  const docRes = await db.query('SELECT * FROM documents WHERE id = $1 AND tenant_id = $2', [
    documentId,
    tenantId,
  ])
  if (docRes.rows.length === 0) throw new Error(`Document ${documentId} not found`)
  const doc = docRes.rows[0]

  // 2. Set status → INGESTING
  await db.query(
    "UPDATE documents SET status = 'INGESTING', updated_at = NOW() WHERE id = $1",
    [documentId]
  )

  try {
    // 3. Get drive connection
    const connRes = await db.query(
      'SELECT * FROM drive_connections WHERE tenant_id = $1',
      [tenantId]
    )
    if (connRes.rows.length === 0) throw new Error('No drive connection for tenant')
    const conn = connRes.rows[0]

    const auth = driveLib.createAuthedClient(
      decrypt(conn.access_token_enc),
      decrypt(conn.refresh_token_enc),
      conn.token_expiry
    )

    // 4. Extract text
    const rawText = await extractText(auth, {
      id: doc.drive_file_id,
      mimeType: doc.mime_type,
    })

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Extracted text is empty')
    }

    // 5. Chunk
    const chunks = chunkText(rawText)
    if (chunks.length === 0) throw new Error('No chunks produced')

    // 6. Delete existing vectors for this doc
    await deleteByDocument(tenantId, documentId).catch(() => {})

    // 7. Delete old chunk records
    await db.query('DELETE FROM chunks WHERE document_id = $1', [documentId])

    // 8. Embed all chunks
    const texts = chunks.map((c) => c.text)
    const embeddings = await embedBatch(texts)

    // 9. Build Pinecone vectors
    const vectors = chunks.map((chunk, i) => ({
      id: `${tenantId}:${documentId}:${chunk.index}`,
      values: embeddings[i],
      metadata: {
        tenantId,
        documentId,
        driveFileId: doc.drive_file_id,
        docName: doc.name,
        chunkIndex: chunk.index,
        textPreview: chunk.text.slice(0, 300),
        webViewLink: doc.web_view_link ?? '',
        mimeType: doc.mime_type ?? '',
      },
    }))

    // 10. Upsert to Pinecone
    await pineconeUpsert(tenantId, vectors)

    // 11. Save chunk records to Postgres
    for (const chunk of chunks) {
      await db.query(
        `INSERT INTO chunks (tenant_id, document_id, chunk_index, text_preview, token_count, vector_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          documentId,
          chunk.index,
          chunk.text.slice(0, 300),
          chunk.tokenCount,
          `${tenantId}:${documentId}:${chunk.index}`,
        ]
      )
    }

    // 12. Mark READY
    await db.query(
      "UPDATE documents SET status = 'READY', error_message = NULL, updated_at = NOW() WHERE id = $1",
      [documentId]
    )
    console.log(`[worker] Document ${documentId} ingested — ${chunks.length} chunks`)
  } catch (err) {
    console.error(`[worker] Ingestion error for ${documentId}:`, err.message)
    await db.query(
      "UPDATE documents SET status = 'ERROR', error_message = $1, updated_at = NOW() WHERE id = $2",
      [err.message.slice(0, 500), documentId]
    )
  }
}

// ── Drive folder polling ──────────────────────────────────────────────────────
async function pollAllTenants() {
  try {
    const res = await db.query(
      "SELECT tenant_id FROM drive_connections WHERE status = 'CONNECTED'"
    )
    for (const row of res.rows) {
      await syncTenant(row.tenant_id)
    }
  } catch (err) {
    console.error('[worker] Poll error:', err.message)
  }
}

async function syncTenant(tenantId) {
  console.log(`[worker] Syncing tenant ${tenantId}`)
  try {
    const connRes = await db.query(
      'SELECT * FROM drive_connections WHERE tenant_id = $1',
      [tenantId]
    )
    if (connRes.rows.length === 0) return
    const conn = connRes.rows[0]

    const auth = driveLib.createAuthedClient(
      decrypt(conn.access_token_enc),
      decrypt(conn.refresh_token_enc),
      conn.token_expiry
    )

    const driveFiles = await driveLib.listFiles(auth, conn.folder_id)

    for (const file of driveFiles) {
      const hash = file.md5Checksum ?? crypto.createHash('md5').update(file.modifiedTime ?? '').digest('hex')

      const existing = await db.query(
        'SELECT id, content_hash, status FROM documents WHERE tenant_id = $1 AND drive_file_id = $2',
        [tenantId, file.id]
      )

      if (existing.rows.length === 0) {
        // New document
        const insertRes = await db.query(
          `INSERT INTO documents (tenant_id, drive_file_id, name, mime_type, web_view_link, content_hash, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING id`,
          [tenantId, file.id, file.name, file.mimeType, file.webViewLink, hash]
        )
        enqueue(insertRes.rows[0].id, tenantId)
      } else {
        const doc = existing.rows[0]
        if (doc.content_hash !== hash && doc.status !== 'INGESTING') {
          // Changed document — update hash and re-ingest
          await db.query(
            "UPDATE documents SET content_hash = $1, status = 'PENDING', updated_at = NOW() WHERE id = $2",
            [hash, doc.id]
          )
          enqueue(doc.id, tenantId)
        }
      }
    }

    // Mark last sync
    await db.query(
      'UPDATE drive_connections SET last_sync_at = NOW() WHERE tenant_id = $1',
      [tenantId]
    )
  } catch (err) {
    console.error(`[worker] Sync failed for tenant ${tenantId}:`, err.message)
    await db.query(
      "UPDATE drive_connections SET status = 'ERROR' WHERE tenant_id = $1",
      [tenantId]
    )
  }
}

// Start polling every 15 minutes
const POLL_INTERVAL_MS = 15 * 60 * 1000
setInterval(pollAllTenants, POLL_INTERVAL_MS)

module.exports = { enqueue, syncTenant }
