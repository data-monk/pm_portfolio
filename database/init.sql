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

-- Ensure AI Chatbot placeholder is deactivated if it exists from an old seed
UPDATE portfolio_apps SET active=0 WHERE route='/apps/app-2';

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
    'Violet Crumbs',
    'Mobile-first food-sharing app for NYU Stern: discover free food from campus events in real time, filter by dietary preferences, post excess catering, and track campus-wide food waste impact.',
    NULL,
    '/apps/violet-crumbs',
    '["React","TypeScript","shadcn/ui","Framer Motion","Tailwind CSS"]',
    2
  ),
  (
    'RAG as a Service',
    'Multi-tenant knowledge base platform: connect a Google Drive folder, auto-ingest documents into Pinecone, manage system prompts, and run grounded research queries with full source citations.',
    NULL,
    '/apps/raas',
    '["Pinecone","Claude Haiku","OpenAI Embeddings","Google Drive","Postgres"]',
    3
  ),
  (
    'CommuteFirst',
    'Real estate aggregator ranked by commute time: scrapes Zillow, StreetEasy, and Apartments.com, then enriches every listing with Google Maps peak-hour transit, driving, walking, and biking times so you find the apartment that actually fits your life.',
    NULL,
    '/apps/commute-search',
    '["Google Maps API","Python/FastAPI","PostgreSQL/PostGIS","Playwright","Redis","React"]',
    4
  );
