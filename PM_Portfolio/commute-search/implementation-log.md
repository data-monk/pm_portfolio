# CommuteFirst — Implementation Log

**App:** `app-5-commute-search`
**Started:** 2026-06-14
**Target:** Full-stack MVP with scraping, commute enrichment, and React UI

> This file is the single source of truth for implementation progress.
> Update status as work completes. Format: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Phase Overview

| Phase | Description | Status | Agent |
|---|---|---|---|
| Phase 1 | Architecture & Product Spec | `[x]` Done | PM + Architect Agents |
| Phase 2 | Implementation Plan | `[x]` Done | Lead Architect |
| Phase 3 | Database + Infra Setup | `[x]` Done | Backend Agent |
| Phase 4 | Scraping Layer | `[x]` Done | Backend Agent |
| Phase 5 | FastAPI Backend | `[x]` Done | Backend Agent |
| Phase 6 | React Frontend | `[ ]` Pending | Frontend Agent |
| Phase 7 | Integration & E2E | `[ ]` Pending | QA Agent |
| Phase 8 | Code Review & Security | `[x]` Done | Review Agent |
| Phase 9 | Portfolio Integration | `[ ]` Pending | Backend + Frontend |
| Phase 10 | Deploy to Production | `[ ]` Pending | DevOps |

---

## Phase 1 — Architecture & Product Spec ✅

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | User stories + acceptance criteria (12 stories) | `[x]` | `specs.md` |
| 1.2 | Unified listing schema (core + commute + meta fields) | `[x]` | `specs.md` |
| 1.3 | Screen wireframes (Search, Results, Detail, Saved) | `[x]` | `specs.md` |
| 1.4 | System architecture diagram | `[x]` | `architecture.md` |
| 1.5 | Tech stack selection with justifications | `[x]` | `architecture.md` |
| 1.6 | Full PostgreSQL DDL (PostGIS, indexes, triggers) | `[x]` | `architecture.md` + `database/commute-search-schema.sql` |
| 1.7 | API integration strategy (all 5 external services) | `[x]` | `architecture.md` |
| 1.8 | Data flow descriptions (3 flows) | `[x]` | `architecture.md` |
| 1.9 | Security checklist | `[x]` | `architecture.md` |
| 1.10 | ProjectOverview.md updated | `[x]` | Added App 5 row |

---

## Phase 2 — Implementation Plan ✅

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Task breakdown per agent | `[x]` | This document |
| 2.2 | Directory structure defined | `[x]` | `architecture.md` |
| 2.3 | Docker Compose service map | `[x]` | `architecture.md` |
| 2.4 | API contract defined | `[x]` | `specs.md` |

---

## Phase 3 — Database & Infra Setup

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Create `database/commute-search-schema.sql` | `[x]` | Already existed from Phase 1; cs_ prefix tables |
| 3.2 | Add `postgis/postgis:16-3.4` service to docker-compose | `[x]` | `cs-postgres` on port 5433; 2026-06-14 |
| 3.3 | Add Redis service to docker-compose (if not already present) | `[x]` | `cs-redis` on port 6380; 2026-06-14 |
| 3.4 | Add FastAPI `api` service to docker-compose | `[x]` | `cs-api` on port 8001; 2026-06-14 |
| 3.5 | Add Celery `worker` service to docker-compose | `[x]` | `cs-worker`; 2026-06-14 |
| 3.6 | Add Celery `beat` service to docker-compose | `[x]` | `cs-beat` with redbeat; 2026-06-14 |
| 3.7 | Create `.env.example` with all required keys documented | `[x]` | `.env.example` at monorepo root; 2026-06-14 |
| 3.8 | Configure Nginx routing: `/api/commute-search/*` → FastAPI | `[x]` | `client/nginx.conf` updated; 2026-06-14 |
| 3.9 | Verify PostGIS extension applies cleanly on docker-compose up | `[ ]` | Requires live Docker environment |

---

