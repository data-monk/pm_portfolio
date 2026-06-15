"""
Listings router — GET /listings/search, GET /listings/{listing_id}
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from db.connection import get_pool
from dependencies import get_redis
from models.listing import (
    CommuteData,
    ListingDetail,
    ListingWithCommute,
    RouteStep,
    SearchResponse,
)
from services.commute_service import (
    enrich_listings_with_commute,
    get_next_monday_830am_epoch,
)
from services.listings_service import get_listing_by_id, search_listings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["listings"])

# Limiter instance (shares storage_uri with the one in main.py via app.state.limiter)
limiter = Limiter(key_func=get_remote_address)


def _row_to_listing_dict(row: dict) -> dict:
    """Convert a raw DB row dict to a dict matching ListingWithCommute fields."""
    commute = None
    commute_pending = False

    if row.get("duration_seconds") is not None and row.get("gm_status") == "OK":
        transit_steps_raw = row.get("transit_steps")
        route_steps = []
        if transit_steps_raw:
            try:
                steps_list = json.loads(transit_steps_raw) if isinstance(transit_steps_raw, str) else transit_steps_raw
                for i, step in enumerate(steps_list):
                    route_steps.append(RouteStep(
                        step_index=step.get("step_index", i),
                        mode=step.get("mode", "walking"),
                        instruction=step.get("instruction", ""),
                        duration_seconds=step.get("duration_seconds") or 0,
                        distance_meters=step.get("distance_meters") or 0,
                        transit_line=step.get("transit_line"),
                        transit_vehicle_type=step.get("transit_vehicle_type"),
                        departure_stop=step.get("departure_stop"),
                        arrival_stop=step.get("arrival_stop"),
                    ))
            except Exception as exc:
                logger.debug("route step parse error: %s", exc)

        transit_lines = list(row.get("transit_lines") or [])
        duration = row["duration_seconds"]

        def _fmt(s: int) -> str:
            if s < 3600:
                return f"{s // 60} min"
            h = s // 3600
            m = (s % 3600) // 60
            return f"{h} hr {m} min" if m else f"{h} hr"

        commute = CommuteData(
            commute_mode=row.get("mode", "transit"),
            commute_time_seconds=duration,
            commute_time_display=_fmt(duration),
            distance_meters=row.get("distance_meters") or 0,
            num_transfers=row.get("transfer_count"),
            route_summary=" → ".join(transit_lines) if transit_lines else None,
            route_steps=route_steps,
            peak_time_used=True,
            departure_time_utc="",
            transit_lines=transit_lines,
        )
    elif row.get("latitude") is not None:
        commute_pending = True

    price = float(row.get("price") or 0)
    image_urls = list(row.get("image_urls") or [])

    return {
        "id": str(row.get("id") or ""),
        "external_id": str(row.get("external_id") or ""),
        "source": row.get("source") or "",
        "listing_url": row.get("listing_url") or "",
        "address_line1": row.get("address_line1"),
        "address_line2": row.get("address_line2"),
        "city": row.get("city") or "",
        "state": row.get("state") or "",
        "zip_code": row.get("zip_code"),
        "neighborhood": row.get("neighborhood"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "listing_type": row.get("listing_type") or "rental",
        "property_type": row.get("property_type"),
        "bedrooms": row.get("bedrooms"),
        "bathrooms": row.get("bathrooms"),
        "square_feet": row.get("square_feet"),
        "floor_number": row.get("floor_number"),
        "year_built": row.get("year_built"),
        "price": price,
        "price_monthly_cents": int(price * 100),
        "deposit": row.get("deposit"),
        "fee_type": row.get("fee_type"),
        "has_doorman": bool(row.get("has_doorman")),
        "has_elevator": bool(row.get("has_elevator")),
        "has_gym": bool(row.get("has_gym")),
        "has_laundry_in_unit": bool(row.get("has_laundry_in_unit")),
        "has_laundry_in_bldg": bool(row.get("has_laundry_in_bldg")),
        "has_dishwasher": bool(row.get("has_dishwasher")),
        "has_ac": bool(row.get("has_ac")),
        "pets_allowed": row.get("pets_allowed"),
        "has_outdoor_space": bool(row.get("has_outdoor_space")),
        "image_urls": image_urls,
        "thumbnail_url": image_urls[0] if image_urls else None,
        "description": row.get("description"),
        "available_date": row.get("available_date"),
        "amenities": [],
        "is_active": bool(row.get("is_active", True)),
        "scraped_at": row.get("scraped_at"),
        "last_seen_at": row.get("last_seen_at"),
        "commute": commute,
        "commute_pending": commute_pending,
    }


@router.get("/search", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    destination_lat: Optional[float] = Query(None, description="Destination latitude"),
    destination_lng: Optional[float] = Query(None, description="Destination longitude"),
    mode: str = Query("transit", description="Commute mode"),
    max_commute: int = Query(2700, description="Max commute seconds (default 45 min)"),
    max_transfers: Optional[int] = Query(None, description="Max transit transfers"),
    min_price: Optional[float] = Query(None, description="Min monthly rent ($)"),
    max_price: Optional[float] = Query(None, description="Max monthly rent ($)"),
    min_bedrooms: Optional[float] = Query(None, description="Min bedrooms (0=studio)"),
    min_bathrooms: Optional[float] = Query(None, description="Min bathrooms"),
    pets_allowed: Optional[bool] = Query(None, description="Pets allowed filter"),
    sources: Optional[str] = Query(None, description="Comma-separated source names"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, le=50, description="Results per page"),
    sort: str = Query("commute_asc", description="Sort order"),
    departure_epoch: Optional[int] = Query(None, description="Departure time (Unix epoch)"),
    pool=Depends(get_pool),
    redis=Depends(get_redis),
):
    """
    Search listings with optional commute enrichment.
    When destination is provided, listings are ranked by commute time (default).
    Commute data is fetched from Redis/Postgres cache or Google Distance Matrix API.
    """
    # Validate mode
    valid_modes = {"transit", "driving", "walking", "bicycling"}
    if mode not in valid_modes:
        mode = "transit"

    sources_list = [s.strip() for s in sources.split(",")] if sources else None

    # Reject departure times in the past — Google Distance Matrix returns INVALID_REQUEST
    import time as _time
    if departure_epoch is not None and departure_epoch < int(_time.time()):
        departure_epoch = None  # Fall back to peak-hour default

    dep_epoch = departure_epoch or (get_next_monday_830am_epoch() if destination_lat else None)

    filters = {
        "destination_lat": destination_lat,
        "destination_lng": destination_lng,
        "mode": mode,
        "departure_epoch": dep_epoch,
        "max_commute": max_commute if destination_lat else None,
        "max_transfers": max_transfers,
        "min_price": min_price,
        "max_price": max_price,
        "min_bedrooms": min_bedrooms,
        "min_bathrooms": min_bathrooms,
        "pets_allowed": pets_allowed,
        "sources": sources_list,
        "page": page,
        "page_size": page_size,
        "sort": sort,
    }

    raw_listings, total = await search_listings(filters, pool)

    listing_dicts = [_row_to_listing_dict(r) for r in raw_listings]

    # Enrich with commute data if destination provided and commute data not already in DB join
    if destination_lat is not None and destination_lng is not None:
        needs_enrichment = [
            ld for ld in listing_dicts
            if ld.get("commute") is None and ld.get("latitude") is not None
        ]
        if needs_enrichment:
            enriched = await enrich_listings_with_commute(
                needs_enrichment,
                destination_lat,
                destination_lng,
                mode,
                dep_epoch,
                pool,
                redis,
            )
            # Merge enriched back
            enriched_by_id = {e["id"]: e for e in enriched}
            for ld in listing_dicts:
                if ld["id"] in enriched_by_id:
                    ld.update(enriched_by_id[ld["id"]])

    # Build Pydantic objects
    listing_objs = [ListingWithCommute(**ld) for ld in listing_dicts]

    pages = max(1, (total + page_size - 1) // page_size)

    # Determine source availability
    all_sources = ["zillow", "apartments_com", "streeteasy", "facebook_marketplace"]
    present_sources = list({ld["source"] for ld in listing_dicts})
    unavailable = [s for s in all_sources if s not in present_sources]

    return SearchResponse(
        listings=listing_objs,
        total=total,
        page=page,
        pages=pages,
        sources_available=present_sources,
        sources_unavailable=unavailable,
    )


@router.get("/{listing_id}", response_model=ListingDetail)
@limiter.limit("60/minute")
async def get_listing(
    request: Request,
    listing_id: str,
    destination_lat: Optional[float] = Query(None),
    destination_lng: Optional[float] = Query(None),
    mode: str = Query("transit"),
    departure_epoch: Optional[int] = Query(None),
    pool=Depends(get_pool),
    redis=Depends(get_redis),
):
    """
    Get a single listing by ID with full detail and commute breakdown.
    """
    import time as _time
    if departure_epoch is not None and departure_epoch < int(_time.time()):
        departure_epoch = None  # Fall back to peak-hour default
    dep_epoch = departure_epoch or (get_next_monday_830am_epoch() if destination_lat else None)

    row = await get_listing_by_id(
        listing_id, pool,
        dest_lat=destination_lat,
        dest_lng=destination_lng,
        mode=mode,
        departure_epoch=dep_epoch,
    )

    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Listing not found")

    listing_dict = _row_to_listing_dict(row)

    # Enrich if commute not in cache
    if (
        destination_lat is not None
        and destination_lng is not None
        and listing_dict.get("commute") is None
        and listing_dict.get("latitude") is not None
    ):
        enriched = await enrich_listings_with_commute(
            [listing_dict],
            destination_lat,
            destination_lng,
            mode,
            dep_epoch,
            pool,
            redis,
        )
        if enriched:
            listing_dict = enriched[0]

    # Add raw_metadata for detail view
    listing_dict["raw_metadata"] = row.get("raw_metadata")

    return ListingDetail(**listing_dict)
