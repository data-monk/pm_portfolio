"""
Parameterized SQL query strings for CommuteFirst API.
All queries use $N positional parameters (asyncpg style).
Table prefix: cs_
"""

# ── Listing search ────────────────────────────────────────────────────────────
# Parameters (positional — caller builds the $N list dynamically):
# Used by listings_service.py which builds the WHERE clause dynamically.
# This is the base SELECT; the service appends WHERE conditions.

SEARCH_LISTINGS_BASE = """
SELECT
    l.id::text,
    l.external_id,
    s.name                          AS source,
    l.listing_url,
    l.address_line1,
    l.address_line2,
    l.city,
    l.state,
    l.zip_code,
    l.neighborhood,
    ST_Y(l.coordinates::geometry)   AS latitude,
    ST_X(l.coordinates::geometry)   AS longitude,
    l.listing_type,
    l.property_type,
    l.bedrooms,
    l.bathrooms,
    l.square_feet,
    l.floor_number,
    l.year_built,
    l.price,
    l.price_per_sqft,
    l.deposit,
    l.fee_type,
    l.has_doorman,
    l.has_elevator,
    l.has_gym,
    l.has_laundry_in_unit,
    l.has_laundry_in_bldg,
    l.has_dishwasher,
    l.has_ac,
    l.pets_allowed,
    l.has_outdoor_space,
    l.image_urls,
    l.description,
    l.available_date,
    l.is_active,
    l.first_seen_at                 AS scraped_at,
    l.last_seen_at,

    -- Commute data (nullable — only present if cache is warm)
    cc.duration_seconds,
    cc.duration_in_traffic_seconds,
    cc.distance_meters,
    cc.transfer_count,
    cc.transit_lines,
    cc.gm_status,
    cc.transit_steps

FROM cs_listings l
JOIN cs_sources  s  ON s.id = l.source_id
LEFT JOIN cs_commute_cache cc
    ON  cc.listing_id        = l.id
    AND cc.dest_lat           = $1
    AND cc.dest_lng           = $2
    AND cc.transport_mode     = $3
    AND (cc.departure_epoch   = $4 OR (cc.departure_epoch IS NULL AND $4 IS NULL))
    AND cc.is_valid           = TRUE
    AND cc.expires_at         > NOW()
"""

# COUNT query (same JOINs, no ORDER/LIMIT)
COUNT_LISTINGS_BASE = """
SELECT COUNT(*) AS total
FROM cs_listings l
JOIN cs_sources  s  ON s.id = l.source_id
LEFT JOIN cs_commute_cache cc
    ON  cc.listing_id        = l.id
    AND cc.dest_lat           = $1
    AND cc.dest_lng           = $2
    AND cc.transport_mode     = $3
    AND (cc.departure_epoch   = $4 OR (cc.departure_epoch IS NULL AND $4 IS NULL))
    AND cc.is_valid           = TRUE
    AND cc.expires_at         > NOW()
"""

# ── Single listing by ID ──────────────────────────────────────────────────────
# $1=listing_id $2=dest_lat $3=dest_lng $4=mode $5=departure_epoch
GET_LISTING_BY_ID = """
SELECT
    l.id::text,
    l.external_id,
    s.name                          AS source,
    l.listing_url,
    l.address_line1,
    l.address_line2,
    l.city,
    l.state,
    l.zip_code,
    l.neighborhood,
    ST_Y(l.coordinates::geometry)   AS latitude,
    ST_X(l.coordinates::geometry)   AS longitude,
    l.listing_type,
    l.property_type,
    l.bedrooms,
    l.bathrooms,
    l.square_feet,
    l.floor_number,
    l.year_built,
    l.price,
    l.price_per_sqft,
    l.deposit,
    l.fee_type,
    l.has_doorman,
    l.has_elevator,
    l.has_gym,
    l.has_laundry_in_unit,
    l.has_laundry_in_bldg,
    l.has_dishwasher,
    l.has_ac,
    l.pets_allowed,
    l.has_outdoor_space,
    l.image_urls,
    l.description,
    l.available_date,
    l.is_active,
    l.raw_metadata,
    l.first_seen_at                 AS scraped_at,
    l.last_seen_at,

    cc.duration_seconds,
    cc.duration_in_traffic_seconds,
    cc.distance_meters,
    cc.transfer_count,
    cc.transit_lines,
    cc.transit_steps,
    cc.gm_status

FROM cs_listings l
JOIN cs_sources  s  ON s.id = l.source_id
LEFT JOIN cs_commute_cache cc
    ON  cc.listing_id        = l.id
    AND cc.dest_lat           = $2
    AND cc.dest_lng           = $3
    AND cc.transport_mode     = $4
    AND (cc.departure_epoch   = $5 OR (cc.departure_epoch IS NULL AND $5 IS NULL))
    AND cc.is_valid           = TRUE
    AND cc.expires_at         > NOW()

WHERE l.id = $1::uuid
"""

