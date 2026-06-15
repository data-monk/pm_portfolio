"""
Saved listings router — POST/GET/DELETE /saved
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from db.connection import get_pool
from db.queries import DELETE_SAVED_LISTING, GET_SAVED_LISTINGS, SAVE_LISTING
from dependencies import get_redis
from models.listing import ListingWithCommute, SavedListing
from routers.listings import _row_to_listing_dict
from services.commute_service import get_next_monday_830am_epoch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/saved", tags=["saved"])


@router.post("/", status_code=201)
async def save_listing(
    session_token: UUID = Query(..., description="Client session UUID"),
    listing_id: UUID = Query(..., description="Listing UUID to save"),
    pool=Depends(get_pool),
):
    """
    Save a listing to the user's session.
    Idempotent — saving the same listing twice is a no-op.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            SAVE_LISTING,
            str(session_token),
            str(listing_id),
        )

    if row is None:
        # ON CONFLICT DO NOTHING — already saved
        return {"message": "Already saved", "listing_id": str(listing_id)}

    return {"id": row["id"], "listing_id": str(listing_id), "message": "Saved"}


@router.get("/", response_model=list[SavedListing])
async def get_saved(
    session_token: UUID = Query(..., description="Client session UUID"),
    destination_lat: float | None = Query(None),
    destination_lng: float | None = Query(None),
    mode: str = Query("transit"),
    departure_epoch: int | None = Query(None),
    pool=Depends(get_pool),
    redis=Depends(get_redis),
):
    """
    Get all saved listings for a session, with optional commute data.
    """
    dep_epoch = departure_epoch or (get_next_monday_830am_epoch() if destination_lat else None)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            GET_SAVED_LISTINGS,
            str(session_token),
            destination_lat or 0.0,
            destination_lng or 0.0,
            mode,
            dep_epoch,
        )

    if not rows:
        return []

    result = []
    for row in rows:
        listing_dict = _row_to_listing_dict(dict(row))
        listing_obj = ListingWithCommute(**listing_dict)
        result.append(SavedListing(
            id=str(row["saved_id"]),
            listing_id=str(row["listing_id"]),
            session_token=str(row["session_token"]),
            notes=row.get("notes"),
            saved_at=row["saved_at"],
            listing=listing_obj,
        ))

    return result


@router.delete("/{listing_id}", status_code=200)
async def unsave_listing(
    listing_id: UUID,
    session_token: UUID = Query(..., description="Client session UUID"),
    pool=Depends(get_pool),
):
    """
    Remove a listing from the user's saved list.
    Returns 404 if the listing was not saved.
    """
    async with pool.acquire() as conn:
        result = await conn.execute(
            DELETE_SAVED_LISTING,
            str(session_token),
            str(listing_id),
        )

    # asyncpg returns "DELETE N"
    deleted = int(result.split()[-1]) if result else 0
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Saved listing not found")

    return {"message": "Removed", "listing_id": str(listing_id)}
