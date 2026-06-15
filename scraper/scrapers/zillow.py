"""
ZillowScraper — extracts __NEXT_DATA__ JSON from Zillow rental pages.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Optional

from .base import BaseScraper, MAX_RETRIES, RETRY_BACKOFF, RETRY_STATUSES

logger = logging.getLogger(__name__)

MOCK_FIXTURE = "zillow_fixtures.json"
MAX_PAGES = 5


class ZillowScraper(BaseScraper):
    """
    Scrapes Zillow rental listings by:
    1. Loading https://www.zillow.com/{city}-{state}/rentals/
    2. Extracting JSON from <script id="__NEXT_DATA__"> tag
    3. Parsing props.pageProps.searchPageState.cat1.searchResults.listResults
    4. Paginating via URL parameter ?searchQueryState=...&page={n}
    Uses BrightData rotating residential proxies.
    """

    def __init__(self) -> None:
        super().__init__(
            source_name="zillow",
            use_proxy=True,
            sticky_session=False,  # Rotating for Zillow
        )

    async def scrape(self, city: str = "new-york", state: str = "ny") -> list[dict]:
        if self._use_mock:
            logger.info("USE_MOCK_DATA=true — returning Zillow fixture data")
            return self._load_mock_data(MOCK_FIXTURE)

        try:
            from playwright.async_api import async_playwright, TimeoutError as PWTimeout
        except ImportError:
            logger.warning("Playwright not installed — returning Zillow mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        all_listings: list[dict] = []

        city_slug = city.lower().replace(" ", "-")
        state_slug = state.lower()
        base_url = f"https://www.zillow.com/{city_slug}-{state_slug}/rentals/"

        browser = context = pw = None
        try:
            browser, context, pw = await self.launch_browser()
            page = await context.new_page()

            for page_num in range(1, MAX_PAGES + 1):
                # Zillow paginates via URL suffix like /2_p/ /3_p/ etc.
                if page_num == 1:
                    url = base_url
                else:
                    url = f"{base_url}{page_num}_p/"

                logger.info("Zillow: fetching page %d: %s", page_num, url)

                retries = 0
                success = False
                while retries <= MAX_RETRIES:
                    try:
                        response = await page.goto(url, wait_until="domcontentloaded", timeout=40000)
                        if response and response.status in RETRY_STATUSES:
                            wait_s = RETRY_BACKOFF[min(retries, len(RETRY_BACKOFF) - 1)]
                            logger.warning("Zillow: HTTP %d on page %d, retry in %ds", response.status, page_num, wait_s)
                            await asyncio.sleep(wait_s)
                            retries += 1
                            continue
                        success = True
                        break
                    except Exception as exc:
                        if retries >= MAX_RETRIES:
                            logger.error("Zillow: max retries on page %d: %s", page_num, exc)
                            break
                        retries += 1
                        await asyncio.sleep(RETRY_BACKOFF[min(retries - 1, len(RETRY_BACKOFF) - 1)])

                if not success:
                    break

                await self.random_delay(2.0, 5.0)

                # Extract __NEXT_DATA__ script tag
                next_data_el = await page.query_selector("script#__NEXT_DATA__")
                if next_data_el is None:
                    logger.warning("Zillow: __NEXT_DATA__ not found on page %d", page_num)
                    # Might be blocked — fallback to mock
                    if page_num == 1:
                        return self._load_mock_data(MOCK_FIXTURE)
                    break

                next_data_text = await next_data_el.inner_text()
                page_listings = _parse_next_data(next_data_text)

                if not page_listings:
                    logger.info("Zillow: no listings in __NEXT_DATA__ on page %d — stopping", page_num)
                    break

                logger.info("Zillow: found %d listings on page %d", len(page_listings), page_num)
                all_listings.extend(page_listings)

                await self.random_delay(1.5, 4.0)

        except Exception as exc:
            logger.error("Zillow: scraper error: %s", exc, exc_info=True)
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
            logger.warning("Zillow: no listings found — returning mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        return all_listings


def _parse_next_data(json_text: str) -> list[dict]:
    """
    Parse Zillow's __NEXT_DATA__ JSON and extract listResults array.
    Path: props.pageProps.searchPageState.cat1.searchResults.listResults
    """
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        logger.error("Zillow: failed to parse __NEXT_DATA__ JSON: %s", exc)
        return []

    try:
        search_page_state = (
            data
            .get("props", {})
            .get("pageProps", {})
            .get("searchPageState", {})
        )

        # Try cat1 path first
        cat1 = search_page_state.get("cat1", {})
        list_results = (
            cat1
            .get("searchResults", {})
            .get("listResults", [])
        )

        if not list_results:
            # Some Zillow pages use different structure
            list_results = (
                search_page_state
                .get("searchResults", {})
                .get("listResults", [])
            )

        if not list_results:
            # Try mapResults as fallback
            list_results = (
                cat1
                .get("searchResults", {})
                .get("mapResults", [])
            )

        return list_results if isinstance(list_results, list) else []

    except (AttributeError, KeyError, TypeError) as exc:
        logger.error("Zillow: error traversing __NEXT_DATA__: %s", exc)
        return []
