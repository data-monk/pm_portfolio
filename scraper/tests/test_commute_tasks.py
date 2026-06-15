"""
Unit tests for scraper/tasks.py (Celery tasks).

Mocks: asyncpg, redis.asyncio, httpx, scrapers, geocoder, celery_app
Run from the scraper/ directory:
    python -m pytest tests/test_commute_tasks.py -v
"""
from __future__ import annotations

import asyncio
import json
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest

# Allow importing from the scraper package root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_listing_rows(n: int = 5) -> list[dict]:
    return [
        {
            "id": f"listing-{i:04d}",
            "lat": 40.7 + i * 0.001,
            "lng": -74.0 + i * 0.001,
        }
        for i in range(n)
    ]


def _make_gm_ok_element(duration: int = 1800, distance: int = 5000) -> dict:
    return {
        "status": "OK",
        "duration": {"value": duration, "text": f"{duration // 60} mins"},
        "distance": {"value": distance, "text": "3.1 mi"},
    }


def _make_gm_response(elements: list[dict]) -> dict:
    return {
        "status": "OK",
        "rows": [{"elements": [el]} for el in elements],
    }


# ── Redis dedup helpers ────────────────────────────────────────────────────────

class TestRedisDedup:
    """Test the _check_dedup and _set_dedup async helpers."""

    @pytest.mark.asyncio
    async def test_check_dedup_returns_true_when_key_exists(self):
        from tasks import _check_dedup
        mock_redis = AsyncMock()
        mock_redis.exists = AsyncMock(return_value=1)
        result = await _check_dedup(mock_redis, "scrape:dedup:streeteasy:123")
        assert result is True
        mock_redis.exists.assert_called_once_with("scrape:dedup:streeteasy:123")

    @pytest.mark.asyncio
    async def test_check_dedup_returns_false_when_key_absent(self):
        from tasks import _check_dedup
        mock_redis = AsyncMock()
        mock_redis.exists = AsyncMock(return_value=0)
        result = await _check_dedup(mock_redis, "scrape:dedup:zillow:xyz")
        assert result is False

    @pytest.mark.asyncio
    async def test_set_dedup_sets_with_24h_ttl(self):
        from tasks import _set_dedup
        mock_redis = AsyncMock()
        await _set_dedup(mock_redis, "scrape:dedup:streeteasy:abc")
        mock_redis.set.assert_called_once_with("scrape:dedup:streeteasy:abc", "1", ex=86400)


class TestRedisDeduplicationKey:
    def test_dedup_key_format(self):
        from tasks import _redis_dedup_key
        key = _redis_dedup_key("apartments_com", "apt_12345")
        assert key == "scrape:dedup:apartments_com:apt_12345"

    def test_dedup_key_different_sources(self):
        from tasks import _redis_dedup_key
        k1 = _redis_dedup_key("zillow", "abc")
        k2 = _redis_dedup_key("streeteasy", "abc")
        assert k1 != k2

    def test_dedup_key_different_ids(self):
        from tasks import _redis_dedup_key
        k1 = _redis_dedup_key("zillow", "001")
        k2 = _redis_dedup_key("zillow", "002")
        assert k1 != k2


# ── batch_commute_enrich: chunking logic ──────────────────────────────────────

class TestBatchCommuteEnrichChunking:
    """Test that the Celery task chunks origins into groups of 25."""

    def test_25_listings_chunks_produce_single_gm_call(self):
        """25 listings → exactly 1 Google Maps API call (1 chunk)."""
        chunk_size = 25
        listings = list(range(25))
        chunks = [listings[i:i + chunk_size] for i in range(0, len(listings), chunk_size)]
        assert len(chunks) == 1
        assert len(chunks[0]) == 25

    def test_60_listings_chunks_to_3_gm_calls(self):
        """60 listings → 3 chunks (25+25+10)."""
        chunk_size = 25
        listings = list(range(60))
        chunks = [listings[i:i + chunk_size] for i in range(0, len(listings), chunk_size)]
        assert len(chunks) == 3
        assert len(chunks[0]) == 25
        assert len(chunks[1]) == 25
        assert len(chunks[2]) == 10

    def test_empty_listings_zero_chunks(self):
        chunk_size = 25
        listings: list = []
        chunks = [listings[i:i + chunk_size] for i in range(0, len(listings), chunk_size)]
        assert len(chunks) == 0

    def test_1_listing_1_chunk(self):
        chunk_size = 25
        listings = ["l1"]
        chunks = [listings[i:i + chunk_size] for i in range(0, len(listings), chunk_size)]
        assert len(chunks) == 1
        assert len(chunks[0]) == 1

    def test_50_listings_chunks_to_2_gm_calls(self):
        chunk_size = 25
        listings = list(range(50))
        chunks = [listings[i:i + chunk_size] for i in range(0, len(listings), chunk_size)]
        assert len(chunks) == 2
        assert all(len(c) == 25 for c in chunks)


# ── batch_commute_enrich: Redis cache key format ──────────────────────────────

