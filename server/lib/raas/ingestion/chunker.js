'use strict'

const CHUNK_WORDS = 800
const OVERLAP_WORDS = 100

/**
 * Split text into overlapping word-based chunks.
 * @param {string} text
 * @param {number} [chunkWords]
 * @param {number} [overlapWords]
 * @returns {{text: string, index: number, tokenCount: number}[]}
 */
function chunkText(text, chunkWords = CHUNK_WORDS, overlapWords = OVERLAP_WORDS) {
  // Normalise whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const words = cleaned.split(/\s+/)

  if (words.length === 0) return []

  const chunks = []
  let start = 0
  let index = 0

  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length)
    const chunkWords_ = words.slice(start, end)
    const chunkText_ = chunkWords_.join(' ')
    chunks.push({
      text: chunkText_,
      index,
      // Rough token estimate: ~0.75 words per token for English
      tokenCount: Math.ceil(chunkWords_.length / 0.75),
    })
    index++
    // Advance by chunkSize - overlap
    start += chunkWords - overlapWords
    if (start >= words.length) break
  }

  return chunks
}

module.exports = { chunkText }
