'use strict'
const crypto = require('crypto')
const db = require('../../lib/raas/pgdb')
const driveLib = require('../../lib/raas/drive')
const { encrypt, decrypt } = require('../../lib/raas/encryption')
const { syncTenant } = require('../../lib/raas/ingestion/worker')

// POST /api/raas/admin/drive/connect
async function connect(req, res) {
  const tenantId = req.user.tenantId
  try {
    const nonce = crypto.randomBytes(16).toString('hex')
    await db.query(
      `INSERT INTO drive_connections (tenant_id, folder_id, oauth_nonce, oauth_nonce_exp)
       VALUES ($1, '', $2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (tenant_id) DO UPDATE SET oauth_nonce = $2, oauth_nonce_exp = NOW() + INTERVAL '10 minutes'`,
      [tenantId, nonce]
    )
    const authUrl = driveLib.getAuthUrl(`${tenantId}:${nonce}`)
    return res.json({ authUrl })
  } catch (err) {
    console.error('[admin-drive] connect error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/raas/admin/drive/callback
async function callback(req, res) {
  const { code, error, state } = req.query
  if (error) return res.status(400).json({ error })
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })

  const [tenantId, nonce] = state.split(':')
  if (!tenantId || !nonce) return res.status(400).json({ error: 'Invalid state' })

  try {
    const nonceRes = await db.query(
      `SELECT oauth_nonce FROM drive_connections
       WHERE tenant_id = $1 AND oauth_nonce = $2 AND oauth_nonce_exp > NOW()`,
      [tenantId, nonce]
    )
    if (nonceRes.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired state' })

    await db.query(
      `UPDATE drive_connections SET oauth_nonce = NULL, oauth_nonce_exp = NULL WHERE tenant_id = $1`,
      [tenantId]
    )

    const tokens = await driveLib.exchangeCode(code)

    await db.query(
      `INSERT INTO drive_connections (tenant_id, folder_id, folder_name, access_token_enc, refresh_token_enc, token_expiry, status)
       VALUES ($1, '', NULL, $2, $3, $4, 'CONNECTED')
       ON CONFLICT (tenant_id) DO UPDATE SET
         access_token_enc = EXCLUDED.access_token_enc,
         refresh_token_enc = EXCLUDED.refresh_token_enc,
         token_expiry = EXCLUDED.token_expiry,
         status = 'CONNECTED',
         updated_at = NOW()`,
      [
        tenantId,
        encrypt(tokens.access_token),
        encrypt(tokens.refresh_token),
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      ]
    )

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
    return res.redirect(`${clientOrigin}/apps/raas/admin/drive?connected=1`)
  } catch (err) {
    console.error('[admin-drive] callback error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /api/raas/admin/drive/folder  — set folder after OAuth
async function setFolder(req, res) {
  const { folderId } = req.body
  const tenantId = req.user.tenantId
  if (!folderId) return res.status(400).json({ error: 'folderId required' })

  try {
    const connRes = await db.query(
      'SELECT * FROM drive_connections WHERE tenant_id = $1',
      [tenantId]
    )
    if (connRes.rows.length === 0) {
      return res.status(400).json({ error: 'No drive connection found. Complete OAuth first.' })
    }
    const conn = connRes.rows[0]
    const auth = driveLib.createAuthedClient(
      decrypt(conn.access_token_enc),
      decrypt(conn.refresh_token_enc),
      conn.token_expiry
    )

    const meta = await driveLib.getFolderMeta(auth, folderId)
    await db.query(
      'UPDATE drive_connections SET folder_id = $1, folder_name = $2, updated_at = NOW() WHERE tenant_id = $3',
      [folderId, meta.name, tenantId]
    )

    return res.json({ folderId, folderName: meta.name })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/raas/admin/drive/status
async function status(req, res) {
  const tenantId = req.user.tenantId
  try {
    const connRes = await db.query(
      'SELECT folder_id, folder_name, status, last_sync_at, updated_at FROM drive_connections WHERE tenant_id = $1',
      [tenantId]
    )
    if (connRes.rows.length === 0) {
      return res.json({ connected: false })
    }
    const conn = connRes.rows[0]

    const docStats = await db.query(
      `SELECT status, COUNT(*) as count FROM documents WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    )
    const stats = {}
    for (const row of docStats.rows) stats[row.status] = parseInt(row.count, 10)

    return res.json({
      connected: conn.status === 'CONNECTED',
      status: conn.status,
      folderId: conn.folder_id,
      folderName: conn.folder_name,
      lastSyncAt: conn.last_sync_at,
      docStats: stats,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /api/raas/admin/drive/sync
async function sync(req, res) {
  const tenantId = req.user.tenantId
  try {
    // Fire-and-forget sync
    syncTenant(tenantId).catch((err) =>
      console.error('[admin-drive] sync error:', err.message)
    )
    return res.json({ message: 'Sync started' })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/raas/admin/drive/documents
async function documents(req, res) {
  const tenantId = req.user.tenantId
  try {
    const result = await db.query(
      `SELECT d.id, d.name, d.mime_type, d.web_view_link, d.status, d.error_message, d.updated_at,
              (SELECT COUNT(*) FROM chunks c WHERE c.document_id = d.id) AS chunk_count
       FROM documents d
       WHERE d.tenant_id = $1
       ORDER BY d.updated_at DESC`,
      [tenantId]
    )
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { connect, callback, setFolder, status, sync, documents }
