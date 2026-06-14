# Creator Twin (EngageAI) — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (within portfolio monorepo) |
| Backend | Node.js + Express |
| Embeddings | OpenAI `text-embedding-3-small` (shared via `server/lib/raas/embeddings.js`) |
| Vector DB | Pinecone (namespace per persona: `creator-twin-{personaId}`) |
| LLM | OpenAI GPT-4o / GPT-4o-mini (via `server/lib/app1/openai.js`) |

## RAG Data Flow

```
User comment
    │
    ▼
embedOne(comment)  ──→  OpenAI Embeddings API
    │
    ▼
query(namespace, vector, top-k=3)  ──→  Pinecone
    │
    ▼
Build system prompt
  [persona tone + guardrail policy + retrieved past replies + transcript + notes]
    │
    ▼
complete(systemPrompt, userMessage, maxTokens=256)  ──→  OpenAI GPT
    │
    ▼
Return: { reply, confidence, retrievedContext, personaId, personaName }
```

## API Endpoints

All routes are mounted at `/api/app-1/` in `server/routes/app-1.js`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/app-1/personas` | List available creator personas (id, name, handle, niche, tone, avatar, videoTitle) |
| `POST` | `/api/app-1/reply` | Generate an AI reply for a comment |

### POST `/api/app-1/reply` — Request Body

```json
{
  "comment": "Where did you get that outfit?",
  "personaId": "fashion-creator-1",
  "transcript": "optional video transcript text",
  "notes": "optional creator context notes",
  "guardrails": ["nsfw_18", "personal_data", "medical"]
}
```

### POST `/api/app-1/reply` — Response

```json
{
  "reply": "omg YES that's from Zara ...",
  "confidence": 82,
  "retrievedContext": [
    { "doc_type": "transcript_chunk", "text": "...", "label": "Video transcript" },
    { "doc_type": "past_reply", "comment": "...", "reply": "...", "score": 87 }
  ],
  "personaId": "fashion-creator-1",
  "personaName": "Mia Styles"
}
```

## Confidence Score

- Derived from Pinecone top-1 similarity score × 100
- Range: 0–100
- Lower score = fewer grounding matches = more hallucination risk

## Pinecone Schema

- **Index:** shared `raas-index` (reused from RaaS)
- **Namespace:** `creator-twin-{personaId}` (one per persona)
- **Vector records:** `{ id, values: embedding, metadata: { comment, reply } }`

## Guardrails

Configurable via `guardrails[]` array in the request. Active guardrails are injected as policy lines into the system prompt. Available keys:

`nsw`, `sexual_violence`, `graphic_violence`, `hate_harassment`, `self_harm`, `personal_data`, `illegal`, `medical`, `financial`, `nsfw_18`, `competitor_mentions`

## Key Files

| File | Purpose |
|------|---------|
| `server/routes/app-1.js` | Route definitions |
| `server/controllers/app-1/index.js` | `listPersonas()`, `generateReply()` — core pipeline |
| `server/controllers/app-1/personas.js` | Static persona definitions (PERSONAS array) |
| `server/controllers/app-1/seed.js` | Seeds past replies into Pinecone (run once: `node server/controllers/app-1/seed.js`) |
| `server/lib/raas/embeddings.js` | `embedOne(text)` — shared OpenAI embeddings |
| `server/lib/raas/pinecone.js` | `query(namespace, vector, topK)` — shared Pinecone client |
| `server/lib/app1/openai.js` | `complete(system, user, maxTokens)` — GPT completion |
| `client/src/apps/app-1-creator-twin/` | Frontend UI |

## Setup Requirements

- `OPENAI_API_KEY` env var
- `PINECONE_API_KEY` + `PINECONE_INDEX` env vars
- Run seed: `node server/controllers/app-1/seed.js`
