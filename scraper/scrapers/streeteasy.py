"""
StreetEasyScraper — XHR interception strategy for streeteasy.com (NYC only).
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from .base import BaseScraper, MAX_RETRIES, RETRY_BACKOFF, RETRY_STATUSES

logger = logging.getLogger(__name__)

MOCK_FIXTURE = "streeteasy_fixtures.json"

# StreetEasy is NYC-specific; these are the target boroughs
NYC_BOROUGHS = [
    ("manhattan", "ny"),
    ("brooklyn", "ny"),
    ("queens", "ny"),
    ("bronx", "ny"),
]

MAX_PAGES_PER_BOROUGH = 5


class StreetEasyScraper(BaseScraper):
    """
    Scrapes StreetEasy by intercepting XHR responses from /api/v1/listings.
    Supports cursor-based pagination from the intercepted JSON.
    NYC boroughs only.
    """

    def __init__(self) -> None:
        super().__init__(
            source_name="streeteasy",
            use_proxy=True,
            sticky_session=False,
        )
        self._captured: list[dict] = []

    async def scrape(self, city: str = "new-york", state: str = "ny") -> list[dict]:
        if self._use_mock:
            logger.info("USE_MOCK_DATA=true — returning StreetEasy fixture data")
            return self._load_mock_data(MOCK_FIXTURE)

        try:
            from playwright.async_api import async_playwright, TimeoutError as PWTimeout
        except ImportError:
            logger.warning("Playwright not installed — returning StreetEasy mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        all_listings: list[dict] = []

        browser = context = pw = None
        try:
            browser, context, pw = await self.launch_browser()
            page = await context.new_page()

            # Intercept XHR responses from the listings API
            captured_responses: list[dict] = []

            async def handle_response(response):
                url = response.url
                if "/api/v1/listings" in url or "/rentals" in url and "json" in response.headers.get("content-type", ""):
                    try:
                        body = await response.json()
                        if isinstance(body, dict) and (body.get("listings") or body.get("data")):
                            captured_responses.append(body)
                    except Exception:
                        pass

            page.on("response", handle_response)

            for borough, _ in NYC_BOROUGHS:
                captured_responses.clear()
                borough_listings: list[dict] = []

                base_url = f"https://streeteasy.com/{borough}/rentals"
                logger.info("StreetEasy: scraping borough: %s", borough)

                retries = 0
                while retries <= MAX_RETRIES:
                    try:
                        resp = await page.goto(base_url, wait_until="networkidle", timeout=40000)
                        if resp and resp.status in RETRY_STATUSES:
                            wait_s = RETRY_BACKOFF[min(retries, len(RETRY_BACKOFF) - 1)]
                            logger.warning("StreetEasy: HTTP %d for %s, retry in %ds", resp.status, borough, wait_s)
                            await asyncio.sleep(wait_s)
                            retries += 1
                            continue
                        break
                    except Exception as exc:
                        if retries >= MAX_RETRIES:
                            logger.error("StreetEasy: max retries for %s: %s", borough, exc)
                            break
                        retries += 1
                        await asyncio.sleep(RETRY_BACKOFF[min(retries - 1, len(RETRY_BACKOFF) - 1)])

                await self.random_delay()

                # Process captured XHR responses
                for page_num in range(MAX_PAGES_PER_BOROUGH):
                    for response_body in captured_responses:
                        listings_in_response = (
                            response_body.get("listings")
                            or response_body.get("data", {}).get("listings")
                            or []
                        )
                        for listing in listings_in_response:
                            if isinstance(listing, dict):
                                listing["_borough"] = borough
                                borough_listings.append(listing)

                    captured_responses.clear()

                    # Try to paginate — look for next page link
                    next_btn = await page.query_selector("a[rel='next'], .pagination-next a, button[data-testid='next-page']")
                    if next_btn is None:
                        break

                    await next_btn.click()
                    await self.random_delay(2.0, 4.0)
                    # Wait for new XHR responses
                    await asyncio.sleep(2.0)

                logger.info("StreetEasy: %d listings from %s", len(borough_listings), borough)
                all_listings.extend(borough_listings)

        except Exception as exc:
            logger.error("StreetEasy: scraper error: %s", exc, exc_info=True)
            if not all_listings:
                return self._load_mock_data(MOCK_FIXTURE)
        finally:
            if context:
                await context.close()
            if browser:
                await browser.close()
            if pw:
                await pw.__aexit__(None, None, None)

        if not all_listings:
            logger.warning("StreetEasy: no listings found — returning mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        return all_listings