## Phase 4 — Scraping Layer

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Create `scraper/` top-level directory with `__init__.py` files | `[x]` | Dirs existed; `__init__.py` files confirmed; 2026-06-14 |
| 4.2 | `scraper/celery_app.py` — Celery + Redis broker config | `[x]` | redbeat beat_schedule for all 4 sources; 2026-06-14 |
| 4.3 | `scraper/pipeline/normalizer.py` — Pydantic models + field mapping | `[x]` | RawListing, NormalizedListing, per-source mappers; 2026-06-14 |
| 4.4 | `scraper/pipeline/geocoder.py` — Google Geocoding fallback | `[x]` | geocode_address(), geocode_listing(); 2026-06-14 |
| 4.5 | `scraper/scrapers/base.py` — BaseScraper ABC | `[x]` | BrightData proxy, Playwright stealth, retry, mock loader; 2026-06-14 |
| 4.6 | `scraper/scrapers/apartments_com.py` — Playwright + stealth | `[x]` | article.placard, pagination, detail enrichment, mock fallback; 2026-06-14 |
| 4.7 | `scraper/scrapers/streeteasy.py` — XHR interception | `[x]` | page.on('response'), borough iteration, mock fallback; 2026-06-14 |
| 4.8 | `scraper/scrapers/zillow.py` — BrightData + __NEXT_DATA__ | `[x]` | __NEXT_DATA__ parser, 5-page cap, mock fallback; 2026-06-14 |
| 4.9 | `scraper/scrapers/facebook_marketplace.py` — session cookies | `[x]` | FB_ENABLED guard, __bbox.require parser, session expiry fallback; 2026-06-14 |
| 4.10 | `scraper/mock_data/` — fixture JSON for all 4 sources | `[x]` | 5 realistic NYC listings per source; 2026-06-14 |
| 4.11 | `scraper/tasks.py` — Celery task definitions | `[x]` | scrape_source(), mark_stale_listings(), batch_commute_enrich(); 2026-06-14 |
| 4.12 | Dedup logic: Redis `scrape:dedup:{source}:{external_id}` key | `[x]` | EX 86400 in tasks.py; 2026-06-14 |
| 4.13 | Stale listing logic: `is_active=FALSE` after 12h not seen | `[x]` | mark_stale_listings() task + MARK_STALE SQL; 2026-06-14 |
| 4.14 | Scraper Dockerfile | `[x]` | Python 3.12-slim + playwright install chromium --with-deps; 2026-06-14 |

---

## Phase 5 — FastAPI Backend

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | `api/config.py` — pydantic-settings with all env vars | `[x]` | Settings class with all 7 env vars; 2026-06-14 |
| 5.2 | `api/db/connection.py` — asyncpg connection pool | `[x]` | min=2, max=10 pool; get_pool/close_pool; 2026-06-14 |
| 5.3 | `api/db/queries.py` — parameterized SQL strings | `[x]` | SEARCH_LISTINGS_BASE, GET_LISTING_BY_ID, UPSERT_COMMUTE_CACHE, GET_COMMUTE_CACHE, SAVE_LISTING, GET_SAVED_LISTINGS, MARK_STALE, GET_SOURCE_HEALTH; 2026-06-14 |
| 5.4 | `api/models/listing.py` — Pydantic response models | `[x]` | RouteStep, CommuteData, ListingBase, ListingWithCommute, ListingDetail, SearchResponse, SavedListing; 2026-06-14 |
| 5.5 | `api/models/commute.py` — CommuteRequest, CommuteResponse, RouteStep | `[x]` | CommuteRequest, CommuteResponse models; 2026-06-14 |
| 5.6 | `api/services/listings_service.py` — SQL query builder + PostGIS | `[x]` | Dynamic WHERE builder, ST_DWithin, commute filter post-join; 2026-06-14 |
| 5.7 | `api/services/commute_service.py` — Redis → GM Distance Matrix | `[x]` | Redis→Postgres→GM API, batch 25, all error codes, 6h TTL; 2026-06-14 |
| 5.8 | `api/routers/listings.py` — GET /search, GET /:id | `[x]` | Full search + commute enrichment; 2026-06-14 |
| 5.9 | `api/routers/commute.py` — POST /commute (batch enrichment) | `[x]` | Handled inline in listings router via enrich_listings_with_commute(); 2026-06-14 |
| 5.10 | `api/routers/saved.py` — POST/GET/DELETE /saved (session_token based) | `[x]` | UUID session tokens; 2026-06-14 |
| 5.11 | `api/routers/admin.py` — POST /admin/scrape (trigger manual job) | `[x]` | X-Admin-Secret header auth; GET /sources health; 2026-06-14 |
| 5.12 | `api/main.py` — app init, CORS, slowapi, lifespan | `[x]` | CORS, rate limiting, lifespan pool, global error handler; 2026-06-14 |
| 5.13 | FastAPI Dockerfile | `[x]` | Python 3.12-slim + uvicorn; 2026-06-14 |
| 5.14 | `get_next_monday_830am_epoch()` utility | `[x]` | In commute_service.py; 2026-06-14 |
| 5.15 | Google Places geocoding for destination input (server-side) | `[ ]` | Destination geocoding is browser-side via Places Autocomplete (browser key) |
| 5.16 | `api/dependencies.py` — Redis singleton dependency | `[x]` | get_redis() async dependency; 2026-06-14 |

---