# ── Commute cache upsert ──────────────────────────────────────────────────────
# $1=listing_id $2=dest_lat $3=dest_lng $4=dest_label $5=transport_mode
# $6=departure_epoch $7=duration_seconds $8=duration_in_traffic_seconds
# $9=distance_meters $10=transit_steps(jsonb) $11=transfer_count
# $12=transit_lines $13=gm_status $14=raw_response(jsonb)
UPSERT_COMMUTE_CACHE = """
INSERT INTO cs_commute_cache (
    listing_id, dest_lat, dest_lng, dest_label, transport_mode, departure_epoch,
    duration_seconds, duration_in_traffic_seconds, distance_meters,
    transit_steps, transfer_count, transit_lines,
    gm_status, raw_response, fetched_at, expires_at, is_valid
) VALUES (
    $1::uuid, $2, $3, $4, $5, $6,
    $7, $8, $9,
    $10::jsonb, $11, $12,
    $13, $14::jsonb, NOW(), NOW() + INTERVAL '6 hours', TRUE
)
ON CONFLICT (listing_id, dest_lat, dest_lng, transport_mode, departure_epoch)
DO UPDATE SET
    dest_label                  = EXCLUDED.dest_label,
    duration_seconds            = EXCLUDED.duration_seconds,
    duration_in_traffic_seconds = EXCLUDED.duration_in_traffic_seconds,
    distance_meters             = EXCLUDED.distance_meters,
    transit_steps               = EXCLUDED.transit_steps,
    transfer_count              = EXCLUDED.transfer_count,
    transit_lines               = EXCLUDED.transit_lines,
    gm_status                   = EXCLUDED.gm_status,
    raw_response                = EXCLUDED.raw_response,
    fetched_at                  = NOW(),
    expires_at                  = NOW() + INTERVAL '6 hours',
    is_valid                    = TRUE
"""

# ── Commute cache lookup ──────────────────────────────────────────────────────
# $1=listing_id $2=dest_lat $3=dest_lng $4=transport_mode $5=departure_epoch
GET_COMMUTE_CACHE = """
SELECT
    duration_seconds,
    duration_in_traffic_seconds,
    distance_meters,
    transfer_count,
    transit_lines,
    transit_steps,
    gm_status,
    fetched_at
FROM cs_commute_cache
WHERE listing_id        = $1::uuid
  AND dest_lat           = $2
  AND dest_lng           = $3
  AND transport_mode     = $4
  AND (departure_epoch   = $5 OR (departure_epoch IS NULL AND $5 IS NULL))
  AND is_valid           = TRUE
  AND expires_at         > NOW()
LIMIT 1
"""

# ── Save listing ──────────────────────────────────────────────────────────────
# $1=session_token $2=listing_id
SAVE_LISTING = """
INSERT INTO cs_saved_listings (session_token, listing_id)
VALUES ($1::uuid, $2::uuid)
ON CONFLICT (session_token, listing_id) DO NOTHING
RETURNING id::text
"""

# ── Get saved listings ────────────────────────────────────────────────────────
# $1=session_token $2=dest_lat $3=dest_lng $4=transport_mode $5=departure_epoch
GET_SAVED_LISTINGS = """
SELECT
    sl.id::text                     AS saved_id,
    sl.session_token::text,
    sl.listing_id::text,
    sl.notes,
    sl.saved_at,

    l.id::text,
    l.external_id,
    s.name                          AS source,
    l.listing_url,
    l.address_line1,
    l.address_line2,
    l.city,
    l.state,
    l.zip_code,
    l.neighborhood,
    ST_Y(l.coordinates::geometry)   AS latitude,
    ST_X(l.coordinates::geometry)   AS longitude,
    l.listing_type,
    l.property_type,
    l.bedrooms,
    l.bathrooms,
    l.square_feet,
    l.price,
    l.deposit,
    l.fee_type,
    l.has_doorman,
    l.has_elevator,
    l.has_gym,
    l.has_laundry_in_unit,
    l.has_laundry_in_bldg,
    l.has_dishwasher,
    l.has_ac,
    l.pets_allowed,
    l.has_outdoor_space,
    l.image_urls,
    l.description,
    l.available_date,
    l.is_active,
    l.first_seen_at                 AS scraped_at,
    l.last_seen_at,

    cc.duration_seconds,
    cc.duration_in_traffic_seconds,
    cc.distance_meters,
    cc.transfer_count,
    cc.transit_lines,
    cc.transit_steps,
    cc.gm_status

FROM cs_saved_listings sl
JOIN cs_listings l   ON l.id  = sl.listing_id
JOIN cs_sources  s   ON s.id  = l.source_id
LEFT JOIN cs_commute_cache cc
    ON  cc.listing_id        = l.id
    AND cc.dest_lat           = $2
    AND cc.dest_lng           = $3
    AND cc.transport_mode     = $4
    AND (cc.departure_epoch   = $5 OR (cc.departure_epoch IS NULL AND $5 IS NULL))
    AND cc.is_valid           = TRUE
    AND cc.expires_at         > NOW()

WHERE sl.session_token = $1::uuid
ORDER BY sl.saved_at DESC
"""

# ── Delete saved listing ──────────────────────────────────────────────────────
# $1=session_token $2=listing_id
DELETE_SAVED_LISTING = """
DELETE FROM cs_saved_listings
WHERE session_token = $1::uuid AND listing_id = $2::uuid
"""

# ── Mark stale listings ───────────────────────────────────────────────────────
MARK_STALE = """
UPDATE cs_listings
SET is_active = FALSE
WHERE is_active = TRUE
  AND last_seen_at < NOW() - INTERVAL '12 hours'
"""

# ── Source health ─────────────────────────────────────────────────────────────
GET_SOURCE_HEALTH = """
SELECT
    s.id,
    s.name,
    s.is_active,
    s.scrape_interval_minutes,
    j.status        AS last_job_status,
    j.started_at    AS last_job_started_at,
    j.completed_at  AS last_job_completed_at,
    j.listings_found,
    j.listings_new,
    j.error_message AS last_error
FROM cs_sources s
LEFT JOIN LATERAL (
    SELECT *
    FROM cs_scrape_jobs
    WHERE source_id = s.id
    ORDER BY created_at DESC
    LIMIT 1
) j ON TRUE
ORDER BY s.id
"""
