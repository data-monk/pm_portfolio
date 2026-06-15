"""
Google Geocoding API fallback — used when scrapers return an address but no coordinates.
"""
from __future__ import annotations

import os
import logging

import httpx

logger = logging.getLogger(__name__)

GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json"
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


async def geocode_address(address: str) -> tuple[float, float] | None:
    """
    Geocode a free-form address string.
    Returns (lat, lng) on success, or None if the API returns no results or fails.
    """
    if not API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY not set — skipping geocoding")
        return None

    params = {
        "address": address,
        "key": API_KEY,
        "components": "country:US",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(GEOCODE_BASE, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("Geocoding HTTP error for %r: %s", address, exc)
        return None

    status = data.get("status")

    if status == "OK":
        results = data.get("results", [])
        if results:
            location = results[0]["geometry"]["location"]
            return float(location["lat"]), float(location["lng"])
        return None

    if status in ("ZERO_RESULTS", "NOT_FOUND"):
        logger.debug("Geocoding returned %s for address: %r", status, address)
        return None

    if status in ("OVER_QUERY_LIMIT", "REQUEST_DENIED"):
        logger.error("Geocoding API error %s — check API key and billing", status)
        return None

    logger.warning("Geocoding unexpected status %r for address: %r", status, address)
    return None


async def geocode_listing(
    address_line1: str,
    city: str,
    state: str,
    zip_code: str | None = None,
) -> tuple[float, float] | None:
    """
    Geocode a structured listing address.
    Returns (lat, lng) or None.
    """
    parts = [address_line1, city, state]
    if zip_code:
        parts.append(zip_code)
    full_address = ", ".join(p for p in parts if p)
    return await geocode_address(full_address)
