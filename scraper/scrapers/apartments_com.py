"""
ApartmentsComScraper — Playwright + playwright-stealth scraper for apartments.com.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Optional

from .base import BaseScraper, MAX_RETRIES, RETRY_BACKOFF, RETRY_STATUSES

logger = logging.getLogger(__name__)

MOCK_FIXTURE = "apartments_fixtures.json"
MAX_PAGES = 10
DETAIL_PAGES_PER_RUN = 3


class ApartmentsComScraper(BaseScraper):
    """
    Scrapes apartments.com using Playwright with stealth plugin.
    - Waits for article.placard listing cards
    - Extracts title, price, address, beds, baths, sqft, url from cards
    - Visits up to DETAIL_PAGES_PER_RUN detail pages for enrichment
    - Paginates via "next page" button; stops at MAX_PAGES
    """

    def __init__(self) -> None:
        super().__init__(
            source_name="apartments_com",
            use_proxy=True,
            sticky_session=False,
        )

    async def scrape(self, city: str = "new-york", state: str = "ny") -> list[dict]:
        if self._use_mock:
            logger.info("USE_MOCK_DATA=true — returning apartments.com fixture data")
            return self._load_mock_data(MOCK_FIXTURE)

        try:
            from playwright.async_api import async_playwright, TimeoutError as PWTimeout
        except ImportError:
            logger.warning("Playwright not installed — returning apartments.com mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        listings: list[dict] = []

        city_slug = city.lower().replace(" ", "-")
        state_slug = state.lower()
        base_url = f"https://www.apartments.com/{city_slug}-{state_slug}/"

        browser = context = pw = None
        try:
            browser, context, pw = await self.launch_browser()
            page = await context.new_page()

            for page_num in range(1, MAX_PAGES + 1):
                url = base_url if page_num == 1 else f"{base_url}{page_num}/"
                logger.info("apartments.com: fetching page %d: %s", page_num, url)

                retries = 0
                while retries <= MAX_RETRIES:
                    try:
                        response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                        if response and response.status in RETRY_STATUSES:
                            wait_s = RETRY_BACKOFF[min(retries, len(RETRY_BACKOFF) - 1)]
                            logger.warning(
                                "apartments.com: HTTP %d on page %d, retry %d in %ds",
                                response.status, page_num, retries + 1, wait_s,
                            )
                            await asyncio.sleep(wait_s)
                            retries += 1
                            continue
                        break
                    except Exception as exc:
                        if retries >= MAX_RETRIES:
                            logger.error("apartments.com: max retries exceeded: %s", exc)
                            return listings or self._load_mock_data(MOCK_FIXTURE)
                        retries += 1
                        await asyncio.sleep(RETRY_BACKOFF[min(retries - 1, len(RETRY_BACKOFF) - 1)])

                await self.random_mouse_movement(page)
                await self.random_delay()

                # Wait for listing cards
                try:
                    await page.wait_for_selector("article.placard", timeout=15000)
                except Exception:
                    logger.warning("apartments.com: no placard elements found on page %d", page_num)
                    break

                cards = await page.query_selector_all("article.placard")
                logger.info("apartments.com: found %d cards on page %d", len(cards), page_num)

                for card in cards:
                    raw = await self._extract_card(card, page)
                    if raw:
                        listings.append(raw)

                # Check for next page button
                next_btn = await page.query_selector("a[data-page='next']:not([aria-disabled='true'])")
                if next_btn is None:
                    # Try alternate selector
                    next_btn = await page.query_selector("a.next:not(.disabled), button.next:not(:disabled)")
                if next_btn is None:
                    logger.info("apartments.com: no next page button — stopping at page %d", page_num)
                    break

                await self.random_delay(1.0, 3.0)

            # Enrich up to DETAIL_PAGES_PER_RUN listings with detail page data
            for i, listing in enumerate(listings[:DETAIL_PAGES_PER_RUN]):
                if listing.get("url"):
                    try:
                        await self._enrich_from_detail(page, listing)
                    except Exception as exc:
                        logger.warning("apartments.com: detail enrich failed for %s: %s", listing.get("url"), exc)
                    await self.random_delay(2.0, 4.0)

        except Exception as exc:
            logger.error("apartments.com: scraper error: %s", exc, exc_info=True)
            if not listings:
                return self._load_mock_data(MOCK_FIXTURE)
        finally:
            if context:
                await context.close()
            if browser:
                await browser.close()
            if pw:
                await pw.__aexit__(None, None, None)

        if not listings:
            logger.warning("apartments.com: no listings found — returning mock data")
            return self._load_mock_data(MOCK_FIXTURE)

        return listings

    async def _extract_card(self, card, page) -> Optional[dict]:
        """Extract fields from a listing card element."""
        try:
            # Title / property name
            title_el = await card.query_selector(".property-title, .js-placardTitle, h2.title")
            title = (await title_el.inner_text()).strip() if title_el else None

            # Price
            price_el = await card.query_selector(".price-range, .property-rents, .price")
            price_text = (await price_el.inner_text()).strip() if price_el else None

            # Address
            addr_el = await card.query_selector(".property-address, .property-location, address")
            address = (await addr_el.inner_text()).strip() if addr_el else None

            # Beds/baths/sqft
            info_el = await card.query_selector(".property-beds, .bed-range, .property-info")
            info_text = (await info_el.inner_text()).strip() if info_el else ""

            beds = _extract_beds(info_text)
            baths = _extract_baths(info_text)
            sqft = _extract_sqft(info_text)

            # URL
            link_el = await card.query_selector("a.property-link, a.placard-header")
            url = await link_el.get_attribute("href") if link_el else None
            if url and not url.startswith("http"):
                url = f"https://www.apartments.com{url}"

            # External ID from URL or data attribute
            external_id = await card.get_attribute("data-listingid") or _id_from_url(url or "")

            # Images
            img_els = await card.query_selector_all("img.js-lazy-image, .photo-cards img")
            images = []
            for img in img_els:
                src = await img.get_attribute("data-src") or await img.get_attribute("src")
                if src and src.startswith("http"):
                    images.append(src)

            if not price_text and not url:
                return None

            # Parse city/state/zip from address
            city, state, zipcode = _parse_address_parts(address or "")

            return {
                "external_id": external_id or url or "",
                "title": title or "",
                "price": price_text,
                "address": _address_line1(address or ""),
                "city": city or "New York",
                "state": state or "NY",
                "zip_code": zipcode,
                "bedrooms": beds,
                "bathrooms": baths,
                "square_feet": sqft,
                "url": url,
                "images": images,
                "description": None,
                "amenities": [],
            }
        except Exception as exc:
            logger.debug("apartments.com: card extraction error: %s", exc)
            return None

    async def _enrich_from_detail(self, page, listing: dict) -> None:
        """Visit a detail page to enrich a listing with description, amenities, coordinates."""
        url = listing.get("url")
        if not url:
            return

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self.random_delay(1.5, 3.0)

            # Description
            desc_el = await page.query_selector(".description, .property-description, [data-testid='description']")
            if desc_el:
                listing["description"] = (await desc_el.inner_text()).strip()

            # Amenities list
            amenity_els = await page.query_selector_all(".amenity-list li, .amenities li, .feature-list li")
            amenities = [(await el.inner_text()).strip() for el in amenity_els]
            listing["amenities"] = [a for a in amenities if a]

            # Coordinates from schema.org or data attributes
            schema_el = await page.query_selector("script[type='application/ld+json']")
            if schema_el:
                import json
                try:
                    schema = json.loads(await schema_el.inner_text())
                    geo = schema.get("geo") or {}
                    if geo.get("latitude"):
                        listing["latitude"] = float(geo["latitude"])
                        listing["longitude"] = float(geo["longitude"])
                except Exception:
                    pass

        except Exception as exc:
            logger.debug("apartments.com: detail page enrichment failed for %s: %s", url, exc)


# ── Helper functions ──────────────────────────────────────────────────────────

def _extract_beds(text: str) -> Optional[str]:
    m = re.search(r'(\d+)\s*(?:bd|bed|bedroom)', text, re.IGNORECASE)
    if m:
        return m.group(1)
    if "studio" in text.lower():
        return "Studio"
    return None


def _extract_baths(text: str) -> Optional[str]:
    m = re.search(r'(\d+(?:\.\d)?)\s*(?:ba|bath|bathroom)', text, re.IGNORECASE)
    return m.group(1) if m else None


def _extract_sqft(text: str) -> Optional[str]:
    m = re.search(r'([\d,]+)\s*(?:sq\s*ft|sqft|sf)', text, re.IGNORECASE)
    return m.group(1).replace(",", "") if m else None


def _address_line1(full_address: str) -> str:
    """Extract street address (first line before city/state)."""
    parts = full_address.split(",")
    return parts[0].strip() if parts else full_address


def _parse_address_parts(full_address: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Attempt to extract city, state, zip from a full address string."""
    # e.g. "123 Main St, New York, NY 10001"
    parts = [p.strip() for p in full_address.split(",")]
    city = state = zipcode = None
    if len(parts) >= 3:
        city = parts[-2].strip()
        state_zip = parts[-1].strip()
        m = re.match(r'([A-Z]{2})\s+(\d{5})', state_zip)
        if m:
            state = m.group(1)
            zipcode = m.group(2)
        else:
            state = state_zip[:2]
    elif len(parts) == 2:
        city = parts[1].strip()
    return city, state, zipcode


def _id_from_url(url: str) -> str:
    """Extract a slug-like ID from an apartments.com URL."""
    # e.g. https://www.apartments.com/the-smith-nyc-new-york-ny/abc123/
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else ""
