"""
ListingsService — parameterized SQL builder for listing search with Haversine radius + commute filters.
No PostGIS dependency — uses bounding-box index + Haversine formula for spatial filtering.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from db.queries import SEARCH_LISTINGS_BASE, COUNT_LISTINGS_BASE

logger = logging.getLogger(__name__)

# Valid sort options → SQL ORDER BY clauses
SORT_OPTIONS = {
    "commute_asc": "cc.duration_seconds ASC NULLS LAST, l.price ASC",
    "price_asc":   "l.price ASC",
    "price_desc":  "l.price DESC",
    "newest":      "l.first_seen_at DESC",
}


def _build_where_clauses(
    filters: dict,
    base_params: int = 4,  # First 4 params are commute join params ($1-$4)
) -> tuple[list[str], list[Any], int]:
    """
    Build WHERE clause fragments and positional parameter list.
    Returns: (where_clauses, params, next_param_idx)
    """
    clauses: list[str] = ["l.is_active = TRUE"]
    params: list[Any] = []
    n = base_params + 1  # Start after the commute join params

    # Destination radius filter — bounding box first (uses index), then Haversine
    dest_lat = filters.get("destination_lat")
    dest_lng = filters.get("destination_lng")
    if dest_lat is not None and dest_lng is not None:
        # Bounding box pre-filter (≈±50km at NYC latitude)
        clauses.append(
            f"l.latitude  BETWEEN (${n}::float - 0.45) AND (${n}::float + 0.45)"
        )
        clauses.append(
            f"l.longitude BETWEEN (${n+1}::float - 0.55) AND (${n+1}::float + 0.55)"
        )
        # Exact Haversine check within 50km
        clauses.append(f"""
            6371000.0 * acos(LEAST(1.0,
                cos(radians(l.latitude)) * cos(radians(${n}::float))
                * cos(radians(l.longitude) - radians(${n+1}::float))
                + sin(radians(l.latitude)) * sin(radians(${n}::float))
            )) <= 50000
        """)
        params.append(float(dest_lat))   # $n
        params.append(float(dest_lng))   # $n+1
        n += 2

    # Price filters
    min_price = filters.get("min_price")
    if min_price is not None:
        clauses.append(f"l.price >= ${n}")
        params.append(float(min_price))
        n += 1

    max_price = filters.get("max_price")
    if max_price is not None:
        clauses.append(f"l.price <= ${n}")
        params.append(float(max_price))
        n += 1

    # Bedroom filter
    min_bedrooms = filters.get("min_bedrooms")
    if min_bedrooms is not None:
        clauses.append(f"l.bedrooms >= ${n}")
        params.append(float(min_bedrooms))
        n += 1

    # Bathroom filter
    min_bathrooms = filters.get("min_bathrooms")
    if min_bathrooms is not None:
        clauses.append(f"l.bathrooms >= ${n}")
        params.append(float(min_bathrooms))
        n += 1

    # Pets allowed
    pets_allowed = filters.get("pets_allowed")
    if pets_allowed is not None:
        clauses.append(f"l.pets_allowed = ${n}")
        params.append(bool(pets_allowed))
        n += 1

    # Neighborhood filter (case-insensitive partial match)
    neighborhood = filters.get("neighborhood")
    if neighborhood:
        clauses.append(f"l.neighborhood ILIKE ${n}")
        params.append(f"%{neighborhood}%")
        n += 1

    # Source filter
    sources = filters.get("sources")
    if sources:
        placeholders = ", ".join(f"${n + i}" for i in range(len(sources)))
        clauses.append(f"s.name IN ({placeholders})")
        params.extend(sources)
        n += len(sources)

    return clauses, params, n


async def search_listings(
    filters: dict,
    pool,
) -> tuple[list[dict], int]:
    """
    Execute a parameterized listing search with optional PostGIS radius and commute filters.

    filters keys:
      destination_lat, destination_lng, mode, departure_epoch,
      max_commute, max_transfers,
      min_price, max_price, min_bedrooms, min_bathrooms,
      pets_allowed, sources,
      page, page_size, sort

    Returns: (listings_as_dicts, total_count)
    """
    dest_lat = filters.get("destination_lat", 0.0) or 0.0
    dest_lng = filters.get("destination_lng", 0.0) or 0.0
    mode = filters.get("mode", "transit")
    departure_epoch = filters.get("departure_epoch")
    page = max(1, int(filters.get("page", 1)))
    page_size = min(50, max(1, int(filters.get("page_size", 20))))
    sort_key = filters.get("sort", "commute_asc")
    order_by = SORT_OPTIONS.get(sort_key, SORT_OPTIONS["commute_asc"])

    # Commute join params are always $1–$4
    commute_join_params: list[Any] = [dest_lat, dest_lng, mode, departure_epoch]

    # Build WHERE fragments
    where_clauses, filter_params, next_n = _build_where_clauses(filters, base_params=4)

    where_sql = "WHERE " + "\n  AND ".join(where_clauses)

    # Post-join commute filters (applied after LEFT JOIN resolves)
    # Use parameterized placeholders — next_n tracks the current parameter index
    max_commute = filters.get("max_commute")
    if max_commute is not None and dest_lat and dest_lng:
        # Only filter by commute if destination provided AND commute data is present
        where_sql += f"\n  AND (cc.duration_seconds IS NULL OR cc.duration_seconds <= ${next_n})"
        filter_params.append(int(max_commute))
        next_n += 1

    max_transfers = filters.get("max_transfers")
    if max_transfers is not None and mode == "transit":
        where_sql += f"\n  AND (cc.transfer_count IS NULL OR cc.transfer_count <= ${next_n})"
        filter_params.append(int(max_transfers))
        next_n += 1

    # Combine all params: commute join + filter
    all_params = commute_join_params + filter_params
    limit_offset_params = [page_size, (page - 1) * page_size]
    limit_n = next_n
    offset_n = next_n + 1

    search_sql = f"""
{SEARCH_LISTINGS_BASE}
{where_sql}
ORDER BY {order_by}
LIMIT ${limit_n} OFFSET ${offset_n}
"""
    count_sql = f"""
{COUNT_LISTINGS_BASE}
{where_sql}
"""

    all_params_search = all_params + limit_offset_params
    all_params_count = all_params

    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(search_sql, *all_params_search)
            count_row = await conn.fetchrow(count_sql, *all_params_count)
        except Exception as exc:
            logger.error("search_listings SQL error: %s", exc, exc_info=True)
            raise

    total = count_row["total"] if count_row else 0
    listings = [dict(row) for row in rows]

    return listings, total


async def get_listing_by_id(
    listing_id: str,
    pool,
    dest_lat: Optional[float] = None,
    dest_lng: Optional[float] = None,
    mode: str = "transit",
    departure_epoch: Optional[int] = None,
) -> Optional[dict]:
    """Fetch a single listing by UUID with optional commute join."""
    from db.queries import GET_LISTING_BY_ID

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            GET_LISTING_BY_ID,
            listing_id,
            dest_lat or 0.0,
            dest_lng or 0.0,
            mode,
            departure_epoch,
        )
    return dict(row) if row else None
