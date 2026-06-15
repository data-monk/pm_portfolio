# CommuteFirst — Architecture

**App:** `app-5-commute-search`
**Architect Agent:** Completed (Step 1)

---

## Stack

| Layer | Technology | Justification |
|---|---|---|
| Scraping | Python 3.12 + Playwright + BeautifulSoup4 | JS-rendered pages; Python ETL ecosystem (Pydantic) shares models with FastAPI |
| Backend API | FastAPI + uvicorn | Same language as scrapers; native async; auto OpenAPI docs at `/docs`; Pydantic v2 validation |
| Database | PostgreSQL 16 + PostGIS 3.4 | `ST_DWithin` for radius queries; `tsvector` FTS; concurrent Celery writers; `JSONB` for source metadata |
| Cache | Redis 7 | Commute cache (6h TTL), search page cache (5min), Celery broker — one infra component |
| Queue | Celery 5 + celery-redbeat | Python-native; Celery Beat for cron; per-worker rate limiting; retry logic built in |
| Frontend | React 18 + TypeScript + Vite + Tailwind | Best Google Maps JS ecosystem; TypeScript for nested commute shapes |
| Maps display | Google Maps JS SDK (`@vis.gl/react-google-maps`) | Marker clustering for NYC density; InfoWindow popups |
| Commute calc | Google Distance Matrix API | Peak-hour departure times; transit transfer counting; `fewer_transfers` preference |
| Geocoding | Google Places API | Destination autocomplete (browser-restricted key) |
| Proxies | BrightData Residential | Residential IPs bypass Zillow/Apartments.com bot detection |
| Deployment | Docker Compose | Postgres+PostGIS, Redis, FastAPI, Celery worker+beat, Nginx, Vite — single `docker compose up` |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   React 18 + TypeScript SPA  (Vite · Tailwind · React Query)│
│   • Destination autocomplete (Places API — browser key)      │
│   • Filter panel + commute slider                            │
│   • Listing cards with commute badges                        │
│   • Google Maps JS SDK (marker clusters, route overlay)      │
│   • Saved listings (localStorage → server sync)             │
└─────────────────────────────┬────────────────────────────────┘
                              │ HTTPS / REST+JSON
┌─────────────────────────────▼────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│            Nginx — TLS termination · rate limiting           │
│     30 req/min search · 100 req/min general (per IP)        │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                       BACKEND LAYER                          │
│                    FastAPI (Python 3.12)                      │
│  GET /api/listings/search    POST /api/commute               │
│  GET /api/listings/:id       POST /api/saved                 │
│  GET /api/sources            POST /api/admin/scrape          │
│          │                              │                    │
│   ┌──────▼──────────┐        ┌──────────▼──────────┐        │
│   │ CommuteService  │        │  ListingsService     │        │
│   │ Redis → GM API  │        │  PostGIS queries     │        │
│   └──────┬──────────┘        └──────────┬──────────┘        │
└──────────┼────────────────────────────┬─┘────────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼──────────────────────┐
│    CACHE (Redis 7)  │    │    DATA STORE (PostgreSQL+PostGIS) │
│ commute:{key}   6h  │    │  listings        commute_cache     │
│ search:{hash}   5m  │    │  saved_listings  scrape_jobs       │
│ scrape:dedup   24h  │    │  sources                           │
└─────────────────────┘    └───────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────┐
│                        SCRAPING LAYER                          │
│            Celery Beat (cron) + Celery Workers                 │
│                                                                │
│  [Zillow]    [Apartments.com]  [StreetEasy]  [Facebook MP]    │
│  Playwright  Playwright+stealth Playwright   Playwright        │
│  +BrightData +BrightData       +BrightData   +saved cookies   │
│       └────────────┴───────────────┴──────────────┘           │
│                  [Normalization Pipeline]                      │
│              Pydantic validation + geocoding                   │
│                  UPSERT → PostgreSQL                           │
└────────────────────────────────────────────────────────────────┘
                              │
                 [Google Distance Matrix API]
                 [Google Places API]
                 [BrightData Residential Proxies]