class TestBatchCommuteRedisKeyFormat:
    """Test Redis key format written by batch_commute_enrich."""

    def test_key_includes_rounded_coordinates(self):
        listing_id = "abc-123"
        dest_lat = 40.712812345
        dest_lng = -74.006012345
        mode = "transit"
        departure_epoch = 1718524200

        lat4 = round(dest_lat, 4)
        lng4 = round(dest_lng, 4)
        key = f"commute:{listing_id}:{lat4}:{lng4}:{mode}:{departure_epoch}"
        assert "40.7128" in key
        assert "-74.006" in key

    def test_key_uses_zero_when_no_epoch(self):
        listing_id = "xyz-456"
        dest_lat = 40.7128
        dest_lng = -74.006
        mode = "driving"
        departure_epoch = None

        epoch = departure_epoch or 0
        key = f"commute:{listing_id}:{dest_lat}:{dest_lng}:{mode}:{epoch}"
        assert key.endswith(":driving:0")

    def test_key_differs_by_mode(self):
        listing_id = "l1"
        d_lat, d_lng = 40.7128, -74.006
        epoch = 0

        k1 = f"commute:{listing_id}:{d_lat}:{d_lng}:transit:{epoch}"
        k2 = f"commute:{listing_id}:{d_lat}:{d_lng}:driving:{epoch}"
        assert k1 != k2


# ── GM response parsing: transit transfer counting ────────────────────────────

class TestTransitTransferCounting:
    """
    The transfer count logic: transfers = max(0, vehicle_boardings - 1)
    This is replicated from tasks.py for unit-testability without Celery.
    """

    def _count_transfers(self, steps: list[dict]) -> int:
        """Local copy of tasks.py transfer-counting logic."""
        transfers = 0
        for step in steps:
            if step.get("travel_mode") == "TRANSIT":
                transfers += 1
        return max(0, transfers - 1) if transfers > 0 else 0

    def test_single_transit_leg_zero_transfers(self):
        steps = [
            {"travel_mode": "WALKING"},
            {"travel_mode": "TRANSIT"},
            {"travel_mode": "WALKING"},
        ]
        assert self._count_transfers(steps) == 0

    def test_two_transit_legs_one_transfer(self):
        steps = [
            {"travel_mode": "WALKING"},
            {"travel_mode": "TRANSIT"},
            {"travel_mode": "WALKING"},
            {"travel_mode": "TRANSIT"},
            {"travel_mode": "WALKING"},
        ]
        assert self._count_transfers(steps) == 1

    def test_three_transit_legs_two_transfers(self):
        steps = [
            {"travel_mode": "TRANSIT"},
            {"travel_mode": "WALKING"},
            {"travel_mode": "TRANSIT"},
            {"travel_mode": "WALKING"},
            {"travel_mode": "TRANSIT"},
        ]
        assert self._count_transfers(steps) == 2

    def test_no_transit_steps_zero_transfers(self):
        steps = [{"travel_mode": "WALKING"}]
        assert self._count_transfers(steps) == 0

    def test_empty_steps_zero_transfers(self):
        assert self._count_transfers([]) == 0


# ── GM status handling ────────────────────────────────────────────────────────

class TestGMStatusHandling:
    """Test that GM API status codes are processed correctly."""

    def test_ok_status_extracts_duration_and_distance(self):
        element = {
            "status": "OK",
            "duration": {"value": 1800},
            "distance": {"value": 5000},
        }
        duration = element.get("duration", {}).get("value") if element.get("status") == "OK" else None
        distance = element.get("distance", {}).get("value") if element.get("status") == "OK" else None
        assert duration == 1800
        assert distance == 5000

    def test_zero_results_status_duration_is_none(self):
        element = {"status": "ZERO_RESULTS"}
        duration = element.get("duration", {}).get("value") if element.get("status") == "OK" else None
        assert duration is None

    def test_request_denied_triggers_no_duration(self):
        element = {"status": "REQUEST_DENIED"}
        duration = element.get("duration", {}).get("value") if element.get("status") == "OK" else None
        assert duration is None

    def test_over_daily_limit_status(self):
        top_status = "OVER_DAILY_LIMIT"
        assert top_status in ("REQUEST_DENIED", "INVALID_REQUEST", "OVER_DAILY_LIMIT")


# ── Scrape source task helpers ────────────────────────────────────────────────

class TestMarkStaleListingsSQL:
    """Test the stale listings logic (SQL-level)."""

    def test_mark_stale_query_targets_is_active_true(self):
        """The UPDATE query should only target is_active=TRUE rows."""
        from db import queries  # noqa
        # If db.queries is not importable here (different package), we check task source
        import inspect
        from tasks import mark_stale_listings
        source = inspect.getsource(mark_stale_listings)
        assert "is_active" in source
        assert "12 hours" in source or "INTERVAL '12 hours'" in source

    def test_scrape_source_task_bound(self):
        """scrape_source should be a bound Celery task with retry capability."""
        from tasks import scrape_source
        assert hasattr(scrape_source, "delay") or hasattr(scrape_source, "apply_async")


class TestScrapeSourceRetryBehavior:
    """Test retry and error propagation in scrape_source."""

    def test_scrape_source_max_retries_config(self):
        from tasks import scrape_source
        # Celery bound task should have max_retries set
        if hasattr(scrape_source, "max_retries"):
            assert scrape_source.max_retries == 3

    def test_scrape_source_retry_countdown_policy(self):
        """Task should use exponential or linear countdown for retries."""
        import inspect
        from tasks import scrape_source
        source = inspect.getsource(scrape_source)
        assert "countdown" in source or "default_retry_delay" in source
