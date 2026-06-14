# Security Audit — PM Portfolio Monorepo

**Audited:** 2026-06-13  
**Last updated:** 2026-06-13  
**Status:** In progress — 7/14 tasks complete (all 🔴 CRITICAL resolved)

Each task below is self-contained and ordered by priority. Work through them one at a time.

---

## Task Index

| # | Severity | Task | Status |
|---|---|---|---|
| 1 | 🔴 CRITICAL | Rotate OpenAI + Pinecone API keys | [x] |
| 2 | 🔴 CRITICAL | Rotate JWT_SECRET + ENCRYPTION_KEY | [x] |
| 3 | 🔴 CRITICAL | Create `.dockerignore` (prevent keys baking into image) | [x] |
| 4 | 🔴 CRITICAL | Fix wrong `CLIENT_ORIGIN` in docker-compose.yml | [x] |
| 5 | 🟠 HIGH | Add rate limiting (express-rate-limit) | [x] |
| 6 | 🟠 HIGH | Add auth middleware to App-1 routes | N/A — public demo, rate limiting sufficient |
| 7 | 🟠 HIGH | Strip internal error messages from 500 responses | [ ] |
| 8 | 🟠 HIGH | Change weak seed credentials (admin123 / user123) | [ ] |
| 9 | 🟠 HIGH | Add Helmet.js + Nginx security headers | [ ] |
| 10 | 🟡 MEDIUM | Fix OAuth callback CSRF (nonce validation) | [ ] |
| 11 | 🟡 MEDIUM | Validate `topK` param + cap body field lengths | [ ] |
| 12 | 🟡 MEDIUM | Shorten JWT TTL from 7d to 8h | [ ] |
| 13 | 🟡 MEDIUM | Inject secrets via CI/CD instead of manual VPS file | [x] |
| 14 | 🟢 LOW | Delete `server/test-embed.js` dev artifact | [ ] |

---

## Task 1 — Rotate OpenAI + Pinecone API Keys

**Severity:** CRITICAL  
**Why:** The live `.env` file was read during the audit session. Both keys are now exposed and must be rotated before any other fix.

**Steps:**
1. **OpenAI:** Go to https://platform.openai.com → API Keys → Delete `sk-proj-1monr7...` → Create new key → Update `server/.env`
2. **Pinecone:** Go to https://app.pinecone.io → API Keys → Delete `pcsk_2nBL8Z...` → Create new key → Update `server/.env`
3. Update the corresponding secrets on the VPS at `/opt/pm_portfolio/server/.env`

**Files changed:** `server/.env` (local) + VPS `/opt/pm_portfolio/server/.env`

---

## Task 2 — Rotate JWT_SECRET + ENCRYPTION_KEY

**Severity:** CRITICAL  
**Why:** Both were read during the audit. JWT_SECRET compromise allows forging auth tokens. ENCRYPTION_KEY compromise decrypts stored Google OAuth tokens.

**⚠️ Warning:** Rotating `ENCRYPTION_KEY` invalidates all encrypted Google Drive OAuth tokens in the database. After rotating, every tenant must re-authorize Google Drive.

**Steps:**
1. Generate new JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Generate new ENCRYPTION_KEY (same command — must be exactly 64 hex chars / 32 bytes)
3. Update both in `server/.env`
4. Update both on the VPS at `/opt/pm_portfolio/server/.env`
5. Restart the server (`docker compose restart server` on VPS)
6. Re-authorize Google Drive in the RaaS admin panel (all stored tokens are now invalid)

**Files changed:** `server/.env` (local) + VPS env file

---

## Task 3 — Create `.dockerignore` Files

**Severity:** CRITICAL  
**Why:** No `.dockerignore` exists. The server Dockerfile does `COPY server/ .`, which copies `server/.env` into the Docker image layer. Anyone who does a local `docker compose up --build` bakes live secrets into the image.

