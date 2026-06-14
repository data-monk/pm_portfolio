# RAG as a Service (RaaS) — Product Specs

## One-Liner

A multi-tenant "RAG as a Service" web app that lets a company connect a Google Drive folder as an institutional knowledge source, automatically ingest and vectorize its contents into Pinecone, maintain a repository of reusable system prompts, and allow end-users to run research queries grounded in the company's own documents.

## Problem

Enterprise teams struggle to surface institutional knowledge efficiently:

- Knowledge scattered across Google Drive, Confluence, email
- Search tools return documents, not answers
- New employees can't find tribal knowledge fast
- Existing chatbots hallucinate without grounding

## Solution

RaaS provides:
1. **Drive Ingestion** — connect a Google Drive folder; files are auto-parsed, chunked, embedded, and stored in Pinecone
2. **Prompt Repository** — Admin manages versioned system prompts (e.g., "HR Assistant", "Engineering Support")
3. **Research Query** — Users submit a question; system retrieves relevant chunks + selected prompt → sends to LLM → returns answer + citations

## RBAC Model

| Role | Capabilities |
|------|-------------|
| **Admin** | Connect Drive folder, trigger sync, view ingestion status, create/edit/delete system prompts, set default prompt |
| **User** | Run research queries, select system prompt, view answers + citations |

Auth: JWT-based (email + password). Tenant-scoped: all data isolated per tenant.

## Core Features

### Drive Connector
- Admin OAuth consent (read-only Drive scope)
- Supported formats: Google Docs, PDF, DOCX, TXT/MD
- Change detection: content hash comparison (polling-based)
- Status: `CONNECTED | ERROR | DISCONNECTED`

### Ingestion Pipeline
1. Discover files in folder
2. Fetch/export to plaintext
3. Normalize (whitespace cleanup)
4. Chunk (~800–1200 tokens, ~100–200 token overlap)
5. Embed via OpenAI
6. Upsert vectors to Pinecone (namespace = tenantId)
7. Persist document status to Postgres

### Prompt Repository
- CRUD for system prompts by Admin
- Versioning: every edit creates a new `SystemPromptVersion`; one active version at a time
- Default prompt per tenant
- Seed prompts: "Research Assistant", "Engineering Support"

### Research Query (RAG Flow)
1. User selects prompt + enters query
2. Backend embeds query (same model as corpus)
3. Pinecone similarity search (topK=8, within tenant namespace)
4. Construct LLM request: system prompt + retrieved context chunks + user query
5. Call LLM (Claude Haiku in production)
6. Return: answer + source citations (docName, webViewLink, chunkIndex, snippet)

## Acceptance Criteria

### Admin
- Can connect a Google Drive folder successfully
- Can trigger sync and see ingestion progress (doc count, errors, last sync time)
- Can create/edit/delete system prompts with versioning
- Can set a default system prompt

### Ingestion
- New/updated docs are ingested within polling interval or manual sync
- Vectors exist in Pinecone, tenant-isolated by namespace
- Removed docs are removed from the vector index

### User Research
- User can submit a query and get a response
- Response uses retrieved context when available
- Response includes source citations with document names and links
- Admin endpoints are blocked for USER role

## Non-Goals (MVP)

- Confluence/Jira connectors (designed for extension, not implemented)
- Drive file-level ACL syncing
- Full analytics / evaluation harness
- Multi-region / enterprise SSO