```

---

## Directory Structure (within portfolio monorepo)

```
portfolio-monorepo/
├── client/src/apps/app-5-commute-search/
│   ├── CommuteSearchApp.tsx         # Root with providers + router
│   ├── commuteSearch.css            # App-scoped CSS (.cs-app)
│   ├── pages/
│   │   ├── SearchPage.tsx           # Home — destination input + filters
│   │   ├── ResultsPage.tsx          # Listing grid + map toggle
│   │   ├── ListingDetailPage.tsx    # Full detail + commute breakdown
│   │   └── SavedListingsPage.tsx    # Bookmarks + comparison mode
│   ├── components/
│   │   ├── DestinationInput.tsx     # Places Autocomplete wrapper
│   │   ├── CommuteModeSelector.tsx  # Transit/Drive/Bike/Walk toggle
│   │   ├── CommuteSlider.tsx        # Max commute time slider
│   │   ├── FilterPanel.tsx          # Left sidebar / bottom drawer
│   │   ├── ListingCard.tsx          # Card with commute badge
│   │   ├── CommuteBreakdown.tsx     # Route steps panel
│   │   ├── MapView.tsx              # Google Maps with marker clusters
│   │   ├── ComparisonTable.tsx      # Side-by-side comparison
│   │   └── CommuteTimeBadge.tsx     # Color-coded time badge
│   ├── hooks/
│   │   ├── useListings.ts           # React Query fetch + filter
│   │   ├── useCommute.ts            # Commute cache + polling
│   │   └── useSaved.ts              # localStorage + server sync
│   ├── lib/
│   │   ├── types.ts                 # All TypeScript interfaces
│   │   ├── api.ts                   # Typed API client
│   │   ├── mockData.ts              # Dev/CI mock listings
│   │   └── utils.ts                 # formatDuration, buildCacheKey etc.
│   └── constants/
│       └── transitLines.ts          # NYC MTA line colors + icons
│
├── scraper/                          # New top-level service
│   ├── scrapers/
│   │   ├── base.py                  # BaseScraper ABC
│   │   ├── zillow.py
│   │   ├── apartments_com.py
│   │   ├── streeteasy.py
│   │   └── facebook_marketplace.py
│   ├── pipeline/
│   │   ├── normalizer.py            # Pydantic models + field mapping
│   │   └── geocoder.py              # Google Geocoding fallback
│   ├── tasks.py                     # Celery task definitions
│   ├── celery_app.py                # Celery + Redis broker config
│   └── mock_data/
│       ├── zillow_fixtures.json
│       ├── apartments_fixtures.json
│       ├── streeteasy_fixtures.json
│       └── facebook_fixtures.json
│
├── api/                              # New top-level FastAPI service
│   ├── main.py                      # FastAPI app init, middleware, CORS
│   ├── routers/
│   │   ├── listings.py              # GET /listings/search, GET /listings/:id
│   │   ├── commute.py               # POST /commute (batch enrichment)
│   │   ├── saved.py                 # POST/GET /saved
│   │   └── admin.py                 # POST /admin/scrape
│   ├── services/
│   │   ├── listings_service.py      # SQL query builder + PostGIS
│   │   └── commute_service.py       # Redis → Google Distance Matrix
│   ├── models/
│   │   ├── listing.py               # Pydantic response models
│   │   └── commute.py               # Commute request/response models
│   ├── db/
│   │   ├── connection.py            # asyncpg connection pool
│   │   └── queries.py               # Parameterized SQL strings
│   └── config.py                    # Settings via pydantic-settings
│
├── database/
│   └── commute-search-schema.sql    # Full DDL (see below)
│
└── PM_Portfolio/commute-search/
    ├── specs.md                     # This file's sibling — product spec
    ├── architecture.md              # This file
    └── implementation-log.md        # Implementation tracking