**Fix — create `server/.dockerignore`:**
```
.env
.env.*
*.db
*.db-shm
*.db-wal
node_modules
test-*.js
```

**Fix — create root `.dockerignore`** (build context for server Dockerfile is `.`):
```
server/.env
server/.env.*
server/node_modules
client/node_modules
client/dist
.git
```

**Files to create:**
- `server/.dockerignore` (new)
- `.dockerignore` at monorepo root (new)

---

## Task 4 — Fix Wrong CLIENT_ORIGIN in docker-compose.yml

**Severity:** CRITICAL  
**Why:** `docker-compose.yml` line 27 sets `CLIENT_ORIGIN: http://localhost`. The server uses this as the CORS allowed origin. In production this means CORS allows `http://localhost`, which provides no meaningful cross-origin protection.

**Fix in `docker-compose.yml`:**
```yaml
# Before:
CLIENT_ORIGIN: http://localhost

# After:
CLIENT_ORIGIN: https://prasunanand.com
```

**File:** `docker-compose.yml:27`

---

## Task 5 — Add Rate Limiting

**Severity:** HIGH  
**Why:** No rate limiting exists anywhere. `POST /api/raas/auth/login` is open to brute-force. `POST /api/app-1/reply` calls OpenAI + Pinecone on every hit — a bot could drain the API budget in minutes.

**Steps:**
1. Install the package:
   ```bash
   cd server && npm install express-rate-limit
   ```
2. Add to `server/server.js` before route registration:
   ```js
   const rateLimit = require('express-rate-limit')

   // Auth brute-force protection
   app.use('/api/raas/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true }))

   // LLM endpoint cost protection
   app.use('/api/app-1/reply', rateLimit({ windowMs: 60_000, max: 15 }))
   app.use('/api/raas/research/query', rateLimit({ windowMs: 60_000, max: 20 }))
   ```

**Files changed:** `server/server.js`, `server/package.json`

---

## Task 6 — Add Auth Middleware to App-1 Routes

**Severity:** HIGH  
**Why:** `GET /api/app-1/personas` and `POST /api/app-1/reply` are public with no authentication. The reply endpoint calls OpenAI embeddings + Pinecone — any anonymous user can trigger paid API calls.

**Fix in `server/routes/app-1.js`:**
```js
'use strict'
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/raas-auth')
const { listPersonas, generateReply } = require('../controllers/app-1/index')

router.get('/personas', authenticate, listPersonas)
router.post('/reply', authenticate, generateReply)

module.exports = router
```

**Note:** If you want the demo accessible without login, use rate limiting (Task 5) instead of auth, or add a separate read-only demo token.

**Files changed:** `server/routes/app-1.js`

---

## Task 7 — Strip Internal Error Messages from 500 Responses

**Severity:** HIGH  
**Why:** Multiple controllers return `err.message` directly to the client in 500 responses. This leaks internal database errors, table names, connection strings, and stack details.

**Affected locations:**
- `server/controllers/raas/research.js:134` — `res.status(500).json({ error: err.message })`
- `server/controllers/raas/admin-prompts.js:19, 59, 83, 137, 154, 183`
- `server/controllers/raas/admin-drive.js:60`
- `server/controllers/raas/auth.js` (already returns generic message — OK)
- `server/controllers/app-1/index.js:158` — `detail: err.message`

**Pattern to apply everywhere:**
```js
// Before:
return res.status(500).json({ error: err.message })

// After:
console.error('[controller-name] error:', err.message)
return res.status(500).json({ error: 'Internal server error' })
```

For `app-1/index.js:158`, also remove the `detail` field:
```js
// Before:
res.status(500).json({ error: 'Failed to generate reply', detail: err.message })

// After:
console.error('[app-1/generateReply] error:', err.message)
res.status(500).json({ error: 'Failed to generate reply' })
```

**Files changed:** `server/controllers/raas/research.js`, `server/controllers/raas/admin-prompts.js`, `server/controllers/raas/admin-drive.js`, `server/controllers/app-1/index.js`

