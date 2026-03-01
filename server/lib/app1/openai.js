'use strict'
const OpenAI = require('openai')

const MODEL = 'gpt-4o-mini'

let client

function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

/**
 * Send a chat completion request to GPT-4o-mini.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} [maxTokens=256]
 * @returns {Promise<{text: string, inputTokens: number, outputTokens: number}>}
 */
async function complete(systemPrompt, userMessage, maxTokens = 256) {
  const start = Date.now()
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  const text = response.choices[0]?.message?.content ?? ''
  return {
    text,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
    model: MODEL,
  }
}

module.exports = { complete, MODEL }
