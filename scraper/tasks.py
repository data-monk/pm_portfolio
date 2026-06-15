"""
Celery tasks for CommuteFirst scraping pipeline.

Note: Celery workers are synchronous by default.
Async helpers are called via asyncio.get_event_loop().run_until_complete().
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

import asyncpg

from celery_app import app
from pipeline.normalizer import normalize, RawListing
from pipeline.geocoder import geocode_listing

logger = logging.getLogger(__name__)

CS_DSN = os.getenv("CS_POSTGRES_DSN", "")
CS_REDIS_URL = os.getenv("CS_REDIS_URL", "redis://localhost:6380/0")

GMAPS_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# ── Utility: run async code in sync Celery context ─────────────────────────────

def _run(coro):
    """Run an async coroutine from a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── Scraper registry ──────────────────────────────────────────────────────────

def _get_scraper(source_name: str):
    """Instantiate the correct scraper for the given source name."""
    from scrapers.apartments_com import ApartmentsComScraper
    from scrapers.streeteasy import StreetEasyScraper
    from scrapers.zillow import ZillowScraper
    from scrapers.facebook_marketplace import FacebookMarketplaceScraper

    registry = {
        "apartments_com": ApartmentsComScraper,
        "streeteasy": StreetEasyScraper,
        "zillow": ZillowScraper,
        "facebook_marketplace": FacebookMarketplaceScraper,
    }
    cls = registry.get(source_name)
    if cls is None:
        raise ValueError(f"Unknown source: {source_name!r}. Valid: {list(registry)}")
    return cls()


# ── Database helpers ──────────────────────────────────────────────────────────

async def _get_source_id(conn: asyncpg.Connection, source_name: str) -> Optional[int]:
    row = await conn.fetchrow(
        "SELECT id FROM cs_sources WHERE name = $1", source_name
    )
    return row["id"] if row else None


