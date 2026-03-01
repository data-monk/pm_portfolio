'use strict'
const { embedOne } = require('../../lib/raas/embeddings')
const { query } = require('../../lib/raas/pinecone')
const { complete } = require('../../lib/app1/openai')
const { PERSONAS } = require('./personas')

const PERSONAS_MAP = Object.fromEntries(PERSONAS.map((p) => [p.id, p]))

/**
 * GET /api/app-1/personas
 * Returns list of available personas (without sampleReplies to keep payload small).
 */
async function listPersonas(req, res) {
  const list = PERSONAS.map(({ id, name, handle, niche, avatar, tone, videoTitle, videoDescription }) => ({
    id,
    name,
    handle,
    niche,
    avatar,
    tone,
    videoTitle,
    videoDescription,
  }))
  res.json({ personas: list })
}

/**
 * POST /api/app-1/reply
 * Body: { comment: string, personaId: string }
 * Returns: { reply: string, confidence: number, retrievedContext: [{text, score}] }
 *
 * Pipeline:
 *  1. Embed the incoming comment
 *  2. Query Pinecone namespace creator-twin-{personaId} top-k=3
 *  3. Build a system prompt with persona tone + retrieved past replies
 *  4. Call Claude Haiku to generate the reply
 *  5. Compute confidence from top-1 Pinecone score (0–1 normalized)
 */
async function generateReply(req, res) {
  const { comment, personaId } = req.body

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return res.status(400).json({ error: 'comment is required' })
  }
  if (!personaId || !PERSONAS_MAP[personaId]) {
    return res.status(400).json({ error: `Unknown personaId: ${personaId}` })
  }

  const persona = PERSONAS_MAP[personaId]
  const namespace = `creator-twin-${personaId}`

  try {
    // Step 1: embed the comment
    const queryVector = await embedOne(comment.trim())

    // Step 2: retrieve top-3 similar past replies
    const matches = await query(namespace, queryVector, 3)

    // Step 3: build prompt
    const contextBlock = matches.length > 0
      ? matches
          .map((m, i) => `Example ${i + 1}:\n  Comment: "${m.metadata.comment}"\n  Reply: "${m.metadata.reply}"`)
          .join('\n\n')
      : 'No similar past replies found — use persona tone to craft a natural reply.'

    const systemPrompt =
      `You are ${persona.name}, a TikTok creator in the "${persona.niche}" niche.\n` +
      `Your reply style: ${persona.tone}\n\n` +
      `Here are examples of how you have replied to similar comments before:\n\n` +
      `${contextBlock}\n\n` +
      `Instructions:\n` +
      `- Reply to the new comment below in exactly ${persona.name}'s voice and style.\n` +
      `- Keep the reply short (1-3 sentences) like a real TikTok comment reply.\n` +
      `- Match the energy and tone of the examples above.\n` +
      `- Do NOT start with "Sure" or any meta-commentary. Just write the reply itself.`

    const userMessage = `New comment to reply to: "${comment.trim()}"`

    // Step 4: generate reply
    const llmResult = await complete(systemPrompt, userMessage, 256)

    // Step 5: compute confidence from top-1 similarity score
    // Pinecone cosine scores are 0–1; we map to a human-readable percentage
    const topScore = matches.length > 0 ? matches[0].score : 0
    // Normalize: scores below 0.5 are weak, above 0.85 are strong
    const confidence = Math.round(Math.min(Math.max(topScore, 0), 1) * 100)

    // Build retrieved context for the UI drawer
    const retrievedContext = matches.map((m) => ({
      comment: m.metadata.comment,
      reply: m.metadata.reply,
      score: Math.round(m.score * 100),
    }))

    res.json({
      reply: llmResult.text.trim(),
      confidence,
      retrievedContext,
      personaId,
      personaName: persona.name,
    })
  } catch (err) {
    console.error('[app-1/generateReply] error:', err.message)
    res.status(500).json({ error: 'Failed to generate reply', detail: err.message })
  }
}

module.exports = { listPersonas, generateReply }
