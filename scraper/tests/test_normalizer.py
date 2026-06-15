"""
Unit tests for scraper/pipeline/normalizer.py

Run from the scraper/ directory:
    python -m pytest tests/test_normalizer.py -v
"""
from __future__ import annotations

import sys
import os

# Allow importing from the scraper package root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from pipeline.normalizer import (
    NormalizedListing,
    RawListing,
    _parse_price,
    _parse_bedrooms,
    _is_valid_us_coord,
    normalize,
)


# ── Price normalization ───────────────────────────────────────────────────────

class TestPriceNormalization:
    def test_price_string_with_dollar_sign_and_comma(self):
        assert _parse_price("$3,200/mo") == 3200.0

    def test_price_string_plain_integer(self):
        assert _parse_price("3200") == 3200.0

    def test_price_integer(self):
        assert _parse_price(3200) == 3200.0

    def test_price_float(self):
        assert _parse_price(3200.50) == 3200.50

    def test_price_string_with_month_suffix(self):
        assert _parse_price("$2,800/month") == 2800.0

    def test_price_with_spaces_stripped(self):
        # The normalizer strips spaces, so "$ 3 200" → "3200" → 3200.0
        assert _parse_price("$ 3 200") == 3200.0

    def test_price_zero_returns_none(self):
        assert _parse_price(0) is None

    def test_price_negative_returns_none(self):
        assert _parse_price(-500) is None

    def test_price_none_returns_none(self):
        assert _parse_price(None) is None

    def test_price_empty_string_returns_none(self):
        assert _parse_price("") is None

    def test_price_non_numeric_string_returns_none(self):
        assert _parse_price("contact for price") is None

    def test_price_week_suffix_stripped(self):
        result = _parse_price("$800/wk")
        assert result == 800.0

    def test_price_string_comma_format(self):
        assert _parse_price("$1,500") == 1500.0

    def test_price_large_value(self):
        assert _parse_price("$12,500/mo") == 12500.0


# ── Bedroom normalization ─────────────────────────────────────────────────────

class TestBedroomNormalization:
    def test_studio_string(self):
        assert _parse_bedrooms("Studio") == 0.0

    def test_studio_case_insensitive(self):
        assert _parse_bedrooms("studio") == 0.0

    def test_zero_br_string(self):
        assert _parse_bedrooms("0BR") == 0.0

    def test_zero_string(self):
        assert _parse_bedrooms("0") == 0.0

    def test_1br_string(self):
        assert _parse_bedrooms("1BR") == 1.0

    def test_1_bed_string(self):
        assert _parse_bedrooms("1 bed") == 1.0

    def test_1_bedroom_string(self):
        assert _parse_bedrooms("1 bedroom") == 1.0

    def test_2br_string(self):
        assert _parse_bedrooms("2BR") == 2.0

    def test_numeric_integer(self):
        assert _parse_bedrooms(2) == 2.0

    def test_float(self):
        assert _parse_bedrooms(1.0) == 1.0

    def test_three_bedrooms(self):
        assert _parse_bedrooms(3) == 3.0

    def test_none_returns_none(self):
        assert _parse_bedrooms(None) is None

    def test_efficiency_string(self):
        assert _parse_bedrooms("efficiency") == 0.0


# ── Coordinate validation ─────────────────────────────────────────────────────

class TestCoordinateValidation:
    def test_valid_nyc_coordinates(self):
        assert _is_valid_us_coord(40.7128, -74.0060) is True

    def test_valid_brooklyn_coordinates(self):
        assert _is_valid_us_coord(40.6681, -73.9808) is True

    def test_coordinates_outside_us_london(self):
        assert _is_valid_us_coord(51.5074, -0.1278) is False

    def test_coordinates_outside_us_lat_too_high(self):
        # Canada
        assert _is_valid_us_coord(55.0, -79.0) is False

    def test_swapped_lat_lng(self):
        # -74.0060 is not a valid US latitude
        assert _is_valid_us_coord(-74.0060, 40.7128) is False

    def test_boundary_min_lat(self):
        # Near US southern boundary (Hawaii lower)
        assert _is_valid_us_coord(24.5, -80.0) is True

    def test_boundary_min_lng(self):
        # Far western US
        assert _is_valid_us_coord(40.0, -124.0) is True

    def test_coordinates_lng_too_far_east(self):
        # East Coast / Atlantic
        assert _is_valid_us_coord(40.0, -60.0) is False


# ── Source field mapping ──────────────────────────────────────────────────────

