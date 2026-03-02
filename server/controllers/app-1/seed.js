'use strict'
/**
 * One-time seed script: embeds persona past replies and upserts to Pinecone.
 *
 * Usage:
 *   node server/controllers/app-1/seed.js
 *
 * Requires: PINECONE_API_KEY, PINECONE_INDEX in server/.env
 * Each persona gets its own namespace: creator-twin-{personaId}
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const { embedBatch } = require('../../lib/raas/embeddings')
const { upsert } = require('../../lib/raas/pinecone')
const { PERSONAS } = require('./personas')

async function seedPersona(persona) {
  const namespace = `creator-twin-${persona.id}`
  console.log(`\nSeeding persona: ${persona.name} → namespace: ${namespace}`)

  // Build text chunks: combine comment + reply for richer context
  const texts = persona.sampleReplies.map(
    (r) => `Comment: "${r.comment}" → Reply: "${r.reply}"`
  )

  console.log(`  Embedding ${texts.length} reply pairs...`)
  const embeddings = await embedBatch(texts)

  const vectors = texts.map((text, i) => ({
    id: `${persona.id}-reply-${i}`,
    values: embeddings[i],
    metadata: {
      personaId: persona.id,
      personaName: persona.name,
      comment: persona.sampleReplies[i].comment,
      reply: persona.sampleReplies[i].reply,
      text,
    },
  }))

  await upsert(namespace, vectors)
  console.log(`  ✓ Upserted ${vectors.length} vectors to namespace: ${namespace}`)
}

async function main() {
  console.log('=== EngageAI — Pinecone Seed Script ===')
  console.log(`Index: ${process.env.PINECONE_INDEX}`)

  for (const persona of PERSONAS) {
    await seedPersona(persona)
  }

  console.log('\n✅ Seed complete! All 3 namespaces ready.')
  console.log('Namespaces created:')
  PERSONAS.forEach((p) => console.log(`  • creator-twin-${p.id}`))
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
