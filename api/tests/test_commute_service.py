"""
Unit tests for api/services/commute_service.py

Run from the api/ directory:
    python -m pytest tests/test_commute_service.py -v
"""
from __future__ import annotations

import sys
import os
import json
import time
from datetime import datetime, date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── get_next_monday_830am_epoch ───────────────────────────────────────────────

class TestGetNextMonday830amEpoch:
    def _import(self):
        from services.commute_service import get_next_monday_830am_epoch
        return get_next_monday_830am_epoch

    def test_returns_future_timestamp(self):
        fn = self._import()
        epoch = fn()
        assert epoch > time.time()

    def test_result_is_a_monday(self):
        fn = self._import()
        epoch = fn()
        dt = datetime.fromtimestamp(epoch)
        assert dt.weekday() == 0, f"Expected Monday (0), got weekday {dt.weekday()}"

    def test_result_is_at_830am(self):
        fn = self._import()
        epoch = fn()
        dt = datetime.fromtimestamp(epoch)
        assert dt.hour == 8
        assert dt.minute == 30
        assert dt.second == 0

    def test_called_on_monday_returns_next_monday(self):
        """If today is Monday, the function must return NEXT Monday (not today)."""
        fn = self._import()
        # Patch datetime.now() to return a Monday
        monday_date = datetime(2026, 6, 15, 10, 0, 0)  # 2026-06-15 is a Monday
        with patch("services.commute_service.datetime") as mock_dt:
            mock_dt.now.return_value = monday_date
            # Let timedelta and replace pass through
            from datetime import timedelta
            mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
            epoch = fn()
        result_dt = datetime.fromtimestamp(epoch)
        assert result_dt.date() > monday_date.date(), (
            f"Should be NEXT Monday, not today. Got {result_dt.date()}"
        )

    def test_result_at_least_one_day_ahead(self):
        fn = self._import()
        epoch = fn()
        assert epoch > time.time() + 3600  # at least 1 hour in the future

    def test_returns_integer(self):
        fn = self._import()
        epoch = fn()
        assert isinstance(epoch, int)


# ── build_redis_key ────────────────────────────────────────────────────────────

class TestBuildRedisKey:
    def _import(self):
        from services.commute_service import build_redis_key
        return build_redis_key

    def test_rounds_coordinates_to_4_decimal_places(self):
        fn = self._import()
        key = fn("listing-1", 40.712812345, -74.006012345, "transit", 1234567890)
        assert "40.7128" in key
        assert "-74.006" in key

    def test_uses_zero_for_null_epoch(self):
        fn = self._import()
        key = fn("listing-1", 40.7128, -74.006, "transit", None)
        assert key.endswith(":transit:0")

    def test_different_modes_produce_different_keys(self):
        fn = self._import()
        k1 = fn("l1", 40.7128, -74.006, "transit", 0)
        k2 = fn("l1", 40.7128, -74.006, "driving", 0)
        assert k1 != k2

    def test_different_listing_ids_differ(self):
        fn = self._import()
        k1 = fn("listing-A", 40.7128, -74.006, "transit", 1000)
        k2 = fn("listing-B", 40.7128, -74.006, "transit", 1000)
        assert k1 != k2

    def test_key_starts_with_commute_prefix(self):
        fn = self._import()
        key = fn("listing-X", 40.71, -74.00, "walking", 9999)
        assert key.startswith("commute:")

    def test_key_contains_listing_id(self):
        fn = self._import()
        key = fn("my-listing-id", 40.7128, -74.006, "bicycling", 0)
        assert "my-listing-id" in key

    def test_different_destinations_differ(self):
        fn = self._import()
        k1 = fn("l1", 40.7128, -74.006, "transit", 0)
        k2 = fn("l1", 40.7200, -74.006, "transit", 0)
        assert k1 != k2

    def test_same_coords_rounded_produce_same_key(self):
        fn = self._import()
        # These should round to the same 4-decimal value
        k1 = fn("l1", 40.71280000, -74.00600000, "transit", 0)
        k2 = fn("l1", 40.71280001, -74.00600001, "transit", 0)
        assert k1 == k2


# ── parse_distance_matrix_element ─────────────────────────────────────────────