async def _insert_scrape_job(
    conn: asyncpg.Connection,
    source_id: int,
    celery_task_id: str,
) -> str:
    """Insert a scrape_job row and return its UUID."""
    job_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO cs_scrape_jobs (id, source_id, celery_task_id, status, started_at)
        VALUES ($1, $2, $3, 'running', NOW())
        """,
        job_id, source_id, celery_task_id,
    )
    return job_id


async def _update_scrape_job(
    conn: asyncpg.Connection,
    job_id: str,
    status: str,
    listings_found: int = 0,
    listings_new: int = 0,
    listings_updated: int = 0,
    error_message: Optional[str] = None,
) -> None:
    await conn.execute(
        """
        UPDATE cs_scrape_jobs
        SET status = $1,
            completed_at = NOW(),
            listings_found = $2,
            listings_new = $3,
            listings_updated = $4,
            error_message = $5
        WHERE id = $6
        """,
        status, listings_found, listings_new, listings_updated, error_message, job_id,
    )


async def _upsert_listing(
    conn: asyncpg.Connection,
    normalized,
    source_id: int,
    job_id: str,
) -> tuple[str, bool]:
    """
    Upsert a normalized listing into cs_listings.
    Returns (listing_id, is_new).
    """
    # Check if exists
    existing = await conn.fetchrow(
        "SELECT id FROM cs_listings WHERE source_id = $1 AND external_id = $2",
        source_id, normalized.external_id,
    )

    has_coordinates = (
        normalized.latitude is not None and normalized.longitude is not None
    )

    if existing:
        listing_id = str(existing["id"])
        # Update mutable fields
        await conn.execute(
            """
            UPDATE cs_listings SET
                scrape_job_id = $1,
                price = $2,
                address_line1 = $3,
                city = $4,
                state = $5,
                zip_code = $6,
                neighborhood = $7,
                bedrooms = $8,
                bathrooms = $9,
                square_feet = $10,
                description = $11,
                image_urls = $12,
                has_doorman = $13,
                has_elevator = $14,
                has_gym = $15,
                has_laundry_in_unit = $16,
                has_laundry_in_bldg = $17,
                has_dishwasher = $18,
                has_ac = $19,
                pets_allowed = $20,
                has_outdoor_space = $21,
                is_active = TRUE,
                last_seen_at = NOW(),
                raw_metadata = $22
            WHERE id = $23
            """,
            job_id,
            normalized.price,
            normalized.address_line1,
            normalized.city,
            normalized.state,
            normalized.zip_code,
            normalized.neighborhood,
            normalized.bedrooms,
            normalized.bathrooms,
            normalized.square_feet,
            normalized.description,
            normalized.image_urls,
            normalized.has_doorman,
            normalized.has_elevator,
            normalized.has_gym,
            normalized.has_laundry_in_unit,
            normalized.has_laundry_in_bldg,
            normalized.has_dishwasher,
            normalized.has_ac,
            normalized.pets_allowed,
            normalized.has_outdoor_space,
            json.dumps(normalized.raw_metadata),
            existing["id"],
        )
        # Update coordinates if we now have them
        if has_coordinates:
            await conn.execute(
                "UPDATE cs_listings SET latitude = $1, longitude = $2 WHERE id = $3",
                normalized.latitude, normalized.longitude, existing["id"],
            )
        return listing_id, False

    else:
        # New listing — INSERT
        new_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO cs_listings (
                id, source_id, external_id, scrape_job_id,
                address_line1, address_line2, city, state, zip_code, neighborhood,
                listing_type, property_type,
                bedrooms, bathrooms, square_feet, floor_number, year_built,
                price, deposit, fee_type,
                has_doorman, has_elevator, has_gym,
                has_laundry_in_unit, has_laundry_in_bldg,
                has_dishwasher, has_ac, pets_allowed, has_outdoor_space,
                listing_url, image_urls, description,
                available_date, listed_at, is_active, raw_metadata,
                first_seen_at, last_seen_at
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10,
                $11, $12,
                $13, $14, $15, $16, $17,
                $18, $19, $20,
                $21, $22, $23,
                $24, $25,
                $26, $27, $28, $29,
                $30, $31, $32,
                $33, $34, TRUE, $35,
                NOW(), NOW()
            )
            """,
            new_id, source_id, normalized.external_id, job_id,
            normalized.address_line1, normalized.address_line2,
            normalized.city, normalized.state, normalized.zip_code, normalized.neighborhood,
            normalized.listing_type, normalized.property_type,
            normalized.bedrooms, normalized.bathrooms, normalized.square_feet,
            normalized.floor_number, normalized.year_built,
            normalized.price, normalized.deposit, normalized.fee_type,
            normalized.has_doorman, normalized.has_elevator, normalized.has_gym,
            normalized.has_laundry_in_unit, normalized.has_laundry_in_bldg,
            normalized.has_dishwasher, normalized.has_ac, normalized.pets_allowed,
            normalized.has_outdoor_space,
            normalized.listing_url, normalized.image_urls, normalized.description,
            normalized.available_date, normalized.listed_at,
            json.dumps(normalized.raw_metadata),
        )
        # Set coordinates if available
        if normalized.latitude is not None and normalized.longitude is not None:
            await conn.execute(
                "UPDATE cs_listings SET latitude = $1, longitude = $2 WHERE id = $3",
                normalized.latitude, normalized.longitude, new_id,
            )
        return new_id, True


# ── Redis dedup helpers ───────────────────────────────────────────────────────

def _redis_dedup_key(source: str, external_id: str) -> str:
    return f"scrape:dedup:{source}:{external_id}"


async def _check_dedup(redis_client, key: str) -> bool:
    """Returns True if the key exists (i.e., listing already processed recently)."""
    return await redis_client.exists(key) > 0


async def _set_dedup(redis_client, key: str) -> None:
    """Mark this listing as seen for 24 hours."""
    await redis_client.set(key, "1", ex=86400)


# ── Main scraping task ────────────────────────────────────────────────────────

