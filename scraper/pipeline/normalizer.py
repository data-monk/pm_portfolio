"""
Pydantic v2 normalizer — maps raw scraper dicts to canonical cs_listings schema.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, date
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Continental US bounding box ──────────────────────────────────────────────
US_LAT_MIN, US_LAT_MAX = 24.396308, 49.384358
US_LNG_MIN, US_LNG_MAX = -124.848974, -66.885444


def _is_valid_us_coord(lat: float, lng: float) -> bool:
    return (US_LAT_MIN <= lat <= US_LAT_MAX) and (US_LNG_MIN <= lng <= US_LNG_MAX)


# ── Price normalization ───────────────────────────────────────────────────────

def _parse_price(value: Any) -> Optional[float]:
    """Handle '$3,200/mo', '$3,200', '3200', 3200, 3200.0 → float or None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        price = float(value)
        return price if price > 0 else None
    s = str(value).strip()
    # Remove currency symbols, commas, spaces
    s = re.sub(r'[$,\s]', '', s)
    # Remove suffixes like /mo, /month, /week
    s = re.sub(r'/(mo|month|week|wk).*$', '', s, flags=re.IGNORECASE)
    try:
        price = float(s)
        return price if price > 0 else None
    except ValueError:
        return None


# ── Bedroom normalization ─────────────────────────────────────────────────────