```

---

## Database Schema (Full DDL)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── SOURCES ──────────────────────────────────────────────────────
CREATE TABLE sources (
    id                      SERIAL PRIMARY KEY,
    name                    VARCHAR(64)  NOT NULL UNIQUE,
    base_url                TEXT         NOT NULL,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    scrape_interval_minutes INT          NOT NULL DEFAULT 360,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO sources (name, base_url, scrape_interval_minutes) VALUES
    ('zillow',               'https://www.zillow.com',               360),
    ('apartments_com',       'https://www.apartments.com',           360),
    ('streeteasy',           'https://streeteasy.com',               360),
    ('facebook_marketplace', 'https://www.facebook.com/marketplace', 720);

-- ── SCRAPE JOBS ──────────────────────────────────────────────────
CREATE TABLE scrape_jobs (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id        INT         NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    celery_task_id   VARCHAR(255),
    status           VARCHAR(32) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','running','completed','failed','cancelled')),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    listings_found   INT         NOT NULL DEFAULT 0,
    listings_new     INT         NOT NULL DEFAULT 0,
    listings_updated INT         NOT NULL DEFAULT 0,
    error_message    TEXT,
    metadata         JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scrape_jobs_source_status ON scrape_jobs(source_id, status);
CREATE INDEX idx_scrape_jobs_created_at    ON scrape_jobs(created_at DESC);

-- ── LISTINGS ─────────────────────────────────────────────────────
CREATE TABLE listings (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id           INT           NOT NULL REFERENCES sources(id),
    external_id         VARCHAR(255)  NOT NULL,
    scrape_job_id       UUID          REFERENCES scrape_jobs(id) ON DELETE SET NULL,

    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(128)  NOT NULL,
    state               VARCHAR(64)   NOT NULL,
    zip_code            VARCHAR(16),
    neighborhood        VARCHAR(128),
    coordinates         GEOGRAPHY(POINT, 4326),

    listing_type        VARCHAR(32)   NOT NULL DEFAULT 'rental'
                        CHECK (listing_type IN ('rental','sale')),
    property_type       VARCHAR(64)   CHECK (property_type IN
                        ('apartment','house','condo','townhouse','studio','loft','room','other')),
    bedrooms            NUMERIC(4,1),
    bathrooms           NUMERIC(4,1),
    square_feet         INT           CHECK (square_feet > 0),
    floor_number        INT,
    year_built          INT           CHECK (year_built BETWEEN 1800 AND 2100),

    price               NUMERIC(12,2) NOT NULL CHECK (price > 0),
    price_currency      CHAR(3)       NOT NULL DEFAULT 'USD',
    price_per_sqft      NUMERIC(10,2) GENERATED ALWAYS AS (
                            CASE WHEN square_feet > 0 THEN ROUND(price/square_feet,2) END
                        ) STORED,
    deposit             NUMERIC(12,2),
    fee_type            VARCHAR(32)   CHECK (fee_type IN ('no_fee','op_fee','broker_fee',NULL)),

    has_doorman         BOOLEAN NOT NULL DEFAULT FALSE,
    has_elevator        BOOLEAN NOT NULL DEFAULT FALSE,
    has_gym             BOOLEAN NOT NULL DEFAULT FALSE,
    has_laundry_in_unit BOOLEAN NOT NULL DEFAULT FALSE,
    has_laundry_in_bldg BOOLEAN NOT NULL DEFAULT FALSE,
    has_dishwasher      BOOLEAN NOT NULL DEFAULT FALSE,
    has_ac              BOOLEAN NOT NULL DEFAULT FALSE,
    pets_allowed        BOOLEAN,
    has_outdoor_space   BOOLEAN NOT NULL DEFAULT FALSE,

    listing_url         TEXT    NOT NULL,
    image_urls          TEXT[]  NOT NULL DEFAULT '{}',
    description         TEXT,
    description_tsv     TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english', COALESCE(description,''))
                        ) STORED,
    available_date      DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    raw_metadata        JSONB   NOT NULL DEFAULT '{}',

    listed_at           TIMESTAMPTZ,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_source_external UNIQUE (source_id, external_id)
);

CREATE INDEX idx_listings_coordinates    ON listings USING GIST(coordinates);
CREATE INDEX idx_listings_city_price     ON listings(city, price)          WHERE is_active = TRUE;
CREATE INDEX idx_listings_type_beds      ON listings(listing_type, bedrooms) WHERE is_active = TRUE;
CREATE INDEX idx_listings_active         ON listings(is_active, last_seen_at DESC);
CREATE INDEX idx_listings_description_fts ON listings USING GIN(description_tsv);
CREATE INDEX idx_listings_address_trgm   ON listings USING GIN(address_line1 gin_trgm_ops);

-- ── COMMUTE CACHE ─────────────────────────────────────────────────
CREATE TABLE commute_cache (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id                  UUID         NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    dest_lat                    NUMERIC(9,6) NOT NULL,
    dest_lng                    NUMERIC(9,6) NOT NULL,
    dest_label                  VARCHAR(255),
    transport_mode              VARCHAR(32)  NOT NULL
                                CHECK (transport_mode IN ('driving','transit','walking','bicycling')),
    departure_epoch             BIGINT,

    duration_seconds            INT  CHECK (duration_seconds >= 0),
    duration_in_traffic_seconds INT  CHECK (duration_in_traffic_seconds >= 0),
    distance_meters             INT  CHECK (distance_meters >= 0),

    transit_steps               JSONB,
    transfer_count              INT  CHECK (transfer_count >= 0),
    transit_lines               TEXT[],

    gm_status                   VARCHAR(64) NOT NULL,
    raw_response                JSONB,

    fetched_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at                  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
    is_valid                    BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_commute_key UNIQUE (listing_id, dest_lat, dest_lng, transport_mode, departure_epoch)
);

CREATE INDEX idx_commute_listing   ON commute_cache(listing_id);
CREATE INDEX idx_commute_dest      ON commute_cache(dest_lat, dest_lng);
CREATE INDEX idx_commute_expires   ON commute_cache(expires_at)        WHERE is_valid = TRUE;
CREATE INDEX idx_commute_duration  ON commute_cache(duration_seconds)  WHERE is_valid = TRUE;
CREATE INDEX idx_commute_transfers ON commute_cache(transfer_count)
    WHERE transport_mode = 'transit' AND is_valid = TRUE;

-- ── SAVED LISTINGS ────────────────────────────────────────────────
CREATE TABLE saved_listings (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token UUID        NOT NULL,
    listing_id    UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    notes         TEXT,
    saved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_listing UNIQUE (session_token, listing_id)
);
CREATE INDEX idx_saved_session ON saved_listings(session_token);

-- ── AUTO updated_at TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Google Distance Matrix — Batching & Cache Strategy

### Batching
- 25 origins × 1 destination = 25 elements/call = $0.125/call
- After Redis 6h cache warm-up: ~80% hit rate for NYC → effective cost ~$1/1k listings
- Chunk cache-miss listings into groups of 25 before calling GM API

### Cache Key (Redis)
```
commute:{listing_id}:{round(dest_lat,4)}:{round(dest_lng,4)}:{mode}:{departure_bucket}
  TTL: 6 hours (21600s)