---

## Task 8 — Remove / Harden Weak Seed Credentials

**Severity:** HIGH  
**Why:** `database/raas-schema.sql` seeds `admin@demo.com`/`admin123` and `user@demo.com`/`user123` into every fresh Postgres instance. These passwords are printed in a comment in the schema file and are trivially guessable.

**Steps:**
1. Remove the plaintext password comments from `raas-schema.sql`:
   ```sql
   -- Before:
   -- Admin user (password: admin123 — bcrypt hash)

   -- After: remove the comment entirely
   ```
2. For production: either skip the seed users (delete the INSERT blocks) or generate strong passwords at first deploy and store only the bcrypt hash in the seed.
3. If the demo app needs login, document the credentials separately (in a private note or password manager), not in the schema file.

**File:** `database/raas-schema.sql:120-138`

---

## Task 9 — Add Helmet.js + Nginx Security Headers

**Severity:** HIGH  
**Why:** No security HTTP headers are set. Missing: `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), `Referrer-Policy`, `Content-Security-Policy`.

**Step 1 — Install Helmet:**
```bash
cd server && npm install helmet
```

**Step 2 — Add to `server/server.js`** (first middleware, before cors):
```js
const helmet = require('helmet')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }))
```

**Step 3 — Add to `client/nginx.conf`** inside the `server {}` block:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-XSS-Protection "1; mode=block" always;
```

**Files changed:** `server/server.js`, `server/package.json`, `client/nginx.conf`

---

## Task 10 — Fix OAuth Callback CSRF (Nonce Validation)

**Severity:** MEDIUM  
**Why:** `GET /api/raas/admin/drive/callback` (`admin-drive.js:28`) reads `tenantId` from the untrusted `state` query param without verifying it against a stored nonce. An attacker can craft a callback URL with an arbitrary `state=victim_tenant_id` and associate stolen OAuth tokens with any tenant.

**How to fix:**

In `admin-drive.js → connect()`:
```js
const crypto = require('crypto')

async function connect(req, res) {
  const tenantId = req.user.tenantId
  const nonce = crypto.randomBytes(16).toString('hex')
  // Store nonce in DB (or a short-lived in-memory map) keyed to tenantId, expires in 10 min
  await db.query(
    `UPDATE drive_connections SET oauth_nonce = $1, oauth_nonce_exp = NOW() + INTERVAL '10 minutes'
     WHERE tenant_id = $2`,
    [nonce, tenantId]
  )
  // Or INSERT if no row exists yet
  const authUrl = driveLib.getAuthUrl(`${tenantId}:${nonce}`)
  return res.json({ authUrl })
}
```

In `admin-drive.js → callback()`:
```js
async function callback(req, res) {
  const { code, error, state } = req.query
  if (error) return res.status(400).json({ error })
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })

  const [tenantId, nonce] = state.split(':')
  // Validate nonce against stored value
  const nonceRes = await db.query(
    `SELECT oauth_nonce FROM drive_connections
     WHERE tenant_id = $1 AND oauth_nonce = $2 AND oauth_nonce_exp > NOW()`,
    [tenantId, nonce]
  )
  if (nonceRes.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired state' })

  // Clear the nonce immediately (one-time use)
  await db.query(`UPDATE drive_connections SET oauth_nonce = NULL WHERE tenant_id = $1`, [tenantId])

  // ... rest of token exchange as before
}
```

**Note:** The `drive_connections` table needs two new columns: `oauth_nonce TEXT` and `oauth_nonce_exp TIMESTAMPTZ`. Add a migration.

**Files changed:** `server/controllers/raas/admin-drive.js`, `database/raas-schema.sql` (migration)

---

## Task 11 — Validate `topK` + Cap Body Field Lengths

**Severity:** MEDIUM  
**Why:** `topK` in research queries has no upper bound — a user can set `topK: 100000` causing excessive API usage. `transcript` and `notes` in app-1 have no length limit, allowing huge payloads to be sent directly to OpenAI.

