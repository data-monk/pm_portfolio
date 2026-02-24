'use strict'
const Anthropic = require('@anthropic-ai/sdk')

const MODEL = 'claude-haiku-4-5-20251001'

let client

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

/**
 * Send a chat completion request to Claude Haiku.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} [maxTokens=2048]
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number}>}
 */
async function complete(systemPrompt, userMessage, maxTokens = 2048) {
  const start = Date.now()
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  const text = response.content[0]?.text ?? ''
  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    latencyMs: Date.now() - start,
    model: MODEL,
  }
}

module.exports = { complete, MODEL }