search:{sha256(sorted_query_params)}
  TTL: 5 minutes (300s)

scrape:dedup:{source}:{external_id}
  TTL: 24 hours (86400s)
```

### Error Handling
| GM Status | Action |
|---|---|
| `OK` | Parse, cache Redis + Postgres, return |
| `ZERO_RESULTS` | Cache as-is; display "No route available" |
| `NOT_FOUND` | Log bad coordinates; skip listing |
| `MAX_ELEMENTS_EXCEEDED` | Reduce batch to 10, retry |
| `REQUEST_DENIED` | Alert ops; circuit-break commute service |
| `OVER_DAILY_LIMIT` | Alert ops; serve cached-only mode for rest of day |

### Peak-Hour Epoch Calculation
```python
def get_next_monday_830am_epoch() -> int:
    now = datetime.now()
    days_ahead = (7 - now.weekday()) % 7 or 7
    peak = (now + timedelta(days=days_ahead)).replace(hour=8, minute=30)
    return int(peak.timestamp())
```

---

## Scraper Strategy Per Source

| Source | Strategy | Key Challenge | Fallback |
|---|---|---|---|
| Zillow | Playwright + BrightData rotating residential IPs; extract `__NEXT_DATA__` JSON from Next.js hydration | Fingerprint-aware; blocks datacenter IPs | `mock_data/zillow_fixtures.json` |
| Apartments.com | Playwright + `playwright-stealth`; random mouse movement; 2.5–6s delays; rotated UAs | Cloudflare challenges | `mock_data/apartments_fixtures.json` |
| StreetEasy | Intercept XHR to `/api/v1/listings` via `page.on('response')` — pure JSON | Residential proxies required; NYC only | HTML parse fallback |
| Facebook MP | Playwright + persisted session cookies (`storage_state`); one dedicated sticky IP | ToS risk — `FB_ENABLED=false` by default; session ~30d TTL | `mock_data/facebook_fixtures.json` |

---

## Security Checklist

| Concern | Implementation |
|---|---|
| API keys | `.env` only; `.gitignore`; Docker `--env-file`; production → Docker secrets |
| Google Maps keys | Server key: IP-restricted to VPS; browser key: HTTP referrer to domain |
| GM cost cap | Hard quota: 10k Distance Matrix elements/day; $50/month budget alert in GCP Console |
| Rate limiting | Nginx: 100/min per IP; FastAPI `slowapi`: 30/min search, 2/min admin |
| CORS | Allowlist: production domain + localhost:3000 (ENV-gated) |
| Proxy rotation | BrightData rotating for Zillow/Apts/SE; sticky IP for Facebook |
| FB ToS | Feature-flagged (`FB_ENABLED=false` default); opt-in disclosure; no profile data |

---

## Docker Compose Services

| Service | Image | Purpose |
|---|---|---|
| `postgres` | `postgis/postgis:16-3.4` | Primary data store |
| `redis` | `redis:7-alpine` | Cache + Celery broker |
| `api` | `./api` (FastAPI + uvicorn) | REST API |
| `worker` | `./scraper` (Celery worker) | Scraping tasks |
| `beat` | `./scraper` (Celery Beat) | Cron scheduler |
| `nginx` | `nginx:alpine` | Reverse proxy + TLS |
| `client` | `./client` (Vite) | React SPA (dev) / static (prod) |

---

## Integration with Portfolio Monorepo

This app diverges from the Node.js/Express pattern used by Apps 1–3. The scraper and API are Python services. Integration approach:

- The React frontend mounts at `/apps/commute-search/*` inside the existing Vite monorepo
- The FastAPI backend runs as a **separate Docker service** (`api` container) alongside the existing Express server
- Nginx routes `/api/commute-search/*` → FastAPI, all other `/api/*` → Express
- The existing `docker-compose.yml` is extended with the new services