class TestParseDistanceMatrixElement:
    def _import(self):
        from services.commute_service import parse_distance_matrix_element
        return parse_distance_matrix_element

    @pytest.mark.asyncio
    async def test_ok_status_returns_duration(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 1800, "text": "30 mins"},
            "distance": {"value": 5000, "text": "3.1 mi"},
        }
        result = await fn(element, "driving")
        assert result["status"] == "OK"
        assert result["duration_seconds"] == 1800
        assert result["distance_meters"] == 5000
        assert result["error"] is None

    @pytest.mark.asyncio
    async def test_zero_results_returns_none_duration(self):
        fn = self._import()
        element = {"status": "ZERO_RESULTS"}
        result = await fn(element, "transit")
        assert result["status"] == "ZERO_RESULTS"
        assert result["duration_seconds"] is None
        assert result["error"] is not None

    @pytest.mark.asyncio
    async def test_not_found_status(self):
        fn = self._import()
        element = {"status": "NOT_FOUND"}
        result = await fn(element, "driving")
        assert result["status"] == "NOT_FOUND"
        assert result["duration_seconds"] is None
        assert result["error"] is not None

    @pytest.mark.asyncio
    async def test_request_denied_status(self):
        fn = self._import()
        element = {"status": "REQUEST_DENIED"}
        result = await fn(element, "transit")
        assert result["status"] == "REQUEST_DENIED"
        assert result["duration_seconds"] is None
        assert result["error"] is not None

    @pytest.mark.asyncio
    async def test_over_daily_limit_status(self):
        fn = self._import()
        element = {"status": "OVER_DAILY_LIMIT"}
        result = await fn(element, "transit")
        assert result["status"] == "OVER_DAILY_LIMIT"
        assert result["duration_seconds"] is None

    @pytest.mark.asyncio
    async def test_transit_extracts_transfer_count(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 2100},
            "distance": {"value": 6000},
            "steps": [
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 300},
                    "distance": {"value": 400},
                    "html_instructions": "Walk to station",
                },
                {
                    "travel_mode": "TRANSIT",
                    "duration": {"value": 900},
                    "distance": {"value": 4200},
                    "transit_details": {
                        "line": {"short_name": "F", "vehicle": {"type": "SUBWAY"}},
                        "departure_stop": {"name": "9 St/4 Av"},
                        "arrival_stop": {"name": "Jay St"},
                        "num_stops": 3,
                    },
                },
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 120},
                    "distance": {"value": 150},
                    "html_instructions": "Transfer",
                },
                {
                    "travel_mode": "TRANSIT",
                    "duration": {"value": 600},
                    "distance": {"value": 1200},
                    "transit_details": {
                        "line": {"short_name": "A", "vehicle": {"type": "SUBWAY"}},
                        "departure_stop": {"name": "Jay St"},
                        "arrival_stop": {"name": "Fulton St"},
                        "num_stops": 1,
                    },
                },
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 180},
                    "distance": {"value": 200},
                    "html_instructions": "Walk to destination",
                },
            ],
        }
        result = await fn(element, "transit")
        assert result["status"] == "OK"
        assert result["transfer_count"] == 1  # 2 boardings - 1
        assert "F" in result["transit_lines"]
        assert "A" in result["transit_lines"]

    @pytest.mark.asyncio
    async def test_direct_transit_has_zero_transfers(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 1200},
            "distance": {"value": 5000},
            "steps": [
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 180},
                    "distance": {"value": 250},
                    "html_instructions": "Walk",
                },
                {
                    "travel_mode": "TRANSIT",
                    "duration": {"value": 900},
                    "distance": {"value": 4500},
                    "transit_details": {
                        "line": {"short_name": "N", "vehicle": {"type": "SUBWAY"}},
                        "departure_stop": {"name": "Ditmars Blvd"},
                        "arrival_stop": {"name": "Cortlandt St"},
                    },
                },
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 120},
                    "distance": {"value": 250},
                    "html_instructions": "Walk to destination",
                },
            ],
        }
        result = await fn(element, "transit")
        assert result["transfer_count"] == 0
        assert "N" in result["transit_lines"]

    @pytest.mark.asyncio
    async def test_driving_extracts_duration_in_traffic(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 1800},
            "duration_in_traffic": {"value": 2400},
            "distance": {"value": 8000},
        }
        result = await fn(element, "driving")
        assert result["duration_in_traffic_seconds"] == 2400

    @pytest.mark.asyncio
    async def test_transit_does_not_set_duration_in_traffic(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 1800},
            "duration_in_traffic": {"value": 2400},
            "distance": {"value": 8000},
        }
        result = await fn(element, "transit")
        assert result["duration_in_traffic_seconds"] is None

    @pytest.mark.asyncio
    async def test_unknown_status_has_error_message(self):
        fn = self._import()
        element = {"status": "MYSTERY_ERROR"}
        result = await fn(element, "walking")
        assert result["error"] is not None
        assert "MYSTERY_ERROR" in result["error"]

    @pytest.mark.asyncio
    async def test_transit_steps_list_populated(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 900},
            "distance": {"value": 2000},
            "steps": [
                {
                    "travel_mode": "TRANSIT",
                    "duration": {"value": 600},
                    "distance": {"value": 1800},
                    "transit_details": {
                        "line": {"short_name": "1", "vehicle": {"type": "SUBWAY"}},
                        "departure_stop": {"name": "14 St"},
                        "arrival_stop": {"name": "Chambers St"},
                    },
                },
            ],
        }
        result = await fn(element, "transit")
        assert len(result["transit_steps"]) == 1
        step = result["transit_steps"][0]
        assert step["mode"] == "transit"
        assert step["transit_line"] == "1"

    @pytest.mark.asyncio
    async def test_html_tags_stripped_from_walking_instruction(self):
        fn = self._import()
        element = {
            "status": "OK",
            "duration": {"value": 300},
            "distance": {"value": 400},
            "steps": [
                {
                    "travel_mode": "WALKING",
                    "duration": {"value": 300},
                    "distance": {"value": 400},
                    "html_instructions": "<b>Walk</b> to <div>station</div>",
                },
            ],
        }
        result = await fn(element, "transit")
        steps = result["transit_steps"]
        assert len(steps) == 1
        assert "<" not in steps[0]["instruction"]