**Fix in `server/controllers/raas/research.js`:**
```js
// Before:
const { query, promptId, topK = 8 } = req.body

// After:
const rawTopK = parseInt(req.body.topK, 10)
const topK = Number.isFinite(rawTopK) ? Math.min(Math.max(rawTopK, 1), 20) : 8
```

**Fix in `server/controllers/app-1/index.js`** (after destructuring body):
```js
if (transcript && transcript.length > 5000) {
  return res.status(400).json({ error: 'transcript exceeds 5000 character limit' })
}
if (notes && notes.length > 2000) {
  return res.status(400).json({ error: 'notes exceeds 2000 character limit' })
}
if (comment.trim().length > 1000) {
  return res.status(400).json({ error: 'comment exceeds 1000 character limit' })
}
```

**Files changed:** `server/controllers/raas/research.js`, `server/controllers/app-1/index.js`

---

## Task 12 — Shorten JWT TTL from 7 Days to 8 Hours

**Severity:** MEDIUM  
**Why:** Tokens are valid for 7 days. If a token is stolen (XSS, logging, network interception), it stays valid for up to a week with no way to invalidate it.

**Fix in `server/lib/raas/jwt.js`:**
```js
// Before:
function sign(payload, expiresIn = '7d') {

// After:
function sign(payload, expiresIn = '8h') {
```

**Note:** Logged-in users will need to re-login after 8 hours. If that's too aggressive for your use case, `24h` is a reasonable middle ground.

**File:** `server/lib/raas/jwt.js:9`

---

## Task 13 — Inject Secrets via CI/CD Instead of Manual VPS File

**Severity:** MEDIUM  
**Why:** Production secrets live in a manually created file at `/opt/pm_portfolio/server/.env` on the VPS. There's no record of what values are there, no rotation process, and no way to audit changes. If the VPS is re-provisioned, secrets are lost.

**Fix:** Store all secrets in GitHub Secrets and write the `.env` during deployment.

**Add to `.github/workflows/deploy.yaml`** (after checkout, before docker compose):
```yaml
- name: Write production .env
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      mkdir -p /opt/pm_portfolio/server
      cat > /opt/pm_portfolio/server/.env << 'EOF'
      PORT=5000
      CLIENT_ORIGIN=https://prasunanand.com
      DB_PATH=/data/portfolio.db
      POSTGRES_URL=postgresql://raas_user:${{ secrets.POSTGRES_PASSWORD }}@postgres:5432/raas
      POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}
      JWT_SECRET=${{ secrets.JWT_SECRET }}
      GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
      GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
      GOOGLE_REDIRECT_URI=https://prasunanand.com/api/raas/admin/drive/callback
      PINECONE_API_KEY=${{ secrets.PINECONE_API_KEY }}
      PINECONE_INDEX=raas-index
      ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}
      OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
      ENCRYPTION_KEY=${{ secrets.ENCRYPTION_KEY }}
      EOF
```

**GitHub Secrets to add:** `POSTGRES_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PINECONE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`

**File:** `.github/workflows/deploy.yaml`

---

## Task 14 — Delete `server/test-embed.js`

**Severity:** LOW  
**Why:** Development testing artifact. Gets deployed to production and adds unnecessary surface area.

**Fix:**
```bash
rm server/test-embed.js
```

**File:** `server/test-embed.js`

---

## What Was Already Good (No Action Needed)

- **No SQL injection** — all DB queries use parameterized `$1` placeholders
- **bcrypt for passwords** — correctly using bcryptjs
- **AES-256-GCM for token encryption** — correct algorithm, random IV per operation
- **Tenant isolation** — all RaaS queries scope by `tenantId` from JWT, not request body
- **RBAC** — `requireAdmin` middleware correctly guards all admin routes
- **No secrets in git history** — `.env` was never committed
- **No secrets in client bundles** — confirmed clean after checking compiled assets
