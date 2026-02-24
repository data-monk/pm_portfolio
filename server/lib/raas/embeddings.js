'use strict'
const { OpenAI } = require('openai')

const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 1536
const BATCH_SIZE = 100

let client

function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

/**
 * Embed a single text string.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedOne(text) {
  const res = await getClient().embeddings.create({ model: MODEL, input: text })
  return res.data[0].embedding
}

/**
 * Embed multiple texts in batches to respect API limits.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts) {
  const results = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const res = await getClient().embeddings.create({ model: MODEL, input: batch })
    const sorted = res.data.sort((a, b) => a.index - b.index)
    results.push(...sorted.map((d) => d.embedding))
  }
  return results
}

module.exports = { embedOne, embedBatch, DIMENSIONS, MODEL }
