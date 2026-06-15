"""
Commute request/response models for the CommuteFirst API.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from models.listing import CommuteData


class CommuteRequest(BaseModel):
    """Request body for batch commute enrichment."""
    dest_lat: float = Field(..., description="Destination latitude")
    dest_lng: float = Field(..., description="Destination longitude")
    mode: str = Field("transit", description="Commute mode: transit | driving | walking | bicycling")
    departure_epoch: Optional[int] = Field(
        None,
        description="Unix epoch for departure time. If None, uses next Monday 8:30 AM.",
    )
    listing_ids: list[str] = Field(..., description="List of listing UUIDs to enrich")

    model_config = {"json_schema_extra": {
        "example": {
            "dest_lat": 40.7580,
            "dest_lng": -73.9855,
            "mode": "transit",
            "departure_epoch": None,
            "listing_ids": [
                "550e8400-e29b-41d4-a716-446655440001",
                "550e8400-e29b-41d4-a716-446655440002",
            ],
        }
    }}


class CommuteResponse(BaseModel):
    """
    Maps listing_id → CommuteData (or None if unavailable).
    A None value means the commute data is not yet computed (commute_pending=True).
    """
    results: dict[str, Optional[CommuteData]] = Field(default_factory=dict)
    pending_ids: list[str] = Field(
        default_factory=list,
        description="Listing IDs whose commute data is being computed asynchronously",
    )