@app.task(bind=True, max_retries=3, default_retry_delay=120)
def scrape_source(self, source_name: str, city: str = "new-york", state: str = "ny"):
    """
    Main Celery task: runs a scraper, normalizes results, and upserts to Postgres.

    Steps:
    1. INSERT scrape_job row (status='running')
    2. Instantiate scraper by source_name
    3. Run scraper.scrape(city, state)
    4. For each raw listing:
       a. Check Redis dedup key; skip if present
       b. Run normalize()
       c. Geocode if no coordinates
       d. Upsert to cs_listings
       e. Set Redis dedup key EX 86400
    5. UPDATE scrape_job (status='completed', counts)
    6. On exception: retry with backoff; UPDATE scrape_job (status='failed')
    """
    logger.info("scrape_source: starting %s (city=%s, state=%s)", source_name, city, state)

    async def _run_pipeline():
        import redis.asyncio as aioredis

        redis_client = aioredis.from_url(CS_REDIS_URL, decode_responses=True)
        conn = await asyncpg.connect(CS_DSN)

        job_id = None
        try:
            # 1. Get source_id
            source_id = await _get_source_id(conn, source_name)
            if source_id is None:
                raise ValueError(f"Source '{source_name}' not found in cs_sources table")

            # 2. Insert scrape job
            job_id = await _insert_scrape_job(conn, source_id, self.request.id or "")

            # 3. Get scraper and run
            scraper = _get_scraper(source_name)
            raw_listings = await scraper.scrape(city, state)

            logger.info("scrape_source: %s returned %d raw listings", source_name, len(raw_listings))

            found = len(raw_listings)
            new_count = 0
            updated_count = 0

            # 4. Process each listing
            for raw in raw_listings:
                external_id = str(raw.get("external_id") or raw.get("id") or raw.get("listingId") or raw.get("zpid") or "")

                # a. Redis dedup check
                if external_id:
                    dedup_key = _redis_dedup_key(source_name, external_id)
                    if await _check_dedup(redis_client, dedup_key):
                        logger.debug("scrape_source: dedup skip %s:%s", source_name, external_id)
                        continue

                # b. Normalize
                try:
                    normalized = normalize(raw, source_name)
                except Exception as exc:
                    logger.warning("scrape_source: normalize error for %s listing: %s", source_name, exc)
                    continue

                if normalized is None:
                    logger.debug("scrape_source: normalize returned None — skipping listing")
                    continue

                # c. Geocode if no coordinates
                if normalized.latitude is None or normalized.longitude is None:
                    if normalized.address_line1 and normalized.city:
                        try:
                            coords = await geocode_listing(
                                normalized.address_line1,
                                normalized.city,
                                normalized.state,
                                normalized.zip_code,
                            )
                            if coords:
                                normalized.latitude, normalized.longitude = coords
                        except Exception as geo_exc:
                            logger.warning("scrape_source: geocoding failed: %s", geo_exc)

                # d. Upsert to DB
                try:
                    listing_id, is_new = await _upsert_listing(conn, normalized, source_id, job_id)
                    if is_new:
                        new_count += 1
                    else:
                        updated_count += 1
                except Exception as db_exc:
                    logger.error("scrape_source: DB upsert error: %s", db_exc)
                    continue

                # e. Set Redis dedup key
                if external_id:
                    await _set_dedup(redis_client, dedup_key)

            # 5. Update scrape job to completed
            await _update_scrape_job(
                conn, job_id,
                status="completed",
                listings_found=found,
                listings_new=new_count,
                listings_updated=updated_count,
            )
            logger.info(
                "scrape_source: %s done — found=%d new=%d updated=%d",
                source_name, found, new_count, updated_count,
            )

        except Exception as exc:
            logger.error("scrape_source: pipeline error for %s: %s", source_name, exc, exc_info=True)
            if job_id:
                try:
                    await _update_scrape_job(
                        conn, job_id,
                        status="failed",
                        error_message=str(exc)[:500],
                    )
                except Exception:
                    pass
            raise
        finally:
            await conn.close()
            await redis_client.aclose()

    try:
        _run(_run_pipeline())
    except Exception as exc:
        logger.error("scrape_source: retrying due to: %s", exc)
        raise self.retry(exc=exc, countdown=120 * (self.request.retries + 1))


# ── Mark stale listings task ──────────────────────────────────────────────────

@app.task
def mark_stale_listings():
    """
    Set is_active=FALSE for listings not seen in the last 12 hours.
    Runs every 6 hours via Celery Beat.
    """
    logger.info("mark_stale_listings: starting")

    async def _run_mark_stale():
        conn = await asyncpg.connect(CS_DSN)
        try:
            result = await conn.execute(
                """
                UPDATE cs_listings
                SET is_active = FALSE
                WHERE is_active = TRUE
                  AND last_seen_at < NOW() - INTERVAL '12 hours'
                """
            )
            # asyncpg returns "UPDATE N" — extract count
            count = int(result.split()[-1]) if result else 0
            logger.info("mark_stale_listings: marked %d listings as inactive", count)
        finally:
            await conn.close()

    _run(_run_mark_stale())