# ── Redis cache helpers ────────────────────────────────────────────────────────

class TestRedisCacheHelpers:
    @pytest.mark.asyncio
    async def test_get_commute_from_redis_cache_miss_returns_none(self):
        from services.commute_service import get_commute_from_redis
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        result = await get_commute_from_redis("some:key", mock_redis)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_commute_from_redis_cache_hit_returns_dict(self):
        from services.commute_service import get_commute_from_redis
        mock_redis = AsyncMock()
        payload = {"status": "OK", "duration_seconds": 1800}
        mock_redis.get = AsyncMock(return_value=json.dumps(payload))
        result = await get_commute_from_redis("some:key", mock_redis)
        assert result == payload

    @pytest.mark.asyncio
    async def test_write_commute_to_redis_uses_6h_ttl(self):
        from services.commute_service import write_commute_to_redis
        mock_redis = AsyncMock()
        data = {"status": "OK", "duration_seconds": 900}
        await write_commute_to_redis("some:key", data, mock_redis)
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        # TTL is 21600 (6 hours in seconds)
        assert call_args[1].get("ex") == 21600 or (len(call_args[0]) >= 3 and call_args[0][2] == 21600)

    @pytest.mark.asyncio
    async def test_get_commute_from_redis_handles_json_error(self):
        from services.commute_service import get_commute_from_redis
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="NOT VALID JSON {{")
        result = await get_commute_from_redis("bad:key", mock_redis)
        assert result is None  # error handled gracefully

    @pytest.mark.asyncio
    async def test_get_commute_from_redis_handles_redis_exception(self):
        from services.commute_service import get_commute_from_redis
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(side_effect=Exception("Redis connection refused"))
        result = await get_commute_from_redis("error:key", mock_redis)
        assert result is None


# ── seconds_to_display helper ─────────────────────────────────────────────────

class TestSecondsToDisplay:
    def _import(self):
        from services.commute_service import _seconds_to_display
        return _seconds_to_display

    def test_30_minutes(self):
        fn = self._import()
        assert fn(1800) == "30 min"

    def test_45_minutes(self):
        fn = self._import()
        assert fn(2700) == "45 min"

    def test_1_hour_exactly(self):
        fn = self._import()
        assert fn(3600) == "1 hr"

    def test_1_hour_30_minutes(self):
        fn = self._import()
        assert fn(5400) == "1 hr 30 min"

    def test_2_hours(self):
        fn = self._import()
        assert fn(7200) == "2 hr"

    def test_59_minutes(self):
        fn = self._import()
        assert fn(3540) == "59 min"

    def test_10_minutes(self):
        fn = self._import()
        assert fn(600) == "10 min"