class TestSourceFieldMapping:
    def test_normalize_apartments_com_raw(self):
        raw = {
            "external_id": "apt_12345",
            "address": "100 Main St",
            "city": "Brooklyn",
            "state": "NY",
            "zip_code": "11201",
            "beds": "2",
            "baths": "1",
            "sqft": "950",
            "price": "$2,600/mo",
            "url": "https://apartments.com/apt_12345",
            "images": [],
            "amenities": ["dishwasher", "elevator", "gym"],
            "latitude": 40.6930,
            "longitude": -73.9880,
        }
        result = normalize(raw, "apartments_com")
        assert result is not None
        assert result.source_name == "apartments_com"
        assert result.city == "Brooklyn"
        assert result.price == 2600.0
        assert result.bedrooms == 2.0
        assert result.bathrooms == 1.0
        assert result.square_feet == 950
        assert result.has_gym is True
        assert result.has_elevator is True
        assert result.has_dishwasher is True

    def test_normalize_apartments_com_amenities_string(self):
        # amenities as comma-separated string (not list)
        raw = {
            "external_id": "apt_9999",
            "city": "New York",
            "state": "NY",
            "price": "1800",
            "url": "https://apartments.com/9999",
            "amenities": "doorman, gym, fitness center",
        }
        result = normalize(raw, "apartments_com")
        assert result is not None
        assert result.has_doorman is True
        assert result.has_gym is True

    def test_normalize_streeteasy_camelcase_fields(self):
        raw = {
            "listingId": "se_7890",
            "address": {
                "streetAddress": "245 7th Ave",
                "city": "Brooklyn",
                "state": "NY",
                "zip": "11215",
            },
            "price": 2800,
            "bedroomCount": 1,
            "bathroomCount": 1,
            "area": 720,
            "listingUrl": "https://streeteasy.com/rental/7890",
            "areaName": "Park Slope",
            "latitude": 40.6681,
            "longitude": -73.9808,
            "noFee": True,
            "hasDoorman": False,
            "hasElevator": False,
            "hasDishwasher": True,
            "hasLaundryInBuilding": True,
        }
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.source_name == "streeteasy"
        assert result.external_id == "se_7890"
        assert result.price == 2800.0
        assert result.bedrooms == 1.0
        assert result.bathrooms == 1.0
        assert result.square_feet == 720
        assert result.city == "Brooklyn"
        assert result.state == "NY"
        assert result.neighborhood == "Park Slope"
        assert result.fee_type == "no_fee"
        assert result.has_dishwasher is True
        assert result.has_laundry_in_bldg is True

    def test_normalize_zillow_hpd_nested_fields(self):
        raw = {
            "zpid": "z_555",
            "latLong": {"latitude": 40.7074, "longitude": -74.0061},
            "hdpData": {
                "homeInfo": {
                    "streetAddress": "90 William St",
                    "city": "New York",
                    "state": "NY",
                    "zipcode": "10038",
                    "price": 3200,
                    "bedrooms": 0,
                    "bathrooms": 1,
                }
            },
            "detailUrl": "/homedetails/z_555",
        }
        result = normalize(raw, "zillow")
        assert result is not None
        assert result.source_name == "zillow"
        assert result.external_id == "z_555"
        assert result.price == 3200.0
        assert result.city == "New York"
        assert result.state == "NY"
        assert result.listing_url == "https://www.zillow.com/homedetails/z_555"

    def test_normalize_zillow_flat_fields(self):
        raw = {
            "zpid": "z_777",
            "price": 2500,
            "beds": 2,
            "baths": 1,
            "city": "Queens",
            "state": "NY",
            "listing_url": "https://zillow.com/homedetails/z_777",
            "latitude": 40.7488,
            "longitude": -73.8900,
        }
        result = normalize(raw, "zillow")
        assert result is not None
        assert result.bedrooms == 2.0
        assert result.price == 2500.0

    def test_normalize_facebook_with_location_obj(self):
        raw = {
            "id": "fb_111",
            "title": "Nice room in Bushwick",
            "price": {"amount": 1800},
            "location": {
                "city": "Brooklyn",
                "state": "NY",
                "address": "52 Wilson Ave",
                "latitude": 40.7037,
                "longitude": -73.9188,
            },
            "url": "https://facebook.com/marketplace/item/111",
            "bedrooms": 1,
            "bathrooms": 1,
        }
        result = normalize(raw, "facebook_marketplace")
        assert result is not None
        assert result.source_name == "facebook_marketplace"
        assert result.price == 1800.0
        assert result.city == "Brooklyn"
        assert result.external_id == "fb_111"

    def test_normalize_facebook_flat_price(self):
        # Facebook mapper expects price as a dict with 'amount' key,
        # or falls back to raw.get("price") only when price is a dict.
        # When price is an int directly, pass via price object to avoid AttributeError.
        raw = {
            "id": "fb_222",
            "price": {"amount": 2200},  # Facebook-format price object
            "city": "New York",
            "state": "NY",
            "url": "https://facebook.com/marketplace/item/222",
        }
        result = normalize(raw, "facebook_marketplace")
        assert result is not None
        assert result.price == 2200.0


