'use strict'
const { Pinecone } = require('@pinecone-database/pinecone')

let pc
let idx

function getClient() {
  if (!pc) {
    if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY not set')
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  }
  return pc
}

function getIndex() {
  if (!idx) {
    const indexName = process.env.PINECONE_INDEX
    if (!indexName) throw new Error('PINECONE_INDEX not set')
    idx = getClient().index(indexName)
  }
  return idx
}

/**
 * Upsert vectors for a specific tenant namespace.
 * @param {string} tenantId
 * @param {{id: string, values: number[], metadata: object}[]} vectors
 */
async function upsert(tenantId, vectors) {
  const ns = getIndex().namespace(tenantId)
  // Pinecone upsert limit is 100 per call
  const BATCH = 100
  for (let i = 0; i < vectors.length; i += BATCH) {
    await ns.upsert(vectors.slice(i, i + BATCH))
  }
}

/**
 * Query top-K vectors by embedding.
 * @param {string} tenantId
 * @param {number[]} queryVector
 * @param {number} topK
 * @returns {Promise<{id: string, score: number, metadata: object}[]>}
 */
async function query(tenantId, queryVector, topK = 8) {
  const ns = getIndex().namespace(tenantId)
  const res = await ns.query({ vector: queryVector, topK, includeMetadata: true })
  return res.matches ?? []
}

/**
 * Delete all vectors for a document (by metadata filter).
 * Pinecone serverless supports deleteMany with filter.
 * @param {string} tenantId
 * @param {string} documentId
 */
async function deleteByDocument(tenantId, documentId) {
  const ns = getIndex().namespace(tenantId)
  await ns.deleteMany({ filter: { documentId: { $eq: documentId } } })
}

module.exports = { upsert, query, deleteByDocument }
