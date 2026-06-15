-- CommuteFirst (App 5) — PostgreSQL Schema (no PostGIS required)
-- Spatial queries use Haversine formula inline; bounding-box index for speed.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── SOURCES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_sources (
    id                      SERIAL PRIMARY KEY,
    name                    VARCHAR(64)  NOT NULL UNIQUE,
    base_url                TEXT         NOT NULL,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    scrape_interval_minutes INT          NOT NULL DEFAULT 360,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO cs_sources (name, base_url, scrape_interval_minutes) VALUES
    ('zillow',               'https://www.zillow.com',               360),
    ('apartments_com',       'https://www.apartments.com',           360),
    ('streeteasy',           'https://streeteasy.com',               360),
    ('facebook_marketplace', 'https://www.facebook.com/marketplace', 720)
ON CONFLICT (name) DO NOTHING;

-- ── SCRAPE JOBS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_scrape_jobs (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id        INT         NOT NULL REFERENCES cs_sources(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_cs_scrape_jobs_source_status ON cs_scrape_jobs(source_id, status);
CREATE INDEX IF NOT EXISTS idx_cs_scrape_jobs_created_at    ON cs_scrape_jobs(created_at DESC);

-- ── LISTINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_listings (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id           INT           NOT NULL REFERENCES cs_sources(id),
    external_id         VARCHAR(255)  NOT NULL,
    scrape_job_id       UUID          REFERENCES cs_scrape_jobs(id) ON DELETE SET NULL,

    -- Location (plain lat/lng — no PostGIS required)
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(128)  NOT NULL,
    state               VARCHAR(64)   NOT NULL,
    zip_code            VARCHAR(16),
    neighborhood        VARCHAR(128),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),

    -- Property
    listing_type        VARCHAR(32)   NOT NULL DEFAULT 'rental'
                        CHECK (listing_type IN ('rental','sale')),
    property_type       VARCHAR(64)   CHECK (property_type IN
                        ('apartment','house','condo','townhouse','studio','loft','room','other')),
    bedrooms            NUMERIC(4,1),
    bathrooms           NUMERIC(4,1),
    square_feet         INT           CHECK (square_feet > 0),
    floor_number        INT,
    year_built          INT           CHECK (year_built BETWEEN 1800 AND 2100),

    -- Pricing
    price               NUMERIC(12,2) NOT NULL CHECK (price > 0),
    price_currency      CHAR(3)       NOT NULL DEFAULT 'USD',
    price_per_sqft      NUMERIC(10,2) GENERATED ALWAYS AS (
                            CASE WHEN square_feet > 0 THEN ROUND(price/square_feet,2) END
                        ) STORED,
    deposit             NUMERIC(12,2),
    fee_type            VARCHAR(32)   CHECK (fee_type IN ('no_fee','op_fee','broker_fee',NULL)),

    -- Amenity flags
    has_doorman         BOOLEAN NOT NULL DEFAULT FALSE,
    has_elevator        BOOLEAN NOT NULL DEFAULT FALSE,
    has_gym             BOOLEAN NOT NULL DEFAULT FALSE,
    has_laundry_in_unit BOOLEAN NOT NULL DEFAULT FALSE,
    has_laundry_in_bldg BOOLEAN NOT NULL DEFAULT FALSE,
    has_dishwasher      BOOLEAN NOT NULL DEFAULT FALSE,
    has_ac              BOOLEAN NOT NULL DEFAULT FALSE,
    pets_allowed        BOOLEAN,
    has_outdoor_space   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Content
    listing_url         TEXT    NOT NULL,
    image_urls          TEXT[]  NOT NULL DEFAULT '{}',
    description         TEXT,
    available_date      DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    raw_metadata        JSONB   NOT NULL DEFAULT '{}',

    -- Timestamps
    listed_at           TIMESTAMPTZ,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cs_source_external UNIQUE (source_id, external_id)
);

-- Bounding-box indexes speed up lat/lng range filters
CREATE INDEX IF NOT EXISTS idx_cs_listings_lat          ON cs_listings(latitude)            WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_listings_lng          ON cs_listings(longitude)           WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_listings_city_price   ON cs_listings(city, price)         WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_listings_type_beds    ON cs_listings(listing_type, bedrooms) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_listings_active       ON cs_listings(is_active, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_listings_address_trgm ON cs_listings USING GIN(address_line1 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cs_listings_zip          ON cs_listings(zip_code)            WHERE is_active = TRUE;

-- ── COMMUTE CACHE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_commute_cache (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id                  UUID         NOT NULL REFERENCES cs_listings(id) ON DELETE CASCADE,

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

    CONSTRAINT uq_cs_commute_key UNIQUE (listing_id, dest_lat, dest_lng, transport_mode, departure_epoch)
);

CREATE INDEX IF NOT EXISTS idx_cs_commute_listing   ON cs_commute_cache(listing_id);
CREATE INDEX IF NOT EXISTS idx_cs_commute_dest      ON cs_commute_cache(dest_lat, dest_lng);
CREATE INDEX IF NOT EXISTS idx_cs_commute_expires   ON cs_commute_cache(expires_at)       WHERE is_valid = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_commute_duration  ON cs_commute_cache(duration_seconds) WHERE is_valid = TRUE;
CREATE INDEX IF NOT EXISTS idx_cs_commute_transfers ON cs_commute_cache(transfer_count)
    WHERE transport_mode = 'transit' AND is_valid = TRUE;

-- ── SAVED LISTINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_saved_listings (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token UUID        NOT NULL,
    listing_id    UUID        NOT NULL REFERENCES cs_listings(id) ON DELETE CASCADE,
    notes         TEXT,
    saved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cs_session_listing UNIQUE (session_token, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_saved_session ON cs_saved_listings(session_token);
CREATE INDEX IF NOT EXISTS idx_cs_saved_listing ON cs_saved_listings(listing_id);

-- ── AUTO updated_at TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION cs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_cs_listings_updated_at ON cs_listings;
CREATE TRIGGER trg_cs_listings_updated_at
    BEFORE UPDATE ON cs_listings
    FOR EACH ROW EXECUTE FUNCTION cs_set_updated_at();

DROP TRIGGER IF EXISTS trg_cs_sources_updated_at ON cs_sources;
CREATE TRIGGER trg_cs_sources_updated_at
    BEFORE UPDATE ON cs_sources
    FOR EACH ROW EXECUTE FUNCTION cs_set_updated_at();
