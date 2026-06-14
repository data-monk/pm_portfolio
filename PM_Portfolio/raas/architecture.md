# RAG as a Service (RaaS) — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (within portfolio monorepo) |
| Backend | Node.js + Express |
| Auth | JWT (custom, `server/lib/raas/jwt.js`) |
| Database | Postgres (Docker container, `raas-schema.sql`) |
| Vector DB | Pinecone (namespace per tenant) |
| Embeddings | OpenAI `text-embedding-3-small` (`server/lib/raas/embeddings.js`) |
| LLM | Claude Haiku (`server/lib/raas/llm.js`) |
| Drive | Google Drive API OAuth (`server/lib/raas/drive.js`) |
| Encryption | App-level AES encryption for OAuth tokens (`server/lib/raas/encryption.js`) |
| Ingestion | In-process async queue (`server/lib/raas/ingestion/worker.js`) |

## Postgres Data Model

Schema auto-applied via Docker (`database/raas-schema.sql`):

```
tenants          id, name, created_at
users            id, tenant_id, email, password_hash, role (ADMIN|USER), created_at
drive_connections id, tenant_id, folder_id, folder_name, access_token_enc,
                  refresh_token_enc, token_expiry, status, last_sync_at
documents        id, tenant_id, drive_file_id, name, mime_type, web_view_link,
                  content_hash, status (PENDING|INGESTING|READY|ERROR), error_message
chunks           id, tenant_id, document_id, chunk_index, text, token_count, vector_id
system_prompts   id, tenant_id, name, description, is_default, created_at
prompt_versions  id, system_prompt_id, version, content, is_active, created_by_user_id
```

## Ingestion Pipeline

```
Admin triggers sync (or polling interval)
        │
        ▼
drive.listFiles(folderId)          ──→  Google Drive API
        │
        ▼
For each file: compare content_hash
  unchanged? → skip
  changed/new? → queue ingestion job
        │
        ▼
worker.ingest(documentId)
  parser.parse(file)               ──→  plaintext extraction
  chunker.chunk(text)              ──→  ~800–1200 token chunks, ~100–200 overlap
  embeddings.embedBatch(chunks)    ──→  OpenAI Embeddings API
  pinecone.upsert(namespace, vectors)
  pgdb.setDocumentStatus('READY')
```

Supported MIME types: Google Docs, PDF, DOCX, TXT/MD

## RAG Query Flow

```
User query (+ selected promptId)
        │
        ▼
embeddings.embedOne(query)         ──→  OpenAI Embeddings API
        │
        ▼
pinecone.query(tenantId, vector, topK=8)
        │
        ▼
Construct LLM messages:
  system: system_prompt content
  context: retrieved chunks with [Source: DocName | Chunk: i | Link: ...]
  user: original query
        │
        ▼
llm.complete(messages)             ──→  Claude Haiku
        │
        ▼
Return: { answer, sources: [{ docName, webViewLink, chunkIndex, snippet }] }
```

## API Endpoints

All routes mounted at `/api/raas/` in `server/routes/raas.js`:

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/raas/auth/login` | None | Returns JWT |
| `GET` | `/api/raas/auth/me` | JWT | Current user info |

### Admin: Drive
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/raas/admin/drive/connect` | Admin | Start OAuth flow |
| `GET` | `/api/raas/admin/drive/callback` | None | OAuth redirect handler |
| `PUT` | `/api/raas/admin/drive/folder` | Admin | Set/update folder |
| `GET` | `/api/raas/admin/drive/status` | Admin | Folder + connection status |
| `POST` | `/api/raas/admin/drive/sync` | Admin | Trigger manual ingestion |
| `GET` | `/api/raas/admin/drive/documents` | Admin | List documents + statuses |

### Admin: Prompts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/raas/admin/prompts` | Admin | List all prompts |
| `POST` | `/api/raas/admin/prompts` | Admin | Create prompt |
| `GET` | `/api/raas/admin/prompts/:id` | Admin | Get prompt + versions |
| `PUT` | `/api/raas/admin/prompts/:id` | Admin | Update (creates new version) |
| `DELETE` | `/api/raas/admin/prompts/:id` | Admin | Delete prompt |
| `POST` | `/api/raas/admin/prompts/:id/set-default` | Admin | Set default prompt |

### User: Research
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/raas/prompts` | JWT | List available prompts |
| `POST` | `/api/raas/research/query` | JWT | Run RAG query |

## Pinecone Schema

- **Index:** `raas-index` (shared, configured via `PINECONE_INDEX` env var)
- **Namespace:** `tenantId` (strict per-tenant isolation)
- **Vector ID format:** `{tenantId}:{documentId}:{chunkId}`
- **Metadata per vector:** `tenantId`, `documentId`, `driveFileId`, `docName`, `chunkIndex`, `textPreview`, `webViewLink`, `mimeType`

## Key Files

| File | Purpose |
|------|---------|
| `server/routes/raas.js` | All `/api/raas/*` routes |
| `server/middleware/raas-auth.js` | JWT verify + RBAC (`authenticate`, `requireAdmin`) |
| `server/controllers/raas/auth.js` | Login, /me |
| `server/controllers/raas/admin-drive.js` | Drive OAuth, sync, document listing |
| `server/controllers/raas/admin-prompts.js` | Prompt CRUD + versioning |
| `server/controllers/raas/research.js` | RAG query endpoint |
| `server/lib/raas/pgdb.js` | Postgres client (pg pool) |
| `server/lib/raas/jwt.js` | Sign/verify JWT |
| `server/lib/raas/encryption.js` | AES encrypt/decrypt OAuth tokens |
| `server/lib/raas/llm.js` | Claude Haiku completion |
| `server/lib/raas/embeddings.js` | OpenAI embeddings (`embedOne`, `embedBatch`) |
| `server/lib/raas/pinecone.js` | Pinecone upsert/query |
| `server/lib/raas/drive.js` | Google Drive API wrapper |
| `server/lib/raas/ingestion/worker.js` | In-process ingestion queue |
| `server/lib/raas/ingestion/parser.js` | File-to-text extraction |
| `server/lib/raas/ingestion/chunker.js` | Text chunking logic |
| `database/raas-schema.sql` | Postgres schema (auto-applied by Docker) |
| `client/src/apps/app-3-raas/` | Full RaaS frontend |

## Setup Requirements

```
DATABASE_URL          Postgres connection string
JWT_SECRET            JWT signing secret
GOOGLE_CLIENT_ID      OAuth app client ID
GOOGLE_CLIENT_SECRET  OAuth app client secret
GOOGLE_REDIRECT_URI   OAuth callback URL
PINECONE_API_KEY      Pinecone API key
PINECONE_INDEX        Pinecone index name (e.g. raas-index)
OPENAI_API_KEY        For embeddings
ANTHROPIC_API_KEY     For Claude Haiku LLM
ENCRYPTION_KEY        AES key for token encryption
```