def _parse_bedrooms(value: Any) -> Optional[float]:
    """Handle 'Studio', '0', '1BR', '1 bed', '1 bedroom', 1, 1.0 → float or None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().lower()
    if s in ('studio', '0br', 'efficiency'):
        return 0.0
    # Remove non-numeric suffixes
    match = re.match(r'^(\d+(?:\.\d+)?)', s)
    if match:
        return float(match.group(1))
    return None


# ── Bathroom normalization ────────────────────────────────────────────────────

def _parse_bathrooms(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().lower()
    match = re.match(r'^(\d+(?:\.\d+)?)', s)
    if match:
        return float(match.group(1))
    return None


# ── Square feet normalization ─────────────────────────────────────────────────

def _parse_sqft(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    s = re.sub(r'[,\s]', '', str(value))
    match = re.match(r'^(\d+)', s)
    if match:
        sqft = int(match.group(1))
        return sqft if sqft > 0 else None
    return None


# ── Boolean coercion ──────────────────────────────────────────────────────────

def _parse_bool(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    s = str(value).lower().strip()
    if s in ('true', 'yes', '1', 'y'):
        return True
    if s in ('false', 'no', '0', 'n'):
        return False
    return None


# ── Image URL list ────────────────────────────────────────────────────────────

def _parse_image_urls(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(u) for u in value if u]
    if isinstance(value, str):
        return [value] if value else []
    return []


# ── Raw listing model (accepts everything) ────────────────────────────────────

class RawListing(BaseModel):
    """Loose model — accepts any field types from any scraper."""
    model_config = {"extra": "allow"}

    # Identity
    external_id: Optional[str] = None
    source: Optional[str] = None

    # Location
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    latitude: Optional[Any] = None
    longitude: Optional[Any] = None

    # Property
    listing_type: Optional[str] = "rental"
    property_type: Optional[str] = None
    bedrooms: Optional[Any] = None
    bathrooms: Optional[Any] = None
    square_feet: Optional[Any] = None
    floor_number: Optional[Any] = None
    year_built: Optional[Any] = None

    # Pricing
    price: Optional[Any] = None
    deposit: Optional[Any] = None
    fee_type: Optional[str] = None

    # Amenities
    has_doorman: Optional[Any] = None
    has_elevator: Optional[Any] = None
    has_gym: Optional[Any] = None
    has_laundry_in_unit: Optional[Any] = None
    has_laundry_in_bldg: Optional[Any] = None
    has_dishwasher: Optional[Any] = None
    has_ac: Optional[Any] = None
    pets_allowed: Optional[Any] = None
    has_outdoor_space: Optional[Any] = None

    # Content
    listing_url: Optional[str] = None
    image_urls: Optional[Any] = None
    description: Optional[str] = None
    available_date: Optional[Any] = None

    # Timestamps
    listed_at: Optional[Any] = None

    # Raw pass-through
    raw_metadata: Optional[dict] = None


# ── Normalized listing model (strict) ────────────────────────────────────────

class NormalizedListing(BaseModel):
    """Canonical schema matching cs_listings table columns."""

    external_id: str
    source_name: str  # used to look up source_id in DB

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

    listing_url: str
    image_urls: list[str] = Field(default_factory=list)
    description: Optional[str] = None
    available_date: Optional[date] = None
    listed_at: Optional[datetime] = None

    raw_metadata: dict = Field(default_factory=dict)


# ── Per-source field mappers ──────────────────────────────────────────────────

def _map_apartments_com(raw: dict) -> dict:
    """
    Apartments.com cards expose fields like:
    title, price, address, beds, baths, sqft, url, description, images, amenities
    """
    amenities = raw.get("amenities", [])
    if isinstance(amenities, str):
        amenities = [a.strip() for a in amenities.split(",")]

    return {
        "external_id": raw.get("external_id") or raw.get("id") or raw.get("listing_id", ""),
        "address_line1": raw.get("address") or raw.get("address_line1"),
        "city": raw.get("city", "New York"),
        "state": raw.get("state", "NY"),
        "zip_code": raw.get("zip_code") or raw.get("zip"),
        "neighborhood": raw.get("neighborhood"),
        "latitude": raw.get("latitude") or raw.get("lat"),
        "longitude": raw.get("longitude") or raw.get("lng") or raw.get("lon"),
        "bedrooms": raw.get("beds") or raw.get("bedrooms"),
        "bathrooms": raw.get("baths") or raw.get("bathrooms"),
        "square_feet": raw.get("sqft") or raw.get("square_feet"),
        "price": raw.get("price"),
        "deposit": raw.get("deposit"),
        "fee_type": raw.get("fee_type"),
        "listing_url": raw.get("url") or raw.get("listing_url", ""),
        "image_urls": raw.get("images") or raw.get("image_urls", []),
        "description": raw.get("description"),
        "has_doorman": "doorman" in str(amenities).lower(),
        "has_elevator": "elevator" in str(amenities).lower(),
        "has_gym": any(w in str(amenities).lower() for w in ("gym", "fitness")),
        "has_laundry_in_unit": "in-unit laundry" in str(amenities).lower() or "washer/dryer" in str(amenities).lower(),
        "has_laundry_in_bldg": "laundry in building" in str(amenities).lower(),
        "has_dishwasher": "dishwasher" in str(amenities).lower(),
        "has_ac": "air conditioning" in str(amenities).lower() or "a/c" in str(amenities).lower(),
        "pets_allowed": raw.get("pets_allowed"),
        "has_outdoor_space": any(w in str(amenities).lower() for w in ("balcony", "terrace", "outdoor", "patio")),
        "available_date": raw.get("available_date"),
        "listed_at": raw.get("listed_at"),
        "raw_metadata": raw,
    }


def _map_streeteasy(raw: dict) -> dict:
    """
    StreetEasy XHR JSON uses camelCase fields:
    listingId, priceChanges, price, bedroomCount, bathroomCount, area (sqft),
    buildingName, areaName (neighborhood), address, latitude, longitude
    """
    address_parts = raw.get("address", {})
    if isinstance(address_parts, str):
        address_line1 = address_parts
        city, state, zipcode = "New York", "NY", None
    else:
        address_line1 = address_parts.get("streetAddress") or address_parts.get("line1")
        city = address_parts.get("city", "New York")
        state = address_parts.get("state", "NY")
        zipcode = address_parts.get("zip") or address_parts.get("postalCode")

    amenities_raw = raw.get("amenities", [])

    return {
        "external_id": str(raw.get("listingId") or raw.get("id", "")),
        "address_line1": address_line1,
        "city": city,
        "state": state,
        "zip_code": zipcode,
        "neighborhood": raw.get("areaName") or raw.get("neighborhood"),
        "latitude": raw.get("latitude") or raw.get("lat"),
        "longitude": raw.get("longitude") or raw.get("lng"),
        "bedrooms": raw.get("bedroomCount") or raw.get("bedrooms"),
        "bathrooms": raw.get("bathroomCount") or raw.get("bathrooms"),
        "square_feet": raw.get("area") or raw.get("squareFeet") or raw.get("square_feet"),
        "price": raw.get("price") or raw.get("listingPrice"),
        "deposit": raw.get("deposit"),
        "fee_type": "no_fee" if raw.get("noFee") else raw.get("feeType"),
        "listing_url": raw.get("listingUrl") or raw.get("url", ""),
        "image_urls": raw.get("photoUrls") or raw.get("images") or [],
        "description": raw.get("description") or raw.get("listingDescription"),
        "has_doorman": raw.get("hasDoorman", False),
        "has_elevator": raw.get("hasElevator", False),
        "has_gym": raw.get("hasGym", False),
        "has_laundry_in_unit": raw.get("hasLaundryInUnit", False),
        "has_laundry_in_bldg": raw.get("hasLaundryInBuilding", False),
        "has_dishwasher": raw.get("hasDishwasher", False),
        "has_ac": raw.get("hasAC") or raw.get("hasCentralAC", False),
        "pets_allowed": raw.get("petsAllowed"),
        "has_outdoor_space": raw.get("hasOutdoorSpace", False),
        "available_date": raw.get("availableDate") or raw.get("dateAvailable"),
        "listed_at": raw.get("listedAt") or raw.get("datePosted"),
        "raw_metadata": raw,
    }


def _map_zillow(raw: dict) -> dict:
    """
    Zillow __NEXT_DATA__ listResults entries use hdpData and top-level fields:
    zpid, address, latLong, price, beds, baths, area, detailUrl, imgSrc
    """
    # Handle nested hdpData wrapper
    hpd = raw.get("hdpData", {}) or {}
    home_info = hpd.get("homeInfo", {}) or {}

    lat = (raw.get("latLong") or {}).get("latitude") or home_info.get("latitude") or raw.get("latitude")
    lng = (raw.get("latLong") or {}).get("longitude") or home_info.get("longitude") or raw.get("longitude")

    address_raw = raw.get("address") or home_info.get("streetAddress", "")
    city = home_info.get("city") or raw.get("city", "New York")
    state = home_info.get("state") or raw.get("state", "NY")
    zipcode = home_info.get("zipcode") or raw.get("zip_code")

    detail_url = raw.get("detailUrl") or raw.get("listing_url", "")
    if detail_url and not detail_url.startswith("http"):
        detail_url = f"https://www.zillow.com{detail_url}"

    img_src = raw.get("imgSrc")
    images = [img_src] if img_src else raw.get("image_urls", [])

    # Zillow price can be inside hdpData or top-level
    price = raw.get("price") or home_info.get("price") or raw.get("unformattedPrice")

    return {
        "external_id": str(raw.get("zpid") or raw.get("id", "")),
        "address_line1": address_raw,
        "city": city,
        "state": state,
        "zip_code": zipcode,
        "neighborhood": raw.get("neighborhood") or home_info.get("neighborhood"),
        "latitude": lat,
        "longitude": lng,
        "bedrooms": raw.get("beds") or home_info.get("bedrooms"),
        "bathrooms": raw.get("baths") or home_info.get("bathrooms"),
        "square_feet": raw.get("area") or home_info.get("livingArea"),
        "price": price,
        "deposit": raw.get("deposit"),
        "fee_type": raw.get("fee_type"),
        "listing_url": detail_url,
        "image_urls": images,
        "description": raw.get("description") or home_info.get("description"),
        "has_doorman": raw.get("has_doorman", False),
        "has_elevator": raw.get("has_elevator", False),
        "has_gym": raw.get("has_gym", False),
        "has_laundry_in_unit": raw.get("has_laundry_in_unit", False),
        "has_laundry_in_bldg": raw.get("has_laundry_in_bldg", False),
        "has_dishwasher": raw.get("has_dishwasher", False),
        "has_ac": raw.get("has_ac", False),
        "pets_allowed": raw.get("pets_allowed"),
        "has_outdoor_space": raw.get("has_outdoor_space", False),
        "available_date": raw.get("available_date"),
        "listed_at": raw.get("listed_at") or home_info.get("dateSold"),
        "raw_metadata": raw,
    }


def _map_facebook(raw: dict) -> dict:
    """
    Facebook Marketplace listing from __bbox.require JSON.
    Fields: id, title, price.amount, location, description, image_urls, pets_allowed
    """
    location = raw.get("location", {}) or {}
    price_obj = raw.get("price", {}) or {}

    price = price_obj.get("amount") or raw.get("price")

    return {
        "external_id": str(raw.get("id") or raw.get("listing_id", "")),
        "address_line1": location.get("address") or raw.get("address_line1"),
        "city": location.get("city") or raw.get("city", "New York"),
        "state": location.get("state") or raw.get("state", "NY"),
        "zip_code": location.get("zip") or raw.get("zip_code"),
        "neighborhood": location.get("neighborhood") or raw.get("neighborhood"),
        "latitude": location.get("latitude") or raw.get("latitude"),
        "longitude": location.get("longitude") or raw.get("longitude"),
        "bedrooms": raw.get("bedrooms") or raw.get("beds"),
        "bathrooms": raw.get("bathrooms") or raw.get("baths"),
        "square_feet": raw.get("square_feet") or raw.get("area"),
        "price": price,
        "deposit": raw.get("deposit"),
        "fee_type": raw.get("fee_type"),
        "listing_url": raw.get("url") or raw.get("listing_url", ""),
        "image_urls": raw.get("image_urls") or raw.get("images", []),
        "description": raw.get("description") or raw.get("title"),
        "has_doorman": raw.get("has_doorman", False),
        "has_elevator": raw.get("has_elevator", False),
        "has_gym": raw.get("has_gym", False),
        "has_laundry_in_unit": raw.get("has_laundry_in_unit", False),
        "has_laundry_in_bldg": raw.get("has_laundry_in_bldg", False),
        "has_dishwasher": raw.get("has_dishwasher", False),
        "has_ac": raw.get("has_ac", False),
        "pets_allowed": raw.get("pets_allowed"),
        "has_outdoor_space": raw.get("has_outdoor_space", False),
        "available_date": raw.get("available_date"),
        "listed_at": raw.get("listed_at") or raw.get("posted_at"),
        "raw_metadata": raw,
    }


SOURCE_MAPPERS = {
    "apartments_com": _map_apartments_com,
    "streeteasy": _map_streeteasy,
    "zillow": _map_zillow,
    "facebook_marketplace": _map_facebook,
}


# ── Main normalize function ───────────────────────────────────────────────────

def normalize(raw: RawListing | dict, source: str) -> Optional[NormalizedListing]:
    """
    Map a raw scraper dict to a NormalizedListing.
    Returns None if required fields (price, city, state, listing_url) cannot be resolved.
    """
    if isinstance(raw, RawListing):
        raw_dict = raw.model_dump(exclude_none=False)
    else:
        raw_dict = raw

    mapper = SOURCE_MAPPERS.get(source)
    if mapper is None:
        raise ValueError(f"Unknown source: {source!r}. Valid sources: {list(SOURCE_MAPPERS)}")

    mapped = mapper(raw_dict)

    # Resolve price
    price = _parse_price(mapped.get("price"))
    if price is None:
        return None

    # Resolve city / state (required)
    city = (mapped.get("city") or "").strip()
    state = (mapped.get("state") or "").strip()
    if not city or not state:
        return None

    # Resolve listing_url (required)
    listing_url = (mapped.get("listing_url") or "").strip()
    if not listing_url:
        return None

    # Resolve external_id
    external_id = str(mapped.get("external_id") or "").strip()
    if not external_id:
        external_id = str(uuid.uuid4())

    # Coordinates with validation
    lat = mapped.get("latitude")
    lng = mapped.get("longitude")
    if lat is not None and lng is not None:
        try:
            lat = float(lat)
            lng = float(lng)
            if not _is_valid_us_coord(lat, lng):
                lat = None
                lng = None
        except (TypeError, ValueError):
            lat = None
            lng = None

    # Parse available_date
    available_date = None
    raw_avail = mapped.get("available_date")
    if raw_avail:
        if isinstance(raw_avail, date):
            available_date = raw_avail
        else:
            s = str(raw_avail).strip()
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y"):
                try:
                    available_date = datetime.strptime(s, fmt).date()
                    break
                except ValueError:
                    continue

    # Parse listed_at
    listed_at = None
    raw_listed = mapped.get("listed_at")
    if raw_listed:
        if isinstance(raw_listed, datetime):
            listed_at = raw_listed
        elif isinstance(raw_listed, (int, float)):
            try:
                listed_at = datetime.utcfromtimestamp(float(raw_listed))
            except (ValueError, OSError):
                pass
        else:
            s = str(raw_listed).strip()
            for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
                try:
                    listed_at = datetime.strptime(s, fmt)
                    break
                except ValueError:
                    continue

    # Validate listing_type
    listing_type = (mapped.get("listing_type") or "rental").lower()
    if listing_type not in ("rental", "sale"):
        listing_type = "rental"

    # Validate property_type
    valid_property_types = {"apartment", "house", "condo", "townhouse", "studio", "loft", "room", "other"}
    property_type = (mapped.get("property_type") or "").lower()
    if property_type not in valid_property_types:
        property_type = None

    # Validate fee_type
    valid_fee_types = {"no_fee", "op_fee", "broker_fee"}
    fee_type = (mapped.get("fee_type") or "").lower().replace(" ", "_")
    if fee_type not in valid_fee_types:
        fee_type = None

    return NormalizedListing(
        external_id=external_id,
        source_name=source,
        address_line1=mapped.get("address_line1"),
        address_line2=mapped.get("address_line2"),
        city=city,
        state=state.upper(),
        zip_code=mapped.get("zip_code"),
        neighborhood=mapped.get("neighborhood"),
        latitude=lat,
        longitude=lng,
        listing_type=listing_type,
        property_type=property_type,
        bedrooms=_parse_bedrooms(mapped.get("bedrooms")),
        bathrooms=_parse_bathrooms(mapped.get("bathrooms")),
        square_feet=_parse_sqft(mapped.get("square_feet")),
        floor_number=int(mapped.get("floor_number")) if mapped.get("floor_number") else None,
        year_built=int(mapped.get("year_built")) if mapped.get("year_built") else None,
        price=price,
        deposit=_parse_price(mapped.get("deposit")),
        fee_type=fee_type or None,
        has_doorman=bool(_parse_bool(mapped.get("has_doorman")) or False),
        has_elevator=bool(_parse_bool(mapped.get("has_elevator")) or False),
        has_gym=bool(_parse_bool(mapped.get("has_gym")) or False),
        has_laundry_in_unit=bool(_parse_bool(mapped.get("has_laundry_in_unit")) or False),
        has_laundry_in_bldg=bool(_parse_bool(mapped.get("has_laundry_in_bldg")) or False),
        has_dishwasher=bool(_parse_bool(mapped.get("has_dishwasher")) or False),
        has_ac=bool(_parse_bool(mapped.get("has_ac")) or False),
        pets_allowed=_parse_bool(mapped.get("pets_allowed")),
        has_outdoor_space=bool(_parse_bool(mapped.get("has_outdoor_space")) or False),
        listing_url=listing_url,
        image_urls=_parse_image_urls(mapped.get("image_urls")),
        description=mapped.get("description"),
        available_date=available_date,
        listed_at=listed_at,
        raw_metadata=mapped.get("raw_metadata") or {},
    )