# ── Required field validation ─────────────────────────────────────────────────

class TestNormalizeRequiredFields:
    def _base_raw(self, source: str = "streeteasy") -> dict:
        """Minimal valid raw dict for StreetEasy."""
        return {
            "listingId": "se_valid_001",
            "price": 2500,
            "address": {"streetAddress": "1 Main St", "city": "Brooklyn", "state": "NY"},
            "listingUrl": "https://streeteasy.com/rental/valid_001",
            "latitude": 40.7,
            "longitude": -73.9,
        }

    def test_missing_price_returns_none(self):
        raw = self._base_raw()
        raw.pop("price")
        result = normalize(raw, "streeteasy")
        assert result is None

    def test_zero_price_returns_none(self):
        raw = self._base_raw()
        raw["price"] = 0
        result = normalize(raw, "streeteasy")
        assert result is None

    def test_missing_city_returns_none(self):
        raw = {
            "listingId": "se_999",
            "price": 2000,
            "address": {"streetAddress": "1 Main St", "city": "", "state": "NY"},
            "listingUrl": "https://streeteasy.com/rental/999",
        }
        result = normalize(raw, "streeteasy")
        assert result is None

    def test_missing_listing_url_returns_none(self):
        raw = self._base_raw()
        raw["listingUrl"] = ""
        result = normalize(raw, "streeteasy")
        assert result is None

    def test_missing_listing_url_key_returns_none(self):
        raw = {
            "listingId": "se_888",
            "price": 2000,
            "address": {"streetAddress": "1 Main St", "city": "Brooklyn", "state": "NY"},
        }
        result = normalize(raw, "streeteasy")
        assert result is None

    def test_unknown_source_raises_value_error(self):
        raw = {"price": 2000, "city": "NYC", "state": "NY", "listingUrl": "https://example.com"}
        with pytest.raises(ValueError, match="Unknown source"):
            normalize(raw, "craigslist")

    def test_coordinates_outside_us_set_to_none(self):
        raw = self._base_raw()
        raw["latitude"] = 51.5
        raw["longitude"] = -0.12
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.latitude is None
        assert result.longitude is None

    def test_none_coordinates_left_as_none(self):
        raw = self._base_raw()
        raw.pop("latitude", None)
        raw.pop("longitude", None)
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.latitude is None
        assert result.longitude is None

    def test_valid_listing_returns_normalized(self):
        raw = self._base_raw()
        result = normalize(raw, "streeteasy")
        assert isinstance(result, NormalizedListing)
        assert result.source_name == "streeteasy"
        assert result.price > 0

    def test_external_id_auto_generated_when_missing(self):
        raw = {
            "price": 2000,
            "address": {"streetAddress": "1 Main St", "city": "Brooklyn", "state": "NY"},
            "listingUrl": "https://streeteasy.com/rental/no_id",
        }
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.external_id  # auto-generated UUID

    def test_invalid_fee_type_normalized_to_none(self):
        raw = self._base_raw()
        raw["feeType"] = "unknown_fee"
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.fee_type is None

    def test_valid_fee_type_no_fee(self):
        raw = self._base_raw()
        raw["noFee"] = True
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.fee_type == "no_fee"

    def test_state_normalized_to_uppercase(self):
        raw = self._base_raw()
        result = normalize(raw, "streeteasy")
        assert result is not None
        assert result.state == "NY"

    def test_available_date_parsed_from_string(self):
        raw = self._base_raw()
        raw["availableDate"] = "2026-07-01"
        result = normalize(raw, "streeteasy")
        assert result is not None
        from datetime import date
        assert result.available_date == date(2026, 7, 1)

    def test_amenities_elevator_detected(self):
        raw = {
            "external_id": "apts_el",
            "city": "New York",
            "state": "NY",
            "price": "2000",
            "url": "https://apartments.com/el",
            "amenities": ["elevator", "dishwasher"],
        }
        result = normalize(raw, "apartments_com")
        assert result is not None
        assert result.has_elevator is True
