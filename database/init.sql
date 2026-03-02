-- Portfolio Apps metadata table
CREATE TABLE IF NOT EXISTS portfolio_apps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  summary    TEXT    NOT NULL,
  image_url  TEXT,
  route      TEXT    NOT NULL UNIQUE,
  tags       TEXT    NOT NULL DEFAULT '[]',   -- stored as JSON array string
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,       -- boolean: 1 = visible
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Seed data
INSERT OR IGNORE INTO portfolio_apps (title, summary, image_url, route, tags, sort_order)
VALUES
  (
    'EngageAI',
    'RAG-powered TikTok comment responder: select a creator persona, submit a comment, and watch the AI generate a reply grounded in the creator''s actual voice — with full retrieval context.',
    NULL,
    '/apps/creator-twin',
    '["RAG","Pinecone","GPT-4o-mini","React"]',
    1
  ),
  (
    'AI Chatbot',
    'Conversational AI assistant with context memory, tool use, and a streaming UI — demonstrating end-to-end LLM product integration.',
    NULL,
    '/apps/app-2',
    '["React","Claude API","Express","WebSockets"]',
    2
  ),
  (
    'RAG as a Service',
    'Multi-tenant knowledge base platform: connect a Google Drive folder, auto-ingest documents into Pinecone, manage system prompts, and run grounded research queries with full source citations.',
    NULL,
    '/apps/raas',
    '["Pinecone","Claude Haiku","OpenAI Embeddings","Google Drive","Postgres"]',
    3
  );