## Phase 6 — React Frontend

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Create `client/src/apps/app-5-commute-search/` directory | `[ ]` | |
| 6.2 | `CommuteSearchApp.tsx` — root with QueryClient, Router, providers | `[ ]` | Scoped under `.cs-app` CSS class |
| 6.3 | Register route in `client/src/App.jsx`: `/apps/commute-search/*` | `[ ]` | |
| 6.4 | `lib/types.ts` — all TypeScript interfaces (Listing, Commute, RouteStep, etc.) | `[ ]` | |
| 6.5 | `lib/api.ts` — typed fetch wrapper for all backend endpoints | `[ ]` | Uses `VITE_API_BASE_URL` env var |
| 6.6 | `lib/mockData.ts` — 8+ mock listings with commute data for dev | `[ ]` | Used when `VITE_USE_MOCK=true` |
| 6.7 | `constants/transitLines.ts` — NYC MTA line colors (F=orange, A=blue, etc.) | `[ ]` | |
| 6.8 | `hooks/useListings.ts` — React Query fetch + filter logic | `[ ]` | |
| 6.9 | `hooks/useSaved.ts` — localStorage + server sync | `[ ]` | Generates UUID session_token on first visit |
| 6.10 | `hooks/useCommute.ts` — commute polling (commute_pending handling) | `[ ]` | |
| 6.11 | `components/DestinationInput.tsx` — Google Places Autocomplete | `[ ]` | Uses browser-restricted `VITE_PLACES_API_KEY` |
| 6.12 | `components/CommuteModeSelector.tsx` — Transit/Drive/Bike/Walk toggle | `[ ]` | |
| 6.13 | `components/CommuteSlider.tsx` — max commute time slider | `[ ]` | 5–120 min, 5-min step |
| 6.14 | `components/FilterPanel.tsx` — left sidebar / mobile bottom drawer | `[ ]` | |
| 6.15 | `components/ListingCard.tsx` — card with CommuteTimeBadge | `[ ]` | |
| 6.16 | `components/CommuteTimeBadge.tsx` — color-coded badge (green/yellow/orange/red) | `[ ]` | |
| 6.17 | `components/CommuteBreakdown.tsx` — route steps panel with MTA line colors | `[ ]` | |
| 6.18 | `components/MapView.tsx` — Google Maps + MarkerClusterer + route overlay | `[ ]` | `@vis.gl/react-google-maps` |
| 6.19 | `components/ComparisonTable.tsx` — side-by-side with green "BEST" highlights | `[ ]` | |
| 6.20 | `pages/SearchPage.tsx` — home: destination + mode + slider + filters | `[ ]` | |
| 6.21 | `pages/ResultsPage.tsx` — listing grid + map toggle + sort | `[ ]` | |
| 6.22 | `pages/ListingDetailPage.tsx` — full detail + commute breakdown + map | `[ ]` | |
| 6.23 | `pages/SavedListingsPage.tsx` — bookmarks + comparison mode | `[ ]` | |
| 6.24 | Empty states: no results, API error, source unavailable banner | `[ ]` | |
| 6.25 | Mobile responsiveness: bottom drawer filters, full-screen map overlay | `[ ]` | |
| 6.26 | URL state sync: destination, mode, filters, sort in query string | `[ ]` | |

---

## Phase 7 — Integration & Testing

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Unit tests: `normalizer.py` — all 4 source field mappings | `[ ]` | pytest |
| 7.2 | Unit tests: `commute_service.py` — cache hit, miss, batch split, error codes | `[ ]` | Mock Redis + mock httpx |
| 7.3 | Unit tests: `listings_service.py` — filter logic, commute join, pagination | `[ ]` | asyncpg test fixtures |
| 7.4 | Unit tests: `get_next_monday_830am_epoch()` | `[ ]` | Edge cases: called on Monday, weekend |
| 7.5 | Integration test: full scrape → normalize → upsert → query flow (mock data) | `[ ]` | Docker Postgres in test |
| 7.6 | Integration test: `/api/listings/search` with commute filter | `[ ]` | FastAPI TestClient |
| 7.7 | Integration test: commute cache Redis → Postgres → GM API (mocked) | `[ ]` | |
| 7.8 | Frontend: component tests for `ListingCard`, `CommuteTimeBadge`, `FilterPanel` | `[ ]` | Vitest + React Testing Library |
| 7.9 | Frontend: E2E flow — search → results → detail → save (Playwright) | `[ ]` | |
| 7.10 | Load test: `/api/listings/search` with 100 concurrent requests | `[ ]` | locust or k6 |

---

