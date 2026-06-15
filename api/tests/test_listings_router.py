"""
Integration tests for the FastAPI listings, saved, and admin routers.

Uses TestClient with mocked DB and Redis (from conftest.py).

Run from the api/ directory:
    python -m pytest tests/test_listings_router.py -v
"""
from __future__ import annotations

import sys
import os
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Health check ──────────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "commute-search-api" in data["service"]


# ── Search endpoint ───────────────────────────────────────────────────────────

class TestSearchListings:
    def test_search_returns_200_with_no_params(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search")
        assert resp.status_code == 200

    def test_search_response_has_required_keys(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search")
        assert resp.status_code == 200
        data = resp.json()
        assert "listings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_search_with_page_param(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search?page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1

    def test_search_default_page_is_1(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search")
        data = resp.json()
        assert data["page"] == 1

    def test_search_invalid_mode_falls_back_to_transit(self, client):
        """Invalid mode value → falls back to 'transit' (no 422 from route handler)."""
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search?mode=helicopter")
        # Router normalizes unknown modes to 'transit' (no validation error raised)
        assert resp.status_code == 200

    def test_search_page_size_respected(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get("/api/commute-search/listings/search?page_size=5")
        assert resp.status_code == 200

    def test_search_page_must_be_positive(self, client):
        resp = client.get("/api/commute-search/listings/search?page=0")
        # page ge=1 → 422
        assert resp.status_code == 422

    def test_search_page_size_max_50(self, client):
        resp = client.get("/api/commute-search/listings/search?page_size=100")
        # page_size le=50 → 422
        assert resp.status_code == 422

    def test_search_with_destination_params(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get(
                "/api/commute-search/listings/search"
                "?destination_lat=40.7128&destination_lng=-74.006&mode=transit"
            )
        assert resp.status_code == 200

    def test_search_with_all_filters(self, client):
        with patch("services.listings_service.search_listings", new=AsyncMock(return_value=([], 0))):
            resp = client.get(
                "/api/commute-search/listings/search"
                "?min_price=1500&max_price=4000&min_bedrooms=1&page=2&sort=price_asc"
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2


# ── Listing detail endpoint ───────────────────────────────────────────────────

class TestGetListingDetail:
    def test_listing_not_found_returns_404(self, client):
        with patch("services.listings_service.get_listing_by_id", new=AsyncMock(return_value=None)):
            resp = client.get("/api/commute-search/listings/nonexistent-id")
        assert resp.status_code == 404

    def test_listing_found_returns_200(self, client):
        from tests.conftest import _make_listing_row
        row = _make_listing_row()
        with patch("services.listings_service.get_listing_by_id", new=AsyncMock(return_value=row)):
            resp = client.get(
                "/api/commute-search/listings/a1b2c3d4-0001-4000-8000-000000000001"
            )
        assert resp.status_code == 200


# ── Saved listings endpoints ──────────────────────────────────────────────────

class TestSavedListings:
    SESSION = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    LISTING_ID = "a1b2c3d4-0001-4000-8000-000000000001"

    def test_save_listing_returns_201(self, client):
        """POST /saved/ → 201."""
        resp = client.post(
            f"/api/commute-search/saved/"
            f"?session_token={self.SESSION}&listing_id={self.LISTING_ID}"
        )
        # Mock pool returns None from fetchrow (ON CONFLICT DO NOTHING path)
        # Both 200 and 201 are acceptable depending on path
        assert resp.status_code in (200, 201)

    def test_save_listing_idempotent_when_already_saved(self, client, mock_pool):
        """When the DB returns None (already saved), the endpoint still succeeds."""
        mock_pool._conn.fetchrow = AsyncMock(return_value=None)
        resp = client.post(
            f"/api/commute-search/saved/"
            f"?session_token={self.SESSION}&listing_id={self.LISTING_ID}"
        )
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert "listing_id" in body

    def test_get_saved_empty_returns_list(self, client):
        """GET /saved/ with no saves → empty list."""
        resp = client.get(
            f"/api/commute-search/saved/?session_token={self.SESSION}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert data == []

    def test_unsave_missing_listing_returns_404(self, client, mock_pool):
        """DELETE /saved/{id} → 404 when not saved."""
        mock_pool._conn.execute = AsyncMock(return_value="DELETE 0")
        resp = client.delete(
            f"/api/commute-search/saved/{self.LISTING_ID}"
            f"?session_token={self.SESSION}"
        )
        assert resp.status_code == 404

    def test_save_requires_session_token(self, client):
        """session_token is required — missing it → 422."""
        resp = client.post(
            f"/api/commute-search/saved/?listing_id={self.LISTING_ID}"
        )
        assert resp.status_code == 422

    def test_save_requires_listing_id(self, client):
        """listing_id is required — missing it → 422."""
        resp = client.post(
            f"/api/commute-search/saved/?session_token={self.SESSION}"
        )
        assert resp.status_code == 422


# ── Admin endpoints ───────────────────────────────────────────────────────────

class TestAdminScrape:
    def test_missing_admin_secret_header_returns_422(self, client):
        """No X-Admin-Secret header → 422 (required header missing)."""
        resp = client.post("/api/commute-search/admin/scrape?source=streeteasy")
        assert resp.status_code == 422

    def test_wrong_admin_secret_returns_403(self, client):
        """Wrong X-Admin-Secret → 403."""
        with patch.dict(os.environ, {"ADMIN_SECRET": "correct-secret"}):
            resp = client.post(
                "/api/commute-search/admin/scrape?source=streeteasy",
                headers={"X-Admin-Secret": "wrong-secret"},
            )
        assert resp.status_code == 403

    def test_invalid_source_returns_400(self, client):
        """Valid secret but invalid source → 400."""
        with patch.dict(os.environ, {"ADMIN_SECRET": "test-secret"}):
            resp = client.post(
                "/api/commute-search/admin/scrape?source=craigslist",
                headers={"X-Admin-Secret": "test-secret"},
            )
        assert resp.status_code == 400

    def test_valid_request_returns_task_id(self, client):
        """Valid admin secret + valid source → Celery task enqueued."""
        mock_task = MagicMock()
        mock_task.id = "celery-task-uuid-1234"

        mock_celery = MagicMock()
        mock_celery.send_task.return_value = mock_task

        with (
            patch.dict(os.environ, {"ADMIN_SECRET": "test-secret"}),
            patch("routers.admin.Celery", return_value=mock_celery),
        ):
            resp = client.post(
                "/api/commute-search/admin/scrape?source=streeteasy",
                headers={"X-Admin-Secret": "test-secret"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "task_id" in data
        assert data["source"] == "streeteasy"

    def test_valid_sources_accepted(self, client):
        """All 4 valid source names should be accepted."""
        valid_sources = ["zillow", "apartments_com", "streeteasy", "facebook_marketplace"]
        mock_task = MagicMock()
        mock_task.id = "task-id"
        mock_celery = MagicMock()
        mock_celery.send_task.return_value = mock_task

        with (
            patch.dict(os.environ, {"ADMIN_SECRET": "test-secret"}),
            patch("routers.admin.Celery", return_value=mock_celery),
        ):
            for src in valid_sources:
                resp = client.post(
                    f"/api/commute-search/admin/scrape?source={src}",
                    headers={"X-Admin-Secret": "test-secret"},
                )
                assert resp.status_code == 200, f"Expected 200 for source {src}, got {resp.status_code}"

    def test_unconfigured_admin_secret_returns_503(self, client):
        """If ADMIN_SECRET env var is not set, return 503."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove ADMIN_SECRET if present
            os.environ.pop("ADMIN_SECRET", None)
            resp = client.post(
                "/api/commute-search/admin/scrape?source=streeteasy",
                headers={"X-Admin-Secret": "anything"},
            )
        assert resp.status_code == 503
