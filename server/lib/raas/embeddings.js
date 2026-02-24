'use strict'
const { Pinecone } = require('@pinecone-database/pinecone')

// Pinecone's hosted embedding model — no OpenAI key needed
const MODEL = 'multilingual-e5-large'
const DIMENSIONS = 1024

let pc

function getClient() {
  if (!pc) {
    if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY not set')
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  }
  return pc
}

/**
 * Embed a single query string.
 * Uses inputType='query' for asymmetric retrieval (E5 model).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedOne(text) {
  const result = await getClient().inference.embed(
    MODEL,
    [text],
    { inputType: 'query', truncate: 'END' }
  )
  return result[0].values
}

/**
 * Embed multiple document passages in a single API call.
 * Uses inputType='passage' for asymmetric retrieval (E5 model).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts) {
  if (texts.length === 0) return []
  const result = await getClient().inference.embed(
    MODEL,
    texts,
    { inputType: 'passage', truncate: 'END' }
  )
  return result.map((e) => e.values)
}

module.exports = { embedOne, embedBatch, DIMENSIONS, MODEL }
