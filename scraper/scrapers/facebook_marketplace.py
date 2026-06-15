"""
FacebookMarketplaceScraper — opt-in, session-cookie based scraper.
FB_ENABLED=false by default due to ToS risk.
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

from .base import BaseScraper, MAX_RETRIES, RETRY_BACKOFF

logger = logging.getLogger(__name__)

MOCK_FIXTURE = "facebook_fixtures.json"
FB_LOGIN_URL = "https://www.facebook.com/login"


class FacebookMarketplaceScraper(BaseScraper):
    """
    Scrapes Facebook Marketplace for rental listings.

    Guards:
    - If FB_ENABLED != "true", immediately returns mock data.
    - Loads Playwright storage_state from FB_SESSION_PATH for persistent session.
    - Uses a sticky BrightData IP to avoid triggering Facebook's location-change alerts.
    - Extracts listing data from __bbox.require JSON embedded in HTML.
    - Falls back to mock data on session expiry (redirect to login page).
    """

    def __init__(self) -> None:
        super().__init__(
            source_name="facebook_marketplace",
            use_proxy=True,
            sticky_session=True,  # Facebook requires stable IP
        )
        self._fb_enabled = os.getenv("FB_ENABLED", "false").lower() == "true"
        self._session_path = os.getenv("FB_SESSION_PATH", "/run/secrets/fb_session.json")

    async def scrape(self, city: str = "new-york", state: str = "ny") -> list[dict]:
        # Always return mock if not explicitly enabled
        if not self._fb_enabled:
            logger.info("FB_ENABLED=false — returning Facebook Marketplace mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        if self._use_mock:
            logger.info("USE_MOCK_DATA=true — returning Facebook Marketplace fixture data")
            return self._load_mock_data(MOCK_FIXTURE)

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("Playwright not installed — returning Facebook mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        # Check session file exists
        session_path = Path(self._session_path)
        if not session_path.exists():
            logger.warning("FB session file not found at %s — returning mock data", self._session_path)
            return self._load_mock_data(MOCK_FIXTURE)

        try:
            with open(session_path, "r", encoding="utf-8") as f:
                storage_state = json.load(f)
        except Exception as exc:
            logger.error("Failed to load FB session: %s", exc)
            return self._load_mock_data(MOCK_FIXTURE)

        # Build city slug for Facebook
        city_slug = city.lower().replace("-", "").replace(" ", "")

        listings: list[dict] = []
        browser = context = pw = None

        try:
            browser, context, pw = await self.launch_browser(session_id="fb_sticky_001")

            # Apply stored session cookies / localStorage
            await context.add_cookies(storage_state.get("cookies", []))

            page = await context.new_page()
            target_url = f"https://www.facebook.com/marketplace/{city_slug}/rentals"

            logger.info("Facebook: navigating to %s", target_url)
            resp = await page.goto(target_url, wait_until="networkidle", timeout=45000)

            # Check for login redirect (session expired)
            current_url = page.url
            if "login" in current_url or "checkpoint" in current_url:
                logger.warning("Facebook: session expired — redirect to login detected. Returning mock data.")
                return self._load_mock_data(MOCK_FIXTURE)

            if resp and resp.status in (401, 403):
                logger.warning("Facebook: auth error %d — returning mock data", resp.status)
                return self._load_mock_data(MOCK_FIXTURE)

            await self.random_delay(3.0, 6.0)

            # Extract __bbox.require JSON from page HTML
            html = await page.content()
            listings = _extract_bbox_listings(html)

            if not listings:
                # Fallback: try to parse visible listing cards
                cards = await page.query_selector_all('[data-testid="marketplace_feed_item"]')
                for card in cards:
                    raw = await _extract_marketplace_card(card)
                    if raw:
                        listings.append(raw)

            logger.info("Facebook: found %d listings", len(listings))

        except Exception as exc:
            logger.error("Facebook: scraper error: %s", exc, exc_info=True)
            return self._load_mock_data(MOCK_FIXTURE)
        finally:
            if context:
                await context.close()
            if browser:
                await browser.close()
            if pw:
                await pw.__aexit__(None, None, None)

        if not listings:
            logger.warning("Facebook: no listings extracted — returning mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        return listings


def _extract_bbox_listings(html: str) -> list[dict]:
    """
    Extract listings from Facebook's __bbox.require JSON embedded in HTML.
    Facebook embeds market listing data in a large JSON structure.
    """
    listings = []

    # Facebook encodes data in requireLazy or __bbox.require calls
    # Pattern: ,"marketplace_listing_item":{"id":"...","price":...}
    pattern = re.compile(r'"marketplace_listing_item"\s*:\s*(\{[^}]{20,}?\})', re.DOTALL)

    # A more reliable approach: find the JSON blob
    bbox_pattern = re.compile(r'__bbox\s*=\s*(\{.*?\});\s*</script>', re.DOTALL)
    bbox_match = bbox_pattern.search(html)

    if bbox_match:
        try:
            data = json.loads(bbox_match.group(1))
            require = data.get("require", [])
            for item in require:
                if isinstance(item, list) and len(item) >= 4:
                    payload = item[3]
                    if isinstance(payload, dict):
                        _walk_fb_json(payload, listings)
        except Exception as exc:
            logger.debug("Facebook: __bbox parse error: %s", exc)

    # Also try inline JSON data
    if not listings:
        for match in pattern.finditer(html):
            try:
                item = json.loads(match.group(1))
                parsed = _parse_fb_listing_item(item)
                if parsed:
                    listings.append(parsed)
            except Exception:
                continue

    return listings


def _walk_fb_json(obj, results: list, depth: int = 0) -> None:
    """Recursively walk FB JSON structure to find listing objects."""
    if depth > 10:
        return
    if isinstance(obj, dict):
        if "listing_id" in obj or ("id" in obj and "price" in obj and "location" in obj):
            parsed = _parse_fb_listing_item(obj)
            if parsed:
                results.append(parsed)
                return
        for value in obj.values():
            _walk_fb_json(value, results, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            _walk_fb_json(item, results, depth + 1)


def _parse_fb_listing_item(item: dict) -> Optional[dict]:
    """Convert a raw Facebook listing JSON object to our normalized format."""
    try:
        price_info = item.get("listing_price") or item.get("price") or {}
        if isinstance(price_info, dict):
            price = price_info.get("amount") or price_info.get("formatted_amount")
        else:
            price = price_info

        location = item.get("location") or {}
        address = location.get("reverse_geocode") or {}

        return {
            "id": str(item.get("listing_id") or item.get("id", "")),
            "price": price,
            "title": item.get("listing_title") or item.get("title"),
            "description": item.get("description") or item.get("listing_title"),
            "address_line1": address.get("street") or location.get("address"),
            "city": address.get("city") or location.get("city", "New York"),
            "state": address.get("state") or location.get("state", "NY"),
            "zip_code": address.get("zip"),
            "neighborhood": address.get("neighborhood"),
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "image_urls": [
                img.get("uri") for img in (item.get("listing_photos") or [])
                if isinstance(img, dict) and img.get("uri")
            ],
            "bedrooms": item.get("housing_rental_attributes", {}).get("num_bedrooms"),
            "bathrooms": item.get("housing_rental_attributes", {}).get("num_bathrooms"),
            "pets_allowed": item.get("housing_rental_attributes", {}).get("pets_allowed"),
            "url": f"https://www.facebook.com/marketplace/item/{item.get('listing_id') or item.get('id', '')}",
        }
    except Exception:
        return None


async def _extract_marketplace_card(card) -> Optional[dict]:
    """Fallback: extract listing from a visible marketplace card element."""
    try:
        title_el = await card.query_selector("span.x1lliihq")
        price_el = await card.query_selector("[aria-label*='$'], span:has-text('$')")
        link_el = await card.query_selector("a[href*='/marketplace/item/']")
        img_el = await card.query_selector("img")

        title = (await title_el.inner_text()).strip() if title_el else None
        price = (await price_el.inner_text()).strip() if price_el else None
        url = await link_el.get_attribute("href") if link_el else None
        if url and not url.startswith("http"):
            url = f"https://www.facebook.com{url}"
        img_src = await img_el.get_attribute("src") if img_el else None

        listing_id = ""
        if url:
            m = re.search(r'/item/(\d+)', url)
            listing_id = m.group(1) if m else ""

        return {
            "id": listing_id,
            "title": title or "",
            "description": title or "",
            "price": price,
            "url": url or "",
            "image_urls": [img_src] if img_src else [],
            "city": "New York",
            "state": "NY",
        }
    except Exception:
        return None
