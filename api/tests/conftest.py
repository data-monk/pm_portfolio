"""
Pytest fixtures for CommuteFirst API tests.

Patches DB pool and Redis before importing the FastAPI app so
no live Postgres or Redis connections are attempted during tests.
"""
from __future__ import annotations

import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Ensure api/ directory is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Shared mock asyncpg record ─────────────────────────────────────────────────

def _make_mock_row(**kwargs) -> MagicMock:
    """Build a MagicMock that behaves like an asyncpg Record."""
    row = MagicMock()
    row.__getitem__ = MagicMock(side_effect=lambda key: kwargs.get(key))
    row.get = MagicMock(side_effect=lambda key, default=None: kwargs.get(key, default))
    for k, v in kwargs.items():
        setattr(row, k, v)
    return row


def _make_listing_row(**overrides) -> MagicMock:
    """A minimal valid listing row matching the DB SELECT in listings.py."""
    defaults = {
        "id": "a1b2c3d4-0001-4000-8000-000000000001",
        "external_id": "streeteasy_test_001",
        "source": "streeteasy",
        "listing_url": "https://streeteasy.com/rental/test_001",
        "address_line1": "245 7th Ave",
        "address_line2": "Apt 3C",
        "city": "Brooklyn",
        "state": "NY",
        "zip_code": "11215",
        "neighborhood": "Park Slope",
        "latitude": 40.6681,
        "longitude": -73.9808,
        "listing_type": "rental",
        "property_type": "apartment",
        "bedrooms": 1.0,
        "bathrooms": 1.0,
        "square_feet": 720,
        "floor_number": 3,
        "year_built": 1928,
        "price": 2800.0,
        "price_per_sqft": None,
        "deposit": 2800.0,
        "fee_type": "no_fee",
        "has_doorman": False,
        "has_elevator": False,
        "has_gym": False,
        "has_laundry_in_unit": False,
        "has_laundry_in_bldg": True,
        "has_dishwasher": True,
        "has_ac": True,
        "pets_allowed": True,
        "has_outdoor_space": False,
        "image_urls": [],
        "description": "A bright corner unit.",
        "available_date": None,
        "is_active": True,
        "scraped_at": None,
        "last_seen_at": None,
        "raw_metadata": None,
        # Commute fields — null means not yet cached
        "duration_seconds": None,
        "duration_in_traffic_seconds": None,
        "distance_meters": None,
        "transfer_count": None,
        "transit_lines": None,
        "gm_status": None,
        "transit_steps": None,
        "mode": "transit",
    }
    defaults.update(overrides)
    return _make_mock_row(**defaults)


# ── Pool/connection mock factory ───────────────────────────────────────────────

def _make_mock_pool(fetch_rows: list | None = None, fetchrow: MagicMock | None = None):
    """Return a mock asyncpg pool whose acquire() returns a usable connection."""
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=fetch_rows or [])
    conn.fetchrow = AsyncMock(return_value=fetchrow)
    conn.execute = AsyncMock(return_value="SELECT 0")

    pool = AsyncMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    pool._conn = conn  # convenience accessor in tests
    return pool


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def mock_pool():
    return _make_mock_pool()


@pytest.fixture()
def mock_redis():
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    redis.exists = AsyncMock(return_value=0)
    return redis


@pytest.fixture()
def client(mock_pool, mock_redis):
    """
    FastAPI TestClient with DB pool and Redis fully mocked.
    The lifespan is skipped by overriding dependencies.
    """
    with (
        patch("db.connection.get_pool", return_value=mock_pool),
        patch("db.connection._pool", mock_pool),
        patch("dependencies._redis", mock_redis),
    ):
        # Import app after patching global singletons
        from main import app
        from db.connection import get_pool
        from dependencies import get_redis

        app.dependency_overrides[get_pool] = lambda: mock_pool
        app.dependency_overrides[get_redis] = lambda: mock_redis

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

        app.dependency_overrides.clear()


@pytest.fixture()
def client_with_listings(mock_redis):
    """Client pre-seeded with one mock listing row in the pool."""
    row = _make_listing_row()
    pool = _make_mock_pool(fetch_rows=[row], fetchrow=row)
    pool._conn.fetch = AsyncMock(return_value=[row])

    with (
        patch("db.connection.get_pool", return_value=pool),
        patch("db.connection._pool", pool),
        patch("dependencies._redis", mock_redis),
    ):
        from main import app
        from db.connection import get_pool
        from dependencies import get_redis
        from services import listings_service

        app.dependency_overrides[get_pool] = lambda: pool
        app.dependency_overrides[get_redis] = lambda: mock_redis

        # Patch search_listings to return clean data without real SQL
        async def _mock_search(filters, pool):
            return [dict(row.get) if callable(row.get) else {}], 1

        with patch.object(listings_service, "search_listings", new=_mock_search):
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c

        app.dependency_overrides.clear()