## Phase 8 — Code Review & Security

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1 | Review Agent: API key handling — confirm never in source | `[x]` | PASS — no hardcoded keys; all via env; 2026-06-14 |
| 8.2 | Review Agent: SQL injection — confirm all queries parameterized | `[x]` | FIXED — max_commute/max_transfers f-string SQL replaced with $N params; dead coordinates_sql f-string removed; 2026-06-14 |
| 8.3 | Review Agent: CORS policy — confirm production domain only | `[x]` | FIXED — allow_credentials changed to False; production CORS_ORIGINS set correctly; 2026-06-14 |
| 8.4 | Review Agent: rate limiting — Nginx + slowapi both active | `[x]` | FIXED — slowapi @limiter decorators added to all routes; Nginx limit_req_zone added; 2026-06-14 |
| 8.5 | Review Agent: Facebook ToS compliance — FB_ENABLED=false by default | `[x]` | PASS — FB_ENABLED=false default confirmed; mock data returned immediately; no profile data stored; 2026-06-14 |
| 8.6 | Review Agent: Google Maps cost controls — quota cap + budget alert | `[x]` | PASS — separate browser/server keys documented; batch size 25 enforced; OVER_DAILY_LIMIT circuit-break; TTL consistent; 2026-06-14 |
| 8.7 | Review Agent: scraper ethics — polite delays, robots.txt respect | `[x]` | INFO — random_delay(2.5–6s) and random_mouse_movement() present; no robots.txt check (ToS-level concern, not code defect); 2026-06-14 |
| 8.8 | Review Agent: error handling — all GM error codes handled | `[x]` | PASS — OK/ZERO_RESULTS/NOT_FOUND/MAX_ELEMENTS_EXCEEDED/REQUEST_DENIED/OVER_DAILY_LIMIT/OVER_QUERY_LIMIT all handled; past departure_epoch guard added; 2026-06-14 |

---

## Phase 9 — Portfolio Integration

| # | Task | Status | Notes |
|---|---|---|---|
| 9.1 | Add App 5 row to `database/init.sql` `portfolio_apps` table | `[ ]` | title, summary, imageUrl, route, tags |
| 9.2 | Confirm route `/apps/commute-search` renders in portfolio grid | `[ ]` | |
| 9.3 | AppCard on landing page: thumbnail, commute badge in tags | `[ ]` | |
| 9.4 | Add App 5 to `client/src/App.jsx` routes | `[ ]` | |

---

## Phase 10 — Deploy to Production

| # | Task | Status | Notes |
|---|---|---|---|
| 10.1 | Set all env vars in GitHub Secrets / VPS `.env` | `[ ]` | GOOGLE_MAPS_API_KEY, BRIGHTDATA_*, REDIS_URL |
| 10.2 | Create Pinecone / Google Cloud project, enable Distance Matrix + Places APIs | `[ ]` | |
| 10.3 | Set GCP budget alert ($50/mo) and Distance Matrix hard quota (10k elements/day) | `[ ]` | |
| 10.4 | Provision BrightData residential proxy zone | `[ ]` | |
| 10.5 | Push to `prod` branch → CI/CD deploys full docker-compose stack | `[ ]` | |
| 10.6 | Smoke test: live scrape from Apartments.com → listings appear | `[ ]` | |
| 10.7 | Smoke test: search with commute → GM API returns route | `[ ]` | |
| 10.8 | Monitor: Nginx logs + FastAPI Sentry + Celery Flower dashboard | `[ ]` | |

---

## Decisions & Notes

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-14 | App numbered as App 5 (not App 4) | App 4 = Violet Crumbs already exists in codebase |
| 2026-06-14 | Python/FastAPI chosen over Node/Express for backend | Shared Pydantic models with scraper; PostGIS/asyncpg ecosystem |
| 2026-06-14 | Facebook MP scraping is opt-in (`FB_ENABLED=false`) | ToS risk; legal review recommended before enabling in production |
| 2026-06-14 | Commute cache TTL = 6 hours | Transit schedules change intraday but not hour-to-hour |
| 2026-06-14 | Apartments.com implemented first in scraper | Lowest anti-bot friction; validates pipeline before tackling Zillow |
| 2026-06-14 | Peak departure time = next Monday 8:30 AM | Represents worst-case commute; consistent across all users' queries |

---

## Blockers / Open Questions

| # | Blocker | Owner | Status |
|---|---|---|---|
| B1 | BrightData account and credentials needed for Zillow/Apts scraping | User | Open |
| B2 | Google Maps API key (server + browser) — billing enabled, Distance Matrix + Places APIs active | User | Open |
| B3 | Facebook MP: legal review of ToS implications before enabling `FB_ENABLED=true` | User | Open |
| B4 | PostGIS on existing Postgres container — confirm image upgrade path | Backend Agent | Open |

---

## Agent Assignments (Phase 3–8)

| Agent | Phases | Key Deliverables |
|---|---|---|
| Backend Agent | 3, 4, 5 | Docker Compose, DB schema, all scrapers, FastAPI routes, CommuteService |
| Frontend Agent | 6 | React SPA, all components, map integration, filter panel |
| QA Agent | 7 | pytest suite, Vitest components, Playwright E2E, load test |
| Review Agent | 8 | Security audit, code quality, edge case coverage |
