"""
CommuteService — Redis → Google Distance Matrix API → Postgres commute cache.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
import redis.asyncio as aioredis

from config import settings
from db.queries import UPSERT_COMMUTE_CACHE, GET_COMMUTE_CACHE

logger = logging.getLogger(__name__)

GMAPS_BASE = "https://maps.googleapis.com/maps/api/distancematrix/json"


# ── Peak-hour epoch ───────────────────────────────────────────────────────────

def get_next_monday_830am_epoch() -> int:
    """
    Returns Unix timestamp for next Monday at 8:30 AM local time.
    If today is Monday, returns NEXT Monday (always at least 7 days ahead).
    This represents worst-case peak commute time.
    """
    now = datetime.now()
    # weekday(): Monday=0, Sunday=6
    days_ahead = (7 - now.weekday()) % 7 or 7
    peak = (now + timedelta(days=days_ahead)).replace(
        hour=8, minute=30, second=0, microsecond=0
    )
    return int(peak.timestamp())


# ── Redis cache key ───────────────────────────────────────────────────────────

def build_redis_key(
    listing_id: str,
    dest_lat: float,
    dest_lng: float,
    mode: str,
    departure_epoch: Optional[int],
) -> str:
    lat4 = round(dest_lat, 4)
    lng4 = round(dest_lng, 4)
    epoch = departure_epoch or 0
    return f"commute:{listing_id}:{lat4}:{lng4}:{mode}:{epoch}"


# ── Redis read/write ──────────────────────────────────────────────────────────

async def get_commute_from_redis(key: str, redis_client: aioredis.Redis) -> dict | None:
    """Return cached commute dict from Redis, or None on miss/error."""
    try:
        value = await redis_client.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as exc:
        logger.warning("Redis read error for key %r: %s", key, exc)
        return None


async def write_commute_to_redis(key: str, data: dict, redis_client: aioredis.Redis) -> None:
    """Write commute data to Redis with 6-hour TTL."""
    try:
        await redis_client.set(key, json.dumps(data), ex=21600)
    except Exception as exc:
        logger.warning("Redis write error for key %r: %s", key, exc)


# ── Distance Matrix response parsing ─────────────────────────────────────────

async def parse_distance_matrix_element(element: dict, mode: str) -> dict:
    """
    Parse a single Google Distance Matrix element dict.

    Returns a normalized dict with:
    - status: str
    - duration_seconds: int | None
    - duration_in_traffic_seconds: int | None
    - distance_meters: int | None
    - transfer_count: int | None
    - transit_lines: list[str]
    - transit_steps: list[dict]
    - error: str | None
    """
    status = element.get("status", "UNKNOWN")
    result = {
        "status": status,
        "duration_seconds": None,
        "duration_in_traffic_seconds": None,
        "distance_meters": None,
        "transfer_count": None,
        "transit_lines": [],
        "transit_steps": [],
        "error": None,
    }

    if status == "OK":
        duration = element.get("duration", {})
        result["duration_seconds"] = duration.get("value")

        distance = element.get("distance", {})
        result["distance_meters"] = distance.get("value")

        if mode == "driving":
            traffic = element.get("duration_in_traffic", {})
            if traffic:
                result["duration_in_traffic_seconds"] = traffic.get("value")

        if mode == "transit":
            steps = element.get("steps", [])
            transit_steps = []
            transit_lines = []
            transit_vehicle_count = 0

            for idx, step in enumerate(steps):
                travel_mode = step.get("travel_mode", "").upper()
                step_duration = (step.get("duration") or {}).get("value", 0)
                step_distance = (step.get("distance") or {}).get("value", 0)

                if travel_mode == "TRANSIT":
                    transit_vehicle_count += 1
                    td = step.get("transit_details", {})
                    line = td.get("line", {})
                    line_name = line.get("short_name") or line.get("name") or ""
                    vehicle_type = (line.get("vehicle") or {}).get("type", "")
                    dep_stop = (td.get("departure_stop") or {}).get("name")
                    arr_stop = (td.get("arrival_stop") or {}).get("name")

                    if line_name:
                        transit_lines.append(line_name)

                    transit_steps.append({
                        "step_index": idx,
                        "mode": "transit",
                        "instruction": f"Take {line_name or 'transit'} from {dep_stop or '?'} to {arr_stop or '?'}",
                        "duration_seconds": step_duration,
                        "distance_meters": step_distance,
                        "transit_line": line_name or None,
                        "transit_vehicle_type": vehicle_type or None,
                        "departure_stop": dep_stop,
                        "arrival_stop": arr_stop,
                    })
                else:
                    html_inst = step.get("html_instructions", "Walk")
                    # Strip HTML tags
                    import re
                    clean_inst = re.sub(r"<[^>]+>", "", html_inst)
                    transit_steps.append({
                        "step_index": idx,
                        "mode": travel_mode.lower() or "walking",
                        "instruction": clean_inst,
                        "duration_seconds": step_duration,
                        "distance_meters": step_distance,
                    })

            result["transit_steps"] = transit_steps
            result["transit_lines"] = transit_lines
            # Transfers = number of transit vehicles boarded - 1
            result["transfer_count"] = max(0, transit_vehicle_count - 1) if transit_vehicle_count > 0 else 0

    elif status == "ZERO_RESULTS":
        result["error"] = "No route available"

    elif status == "NOT_FOUND":
        result["error"] = "Origin or destination coordinates not found"

    elif status == "MAX_ELEMENTS_EXCEEDED":
        result["error"] = "Batch size exceeded"

    elif status == "REQUEST_DENIED":
        result["error"] = "API key invalid or Distance Matrix API not enabled"
        logger.error("Google Distance Matrix: REQUEST_DENIED — check API key and billing")

    elif status == "OVER_DAILY_LIMIT":
        result["error"] = "Daily API quota exceeded"
        logger.error("Google Distance Matrix: OVER_DAILY_LIMIT")

    elif status == "OVER_QUERY_LIMIT":
        result["error"] = "Query rate limit exceeded"

    else:
        result["error"] = f"Unexpected status: {status}"

    return result


# ── Batch fetch from Google Distance Matrix ───────────────────────────────────

async def batch_fetch_commute(
    origins: list[tuple[str, float, float]],  # (listing_id, lat, lng)
    dest_lat: float,
    dest_lng: float,
    mode: str,
    departure_epoch: Optional[int],
) -> dict[str, dict]:
    """
    Call Google Distance Matrix API for up to 25 origins at a time.
    Returns dict: listing_id → parsed result dict.
    """
    if not settings.google_maps_api_key:
        logger.error("batch_fetch_commute: GOOGLE_MAPS_API_KEY not configured")
        return {lid: {"status": "REQUEST_DENIED", "error": "API key not configured"} for lid, _, _ in origins}

    results: dict[str, dict] = {}
    chunk_size = 25

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(0, len(origins), chunk_size):
            chunk = origins[i:i + chunk_size]
            origin_param = "|".join(f"{lat},{lng}" for _, lat, lng in chunk)
            dest_param = f"{dest_lat},{dest_lng}"

            params: dict = {
                "origins": origin_param,
                "destinations": dest_param,
                "mode": mode,
                "key": settings.google_maps_api_key,
                "units": "imperial",
            }
            if departure_epoch:
                params["departure_time"] = str(departure_epoch)
            if mode == "transit":
                params["transit_routing_preference"] = "fewer_transfers"

            try:
                resp = await client.get(GMAPS_BASE, params=params)
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as exc:
                logger.error("GM API HTTP error: %s", exc)
                for lid, _, _ in chunk:
                    results[lid] = {"status": "HTTP_ERROR", "error": str(exc)}
                continue
            except Exception as exc:
                logger.error("GM API request failed: %s", exc)
                for lid, _, _ in chunk:
                    results[lid] = {"status": "REQUEST_ERROR", "error": str(exc)}
                continue

            top_status = data.get("status")
            if top_status in ("REQUEST_DENIED", "OVER_DAILY_LIMIT", "INVALID_REQUEST"):
                logger.error("GM API top-level error: %s", top_status)
                for lid, _, _ in chunk:
                    results[lid] = {"status": top_status, "error": f"GM API: {top_status}"}
                continue

            rows = data.get("rows", [])
            for j, (listing_id, lat, lng) in enumerate(chunk):
                if j >= len(rows):
                    results[listing_id] = {"status": "NO_DATA", "error": "No row in GM response"}
                    continue
                elements = rows[j].get("elements", [])
                element = elements[0] if elements else {}

                # Handle MAX_ELEMENTS_EXCEEDED by reducing batch and retrying once
                if element.get("status") == "MAX_ELEMENTS_EXCEEDED":
                    logger.warning("GM API: MAX_ELEMENTS_EXCEEDED — retrying singles")
                    single_result = await _fetch_single_commute(
                        client, listing_id, lat, lng, dest_lat, dest_lng,
                        mode, departure_epoch, params["key"],
                    )
                    results[listing_id] = single_result
                else:
                    results[listing_id] = await parse_distance_matrix_element(element, mode)

    return results


async def _fetch_single_commute(
    client: httpx.AsyncClient,
    listing_id: str,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str,
    departure_epoch: Optional[int],
    api_key: str,
) -> dict:
    """Single-origin fallback when batch fails with MAX_ELEMENTS_EXCEEDED."""
    params: dict = {
        "origins": f"{origin_lat},{origin_lng}",
        "destinations": f"{dest_lat},{dest_lng}",
        "mode": mode,
        "key": api_key,
        "units": "imperial",
    }
    if departure_epoch:
        params["departure_time"] = str(departure_epoch)
    try:
        resp = await client.get(GMAPS_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()
        element = data.get("rows", [{}])[0].get("elements", [{}])[0]
        return await parse_distance_matrix_element(element, mode)
    except Exception as exc:
        return {"status": "REQUEST_ERROR", "error": str(exc)}


# ── Seconds to display string ─────────────────────────────────────────────────

def _seconds_to_display(seconds: int) -> str:
    """Convert seconds to human-readable string, e.g. '42 min' or '1 hr 15 min'."""
    if seconds < 3600:
        return f"{seconds // 60} min"
    hours = seconds // 3600
    mins = (seconds % 3600) // 60
    return f"{hours} hr {mins} min" if mins else f"{hours} hr"


# ── Main enrichment function ──────────────────────────────────────────────────

async def enrich_listings_with_commute(
    listings: list[dict],
    dest_lat: float,
    dest_lng: float,
    mode: str,
    departure_epoch: Optional[int],
    db_pool,
    redis_client: aioredis.Redis,
) -> list[dict]:
    """
    For each listing:
    1. Check Redis cache
    2. Check Postgres commute_cache (for warm cache that survived Redis restart)
    3. If cache miss: add to batch for GM API call
    4. Call GM API in batches of 25
    5. Write results to Redis + Postgres
    6. Return listings with commute data attached

    Listings without coordinates are returned with commute_pending=True and
    the batch_commute_enrich Celery task is NOT triggered here (API caller decides).
    """
    dep_epoch = departure_epoch or get_next_monday_830am_epoch()
    dest_lat_r = round(dest_lat, 6)
    dest_lng_r = round(dest_lng, 6)

    # Check circuit breaker
    cb = await redis_client.get("commute:circuit_break")
    if cb:
        logger.warning("Commute service in circuit-break mode — serving cache only")
        for listing in listings:
            listing["commute_pending"] = True
        return listings

    # ── Pass 1: Redis cache check (fast, in-process) ──────────────────────────
    cache_hits: dict[str, dict] = {}
    redis_misses: list[tuple[str, float, float]] = []  # (id, lat, lng) not in Redis
    no_coords: set[str] = set()

    for listing in listings:
        lid = listing["id"]
        lat = listing.get("latitude")
        lng = listing.get("longitude")

        if lat is None or lng is None:
            no_coords.add(lid)
            continue

        redis_key = build_redis_key(lid, dest_lat, dest_lng, mode, dep_epoch)
        cached = await get_commute_from_redis(redis_key, redis_client)
        if cached is not None:
            cache_hits[lid] = cached
        else:
            redis_misses.append((lid, float(lat), float(lng)))

    # ── Pass 2: Single batch Postgres cache query for Redis misses ─────────────
    cache_misses: list[tuple[str, float, float]] = []  # still not in Postgres
    if redis_misses:
        redis_miss_ids = [lid for lid, _, _ in redis_misses]
        redis_miss_coords = {lid: (lat, lng) for lid, lat, lng in redis_misses}

        async with db_pool.acquire() as conn:
            pg_rows = await conn.fetch(
                """
                SELECT listing_id::text, gm_status,
                       duration_seconds, duration_in_traffic_seconds, distance_meters,
                       transfer_count, transit_lines, transit_steps
                FROM cs_commute_cache
                WHERE listing_id = ANY($1::uuid[])
                  AND dest_lat = $2
                  AND dest_lng = $3
                  AND transport_mode = $4
                  AND (departure_epoch = $5 OR (departure_epoch IS NULL AND $5 IS NULL))
                  AND is_valid = TRUE
                  AND expires_at > NOW()
                """,
                redis_miss_ids,
                dest_lat_r,
                dest_lng_r,
                mode,
                dep_epoch,
            )

        pg_found_ids = set()
        for row in pg_rows:
            lid = row["listing_id"]
            pg_cached = {
                "status": row["gm_status"],
                "duration_seconds": row["duration_seconds"],
                "duration_in_traffic_seconds": row["duration_in_traffic_seconds"],
                "distance_meters": row["distance_meters"],
                "transfer_count": row["transfer_count"],
                "transit_lines": list(row["transit_lines"] or []),
                "transit_steps": json.loads(row["transit_steps"]) if row["transit_steps"] else [],
            }
            # Warm Redis from Postgres hit
            redis_key = build_redis_key(lid, dest_lat, dest_lng, mode, dep_epoch)
            await write_commute_to_redis(redis_key, pg_cached, redis_client)
            cache_hits[lid] = pg_cached
            pg_found_ids.add(lid)

        # Remaining listings are true cache misses — need GM API
        for lid, lat, lng in redis_misses:
            if lid not in pg_found_ids:
                cache_misses.append((lid, lat, lng))

    # 3. Batch GM API calls for misses
    gm_results: dict[str, dict] = {}
    if cache_misses:
        gm_results = await batch_fetch_commute(
            cache_misses, dest_lat, dest_lng, mode, dep_epoch
        )

        # 4. Write GM results to Redis + Postgres
        async with db_pool.acquire() as conn:
            for listing_id, result in gm_results.items():
                redis_key = build_redis_key(listing_id, dest_lat, dest_lng, mode, dep_epoch)
                await write_commute_to_redis(redis_key, result, redis_client)

                # Postgres upsert
                transit_steps = result.get("transit_steps")
                try:
                    await conn.execute(
                        UPSERT_COMMUTE_CACHE,
                        listing_id,
                        dest_lat_r,
                        dest_lng_r,
                        None,  # dest_label
                        mode,
                        dep_epoch,
                        result.get("duration_seconds"),
                        result.get("duration_in_traffic_seconds"),
                        result.get("distance_meters"),
                        json.dumps(transit_steps) if transit_steps is not None else None,
                        result.get("transfer_count"),
                        result.get("transit_lines") or [],
                        result.get("status", "UNKNOWN"),
                        json.dumps(result),
                    )
                except Exception as exc:
                    logger.warning("enrich: Postgres cache write failed for %s: %s", listing_id, exc)

    # 5. Attach commute data to listings
    all_commute = {**cache_hits, **gm_results}
    is_peak = departure_epoch is None

    for listing in listings:
        lid = listing["id"]

        if lid in no_coords:
            listing["commute_pending"] = False
            listing["commute"] = None
            continue

        commute_raw = all_commute.get(lid)
        if commute_raw is None:
            listing["commute_pending"] = True
            listing["commute"] = None
            continue

        status = commute_raw.get("status", "UNKNOWN")
        duration = commute_raw.get("duration_seconds")

        if status == "OK" and duration is not None:
            route_steps = commute_raw.get("transit_steps", [])
            transit_lines = commute_raw.get("transit_lines", [])
            transfer_count = commute_raw.get("transfer_count")

            # Build route summary
            if mode == "transit" and transit_lines:
                route_summary = " → ".join(transit_lines)
            else:
                route_summary = None

            from datetime import timezone
            dep_dt = datetime.fromtimestamp(dep_epoch, tz=timezone.utc)

            listing["commute"] = {
                "commute_mode": mode,
                "commute_time_seconds": duration,
                "commute_time_display": _seconds_to_display(duration),
                "distance_meters": commute_raw.get("distance_meters") or 0,
                "num_transfers": transfer_count,
                "route_summary": route_summary,
                "route_steps": route_steps,
                "peak_time_used": is_peak,
                "departure_time_utc": dep_dt.isoformat(),
                "transit_lines": transit_lines,
            }
            listing["commute_pending"] = False
        else:
            # Route not available (ZERO_RESULTS, NOT_FOUND, etc.)
            listing["commute"] = None
            listing["commute_pending"] = False

    return listings
