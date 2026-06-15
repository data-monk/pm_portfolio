#!/usr/bin/env python3
"""
Standalone scraper runner — no Celery, no queue.
Runs one scraper, normalizes results, and upserts directly to Postgres.

Usage:
    python3 run_scraper.py apartments_com
    python3 run_scraper.py streeteasy
    python3 run_scraper.py zillow
    python3 run_scraper.py --all

Reads env from ../server/.env automatically.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import pathlib
import uuid
from typing import Optional

# ── Load server/.env before anything else ────────────────────────────────────
_env_file = pathlib.Path(__file__).resolve().parent.parent / "server" / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _, _v = _line.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import asyncpg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("run_scraper")

SOURCES = ["apartments_com", "streeteasy", "zillow"]
CS_DSN = os.getenv("CS_POSTGRES_DSN", "postgresql://prasun@localhost:5432/commute_search")


async def get_source_id(conn: asyncpg.Connection, source_name: str) -> Optional[int]:
    row = await conn.fetchrow("SELECT id FROM cs_sources WHERE name = $1", source_name)
    return row["id"] if row else None


async def upsert_listing(conn: asyncpg.Connection, normalized, source_id: int) -> tuple[str, bool]:
    existing = await conn.fetchrow(
        "SELECT id FROM cs_listings WHERE source_id = $1 AND external_id = $2",
        source_id, normalized.external_id,
    )

    if existing:
        await conn.execute(
            """
            UPDATE cs_listings SET
                price = $1, address_line1 = $2, city = $3, state = $4,
                zip_code = $5, neighborhood = $6, bedrooms = $7, bathrooms = $8,
                square_feet = $9, description = $10, image_urls = $11,
                has_doorman = $12, has_elevator = $13, has_gym = $14,
                has_laundry_in_unit = $15, has_laundry_in_bldg = $16,
                has_dishwasher = $17, has_ac = $18, pets_allowed = $19,
                has_outdoor_space = $20, is_active = TRUE, last_seen_at = NOW(),
                raw_metadata = $21
            WHERE id = $22
            """,
            normalized.price, normalized.address_line1, normalized.city, normalized.state,
            normalized.zip_code, normalized.neighborhood, normalized.bedrooms, normalized.bathrooms,
            normalized.square_feet, normalized.description, normalized.image_urls,
            normalized.has_doorman, normalized.has_elevator, normalized.has_gym,
            normalized.has_laundry_in_unit, normalized.has_laundry_in_bldg,
            normalized.has_dishwasher, normalized.has_ac, normalized.pets_allowed,
            normalized.has_outdoor_space, json.dumps(normalized.raw_metadata),
            existing["id"],
        )
        if normalized.latitude is not None:
            await conn.execute(
                "UPDATE cs_listings SET latitude = $1, longitude = $2 WHERE id = $3",
                normalized.latitude, normalized.longitude, existing["id"],
            )
        return str(existing["id"]), False

    new_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO cs_listings (
            id, source_id, external_id,
            address_line1, city, state, zip_code, neighborhood,
            listing_type, bedrooms, bathrooms, square_feet,
            price, fee_type,
            has_doorman, has_elevator, has_gym, has_laundry_in_unit,
            has_laundry_in_bldg, has_dishwasher, has_ac, pets_allowed,
            has_outdoor_space, listing_url, image_urls, description,
            latitude, longitude, is_active, raw_metadata,
            first_seen_at, last_seen_at
        ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21, $22,
            $23, $24, $25, $26,
            $27, $28, TRUE, $29,
            NOW(), NOW()
        )
        """,
        new_id, source_id, normalized.external_id,
        normalized.address_line1, normalized.city, normalized.state, normalized.zip_code, normalized.neighborhood,
        normalized.listing_type, normalized.bedrooms, normalized.bathrooms, normalized.square_feet,
        normalized.price, normalized.fee_type,
        normalized.has_doorman, normalized.has_elevator, normalized.has_gym, normalized.has_laundry_in_unit,
        normalized.has_laundry_in_bldg, normalized.has_dishwasher, normalized.has_ac, normalized.pets_allowed,
        normalized.has_outdoor_space, normalized.listing_url, normalized.image_urls, normalized.description,
        normalized.latitude, normalized.longitude, json.dumps(normalized.raw_metadata),
    )
    return new_id, True


async def run_source(source_name: str, conn: asyncpg.Connection) -> dict:
    from scrapers.apartments_com import ApartmentsComScraper
    from scrapers.streeteasy import StreetEasyScraper
    from scrapers.zillow import ZillowScraper
    from pipeline.normalizer import normalize

    scrapers = {
        "apartments_com": ApartmentsComScraper,
        "streeteasy": StreetEasyScraper,
        "zillow": ZillowScraper,
    }

    cls = scrapers.get(source_name)
    if cls is None:
        raise ValueError(f"Unknown source: {source_name!r}")

    source_id = await get_source_id(conn, source_name)
    if source_id is None:
        raise RuntimeError(f"Source '{source_name}' not in cs_sources table — run database/commute-search-schema.sql first")

    logger.info("=== Scraping %s ===", source_name)
    scraper = cls()
    raw_listings = await scraper.scrape(city="new-york", state="ny")
    logger.info("%s: got %d raw listings", source_name, len(raw_listings))

    new_count = updated_count = skipped_count = 0
    for raw in raw_listings:
        try:
            normalized = normalize(raw, source_name)
        except Exception as exc:
            logger.debug("normalize error: %s", exc)
            skipped_count += 1
            continue

        if normalized is None:
            skipped_count += 1
            continue

        try:
            _, is_new = await upsert_listing(conn, normalized, source_id)
            if is_new:
                new_count += 1
            else:
                updated_count += 1
        except Exception as exc:
            logger.warning("upsert error for %s: %s", normalized.external_id, exc)
            skipped_count += 1

    result = {
        "source": source_name,
        "raw": len(raw_listings),
        "new": new_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }
    logger.info(
        "%s: done — raw=%d new=%d updated=%d skipped=%d",
        source_name, result["raw"], result["new"], result["updated"], result["skipped"],
    )
    return result


async def main(sources: list[str]) -> None:
    conn = await asyncpg.connect(CS_DSN)
    try:
        results = []
        for source in sources:
            try:
                result = await run_source(source, conn)
                results.append(result)
            except Exception as exc:
                logger.error("FAILED %s: %s", source, exc, exc_info=True)
                results.append({"source": source, "error": str(exc)})

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for r in results:
            if "error" in r:
                print(f"  {r['source']:20s}  ERROR: {r['error']}")
            else:
                print(
                    f"  {r['source']:20s}  raw={r['raw']:3d}  new={r['new']:3d}  "
                    f"updated={r['updated']:3d}  skipped={r['skipped']:3d}"
                )
        print("=" * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run scrapers directly (no Celery)")
    parser.add_argument(
        "sources",
        nargs="*",
        choices=SOURCES + ["all"],
        default=["apartments_com"],
        help=f"Source(s) to scrape. Options: {SOURCES + ['all']}",
    )
    args = parser.parse_args()

    sources_to_run = SOURCES if "all" in args.sources else args.sources
    asyncio.run(main(sources_to_run))