# ── Batch commute enrichment task ─────────────────────────────────────────────

@app.task
def batch_commute_enrich(
    listing_ids: list[str],
    dest_lat: float,
    dest_lng: float,
    mode: str,
    departure_epoch: Optional[int],
):
    """
    Fetch commute data for a batch of listings from Google Distance Matrix.
    Called by the FastAPI server when cache misses are detected.

    Process:
    1. Fetch listing coordinates from DB
    2. Chunk into groups of 25 (GM API limit: 25 origins)
    3. Call Google Distance Matrix API for each chunk
    4. Write results to cs_commute_cache (Postgres) and Redis (6h TTL)
    """
    logger.info(
        "batch_commute_enrich: %d listings → (%s, %s) mode=%s",
        len(listing_ids), dest_lat, dest_lng, mode,
    )

    async def _run_enrich():
        import httpx
        import redis.asyncio as aioredis

        if not GOOGLE_MAPS_API_KEY:
            logger.warning("batch_commute_enrich: GOOGLE_MAPS_API_KEY not set — skipping")
            return

        redis_client = aioredis.from_url(CS_REDIS_URL, decode_responses=True)
        conn = await asyncpg.connect(CS_DSN)

        try:
            # Fetch lat/lng for all listing IDs
            rows = await conn.fetch(
                """
                SELECT id, latitude AS lat, longitude AS lng
                FROM cs_listings
                WHERE id = ANY($1::uuid[])
                  AND latitude IS NOT NULL AND longitude IS NOT NULL
                """,
                listing_ids,
            )

            origins = [
                (str(row["id"]), float(row["lat"]), float(row["lng"]))
                for row in rows
            ]

            if not origins:
                logger.warning("batch_commute_enrich: no listings with coordinates found")
                return

            # Chunk into groups of 25
            chunk_size = 25
            chunks = [origins[i:i + chunk_size] for i in range(0, len(origins), chunk_size)]

            async with httpx.AsyncClient(timeout=30.0) as http:
                for chunk in chunks:
                    origin_params = "|".join(f"{lat},{lng}" for _, lat, lng in chunk)
                    dest_param = f"{dest_lat},{dest_lng}"

                    params = {
                        "origins": origin_params,
                        "destinations": dest_param,
                        "mode": mode,
                        "key": GOOGLE_MAPS_API_KEY,
                        "units": "imperial",
                    }
                    if departure_epoch:
                        params["departure_time"] = str(departure_epoch)
                    if mode == "transit":
                        params["transit_routing_preference"] = "fewer_transfers"

                    try:
                        resp = await http.get(GMAPS_DISTANCE_MATRIX_URL, params=params)
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception as exc:
                        logger.error("batch_commute_enrich: GM API error: %s", exc)
                        continue

                    top_status = data.get("status")
                    if top_status in ("REQUEST_DENIED", "INVALID_REQUEST"):
                        logger.error("batch_commute_enrich: GM API top-level error: %s", top_status)
                        break
                    if top_status == "OVER_DAILY_LIMIT":
                        logger.error("batch_commute_enrich: OVER_DAILY_LIMIT — pausing commute service")
                        # Store circuit-break flag in Redis
                        await redis_client.set("commute:circuit_break", "1", ex=3600)
                        break

                    rows_gm = data.get("rows", [])
                    for i, (listing_id, lat, lng) in enumerate(chunk):
                        if i >= len(rows_gm):
                            break
                        row_gm = rows_gm[i]
                        elements = row_gm.get("elements", [])
                        element = elements[0] if elements else {}

                        element_status = element.get("status", "UNKNOWN")
                        duration_seconds = None
                        duration_traffic_seconds = None
                        distance_meters = None
                        transit_steps = None
                        transfer_count = None
                        transit_lines = []

                        if element_status == "OK":
                            duration_seconds = element.get("duration", {}).get("value")
                            dist = element.get("distance", {}).get("value")
                            distance_meters = int(dist) if dist else None
                            if mode == "driving":
                                traffic = element.get("duration_in_traffic", {})
                                if traffic:
                                    duration_traffic_seconds = traffic.get("value")
                            if mode == "transit":
                                steps = element.get("steps", [])
                                transit_steps_list = []
                                lines = []
                                transfers = 0
                                for step in steps:
                                    if step.get("travel_mode") == "TRANSIT":
                                        transit_detail = step.get("transit_details", {})
                                        line = transit_detail.get("line", {})
                                        line_name = line.get("short_name") or line.get("name")
                                        if line_name:
                                            lines.append(line_name)
                                        transfers += 1
                                        transit_steps_list.append({
                                            "mode": "transit",
                                            "duration_seconds": step.get("duration", {}).get("value"),
                                            "distance_meters": step.get("distance", {}).get("value"),
                                            "transit_line": line_name,
                                            "departure_stop": transit_detail.get("departure_stop", {}).get("name"),
                                            "arrival_stop": transit_detail.get("arrival_stop", {}).get("name"),
                                        })
                                    else:
                                        transit_steps_list.append({
                                            "mode": step.get("travel_mode", "walking").lower(),
                                            "duration_seconds": step.get("duration", {}).get("value"),
                                            "distance_meters": step.get("distance", {}).get("value"),
                                            "instruction": step.get("html_instructions", ""),
                                        })
                                transit_steps = json.dumps(transit_steps_list)
                                # Transfers = transit vehicle boardings - 1
                                transfer_count = max(0, transfers - 1) if transfers > 0 else 0
                                transit_lines = lines

                        # Upsert into cs_commute_cache
                        try:
                            await conn.execute(
                                """
                                INSERT INTO cs_commute_cache (
                                    listing_id, dest_lat, dest_lng, transport_mode, departure_epoch,
                                    duration_seconds, duration_in_traffic_seconds, distance_meters,
                                    transit_steps, transfer_count, transit_lines,
                                    gm_status, raw_response, fetched_at, expires_at, is_valid
                                ) VALUES (
                                    $1::uuid, $2, $3, $4, $5,
                                    $6, $7, $8,
                                    $9::jsonb, $10, $11,
                                    $12, $13::jsonb, NOW(), NOW() + INTERVAL '6 hours', TRUE
                                )
                                ON CONFLICT (listing_id, dest_lat, dest_lng, transport_mode, departure_epoch)
                                DO UPDATE SET
                                    duration_seconds = EXCLUDED.duration_seconds,
                                    duration_in_traffic_seconds = EXCLUDED.duration_in_traffic_seconds,
                                    distance_meters = EXCLUDED.distance_meters,
                                    transit_steps = EXCLUDED.transit_steps,
                                    transfer_count = EXCLUDED.transfer_count,
                                    transit_lines = EXCLUDED.transit_lines,
                                    gm_status = EXCLUDED.gm_status,
                                    raw_response = EXCLUDED.raw_response,
                                    fetched_at = NOW(),
                                    expires_at = NOW() + INTERVAL '6 hours',
                                    is_valid = TRUE
                                """,
                                listing_id,
                                round(dest_lat, 6),
                                round(dest_lng, 6),
                                mode,
                                departure_epoch,
                                duration_seconds,
                                duration_traffic_seconds,
                                distance_meters,
                                transit_steps,
                                transfer_count,
                                transit_lines or [],
                                element_status,
                                json.dumps(element),
                            )
                        except Exception as db_exc:
                            logger.error(
                                "batch_commute_enrich: DB write error for %s: %s",
                                listing_id, db_exc,
                            )

                        # Write to Redis cache (6h TTL)
                        lat4 = round(dest_lat, 4)
                        lng4 = round(dest_lng, 4)
                        epoch = departure_epoch or 0
                        redis_key = f"commute:{listing_id}:{lat4}:{lng4}:{mode}:{epoch}"
                        cache_payload = {
                            "status": element_status,
                            "duration_seconds": duration_seconds,
                            "duration_in_traffic_seconds": duration_traffic_seconds,
                            "distance_meters": distance_meters,
                            "transfer_count": transfer_count,
                            "transit_lines": transit_lines,
                            "transit_steps": json.loads(transit_steps) if transit_steps else [],
                        }
                        try:
                            await redis_client.set(redis_key, json.dumps(cache_payload), ex=21600)
                        except Exception as redis_exc:
                            logger.warning("batch_commute_enrich: Redis write error: %s", redis_exc)

        finally:
            await conn.close()
            await redis_client.aclose()

    _run(_run_enrich())
