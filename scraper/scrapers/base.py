"""
BaseScraper ABC — Playwright browser launch, BrightData proxy config, retry helpers.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)

# Retry configuration
RETRY_STATUSES = [403, 429, 503]
MAX_RETRIES = 3
RETRY_BACKOFF = [30, 120, 600]  # seconds between retries

BRIGHTDATA_HOST = "brd.superproxy.io"
BRIGHTDATA_PORT = 22225


class BaseScraper(ABC):
    """
    Abstract base for all scrapers.
    Handles:
      - BrightData proxy URL building (rotating or sticky session)
      - Playwright Chromium launch with stealth
      - Random human-like delays
      - Retry logic on bot-detection status codes
    """

    def __init__(
        self,
        source_name: str,
        use_proxy: bool = True,
        sticky_session: bool = False,
    ) -> None:
        self.source_name = source_name
        self.use_proxy = use_proxy
        self.sticky_session = sticky_session
        self._username = os.getenv("BRIGHTDATA_USERNAME", "")
        self._password = os.getenv("BRIGHTDATA_PASSWORD", "")
        self._use_mock = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

    # ── Proxy URL builder ─────────────────────────────────────────────────────

    def get_proxy_url(self, session_id: str | None = None) -> str | None:
        """
        Build a BrightData residential proxy URL.
        Rotating: brd-customer-xxx:password@brd.superproxy.io:22225
        Sticky:   brd-customer-xxx-session-<id>:password@brd.superproxy.io:22225
        Returns None if credentials are not configured.
        """
        if not self.use_proxy or not self._username or not self._password:
            return None

        username = self._username
        if self.sticky_session and session_id:
            username = f"{username}-session-{session_id}"

        return f"http://{username}:{self._password}@{BRIGHTDATA_HOST}:{BRIGHTDATA_PORT}"

    # ── Browser launch ────────────────────────────────────────────────────────

    async def launch_browser(self, session_id: str | None = None):
        """
        Launch Playwright Chromium with stealth and optional BrightData proxy.
        Returns (browser, context).
        Raises ImportError if playwright is not installed.
        """
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise ImportError(
                "playwright is not installed. "
                "Run: pip install playwright && playwright install chromium"
            )

        try:
            from playwright_stealth import stealth_async
        except ImportError:
            stealth_async = None
            logger.warning("playwright-stealth not installed; running without stealth")

        proxy_url = self.get_proxy_url(session_id)
        proxy_config = None
        if proxy_url:
            proxy_config = {"server": proxy_url}

        pw = await async_playwright().__aenter__()

        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ]

        browser = await pw.chromium.launch(
            headless=True,
            args=browser_args,
            proxy=proxy_config,
        )

        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
        )

        if stealth_async is not None:
            page = await context.new_page()
            await stealth_async(page)
            await page.close()

        return browser, context, pw

    # ── Human-like delays ─────────────────────────────────────────────────────

    @staticmethod
    async def random_delay(min_s: float = 2.5, max_s: float = 6.0) -> None:
        """Sleep for a random duration to mimic human browsing."""
        delay = random.uniform(min_s, max_s)
        await asyncio.sleep(delay)

    @staticmethod
    async def random_mouse_movement(page) -> None:
        """Move mouse to random positions to evade bot detection."""
        for _ in range(random.randint(2, 5)):
            x = random.randint(100, 1100)
            y = random.randint(100, 700)
            await page.mouse.move(x, y, steps=random.randint(5, 15))
            await asyncio.sleep(random.uniform(0.1, 0.4))

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    async def scrape(self, city: str, state: str) -> list[dict]:
        """
        Scrape listings for the given city/state.
        Returns a list of raw dicts (source-specific field names).
        Must implement USE_MOCK_DATA fallback.
        """
        ...

    # ── Mock data loader ──────────────────────────────────────────────────────

    def _load_mock_data(self, fixture_filename: str) -> list[dict]:
        """Load mock fixture JSON from mock_data/ directory."""
        import json
        import pathlib

        fixture_path = pathlib.Path(__file__).parent.parent / "mock_data" / fixture_filename
        if not fixture_path.exists():
            logger.warning("Mock fixture not found: %s", fixture_path)
            return []
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        return data.get("listings", [])
