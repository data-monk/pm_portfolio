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
    'Sentiment Analyzer',
    'Real-time NLP tool that classifies customer feedback as positive, negative, or neutral — helping teams prioritize responses at scale.',
    NULL,
    '/apps/app-1',
    '["React","OpenAI API","Node.js","SQL"]',
    1
  ),
  (
    'AI Chatbot',
    'Conversational AI assistant with context memory, tool use, and a streaming UI — demonstrating end-to-end LLM product integration.',
    NULL,
    '/apps/app-2',
    '["React","Claude API","Express","WebSockets"]',
    2
  );
