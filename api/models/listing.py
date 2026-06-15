"""
Pydantic v2 response models for CommuteFirst API.
Field names mirror the TypeScript interfaces in client/src/apps/app-5-commute-search/lib/types.ts
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Commute sub-models ────────────────────────────────────────────────────────

class RouteStep(BaseModel):
    step_index: int = 0
    mode: str  # 'transit' | 'driving' | 'walking' | 'bicycling'
    instruction: str = ""
    duration_seconds: int = 0
    distance_meters: int = 0
    transit_line: Optional[str] = None
    transit_vehicle_type: Optional[str] = None
    departure_stop: Optional[str] = None
    arrival_stop: Optional[str] = None


class CommuteData(BaseModel):
    commute_mode: str
    commute_time_seconds: int
    commute_time_display: str
    distance_meters: int = 0
    num_transfers: Optional[int] = None
    route_summary: Optional[str] = None
    route_steps: list[RouteStep] = Field(default_factory=list)
    peak_time_used: bool = False
    departure_time_utc: str = ""
    transit_lines: list[str] = Field(default_factory=list)


# ── Listing models ────────────────────────────────────────────────────────────

class ListingBase(BaseModel):
    id: str
    external_id: str
    source: str
    listing_url: str

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    listing_type: str = "rental"
    property_type: Optional[str] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    floor_number: Optional[int] = None
    year_built: Optional[int] = None

    price: float
    price_monthly_cents: int = 0
    deposit: Optional[float] = None
    fee_type: Optional[str] = None

    has_doorman: bool = False
    has_elevator: bool = False
    has_gym: bool = False
    has_laundry_in_unit: bool = False
    has_laundry_in_bldg: bool = False
    has_dishwasher: bool = False
    has_ac: bool = False
    pets_allowed: Optional[bool] = None
    has_outdoor_space: bool = False

    image_urls: list[str] = Field(default_factory=list)
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    available_date: Optional[date] = None
    amenities: list[str] = Field(default_factory=list)

    is_active: bool = True
    scraped_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    @field_validator("price_monthly_cents", mode="before")
    @classmethod
    def compute_monthly_cents(cls, v, info):
        """Compute price_monthly_cents from price if not provided."""
        if v == 0 and "price" in (info.data or {}):
            return int(info.data["price"] * 100)
        return v

    @field_validator("thumbnail_url", mode="before")
    @classmethod
    def pick_thumbnail(cls, v, info):
        """Use first image_url as thumbnail if not explicitly set."""
        if v is None:
            image_urls = (info.data or {}).get("image_urls", [])
            return image_urls[0] if image_urls else None
        return v

    model_config = {"populate_by_name": True}


class ListingWithCommute(ListingBase):
    """Listing with optional cached commute data."""
    commute: Optional[CommuteData] = None
    commute_pending: bool = False  # True when commute is being calculated async


class ListingDetail(ListingWithCommute):
    """Full listing detail — includes route_steps and raw metadata."""
    raw_metadata: Optional[dict[str, Any]] = None


# ── Search response ───────────────────────────────────────────────────────────

class SearchResponse(BaseModel):
    listings: list[ListingWithCommute]
    total: int
    page: int
    pages: int
    sources_available: list[str] = Field(default_factory=list)
    sources_unavailable: list[str] = Field(default_factory=list)


# ── Saved listing ─────────────────────────────────────────────────────────────

class SavedListing(BaseModel):
    id: str
    listing_id: str
    session_token: str
    notes: Optional[str] = None
    saved_at: datetime
    listing: ListingWithCommute
