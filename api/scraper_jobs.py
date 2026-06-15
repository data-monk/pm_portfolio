"""
Shared in-memory store for direct scrape jobs (no Celery required).
Imported by both the admin and listings routers.
"""
from __future__ import annotations

import json
import logging
import pathlib
import sys
import uuid

logger = logging.getLogger(__name__)

# job_id → {"status": "running"|"done"|"failed", "source": str, "new": int, "updated": int, "error": str|None}
_jobs: dict[str, dict] = {}

VALID_SOURCES = {"apartments_com", "streeteasy", "zillow"}


def create_job(source: str) -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running", "source": source, "new": 0, "updated": 0, "error": None}
    return job_id


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def update_job(job_id: str, **kwargs) -> None:
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


async def run_scraper_direct(job_id: str, source: str, city: str, state: str, pool) -> None:
    """Background coroutine: run scraper → normalize → upsert to DB."""
    scraper_dir = str(pathlib.Path(__file__).resolve().parent.parent / "scraper")
    if scraper_dir not in sys.path:
        sys.path.insert(0, scraper_dir)

    try:
        from scrapers.apartments_com import ApartmentsComScraper
        from scrapers.streeteasy import StreetEasyScraper
        from scrapers.zillow import ZillowScraper
        from pipeline.normalizer import normalize

        scraper_cls = {
            "apartments_com": ApartmentsComScraper,
            "streeteasy": StreetEasyScraper,
            "zillow": ZillowScraper,
        }[source]

        scraper = scraper_cls()
        raw_listings = await scraper.scrape(city=city, state=state)
        logger.info("scrape-direct %s: %d raw listings", source, len(raw_listings))

        async with pool.acquire() as conn:
            source_row = await conn.fetchrow("SELECT id FROM cs_sources WHERE name = $1", source)
            if source_row is None:
                raise RuntimeError(f"Source '{source}' not in cs_sources")
            source_id = source_row["id"]

            new_count = updated_count = 0
            for raw in raw_listings:
                try:
                    normalized = normalize(raw, source)
                except Exception:
                    continue
                if normalized is None:
                    continue

                existing = await conn.fetchrow(
                    "SELECT id FROM cs_listings WHERE source_id = $1 AND external_id = $2",
                    source_id, normalized.external_id,
                )

                if existing:
                    await conn.execute(
                        """
                        UPDATE cs_listings SET
                            price=$1, address_line1=$2, city=$3, state=$4, zip_code=$5,
                            neighborhood=$6, bedrooms=$7, bathrooms=$8, square_feet=$9,
                            description=$10, image_urls=$11,
                            has_doorman=$12, has_elevator=$13, has_gym=$14,
                            has_laundry_in_unit=$15, has_laundry_in_bldg=$16,
                            has_dishwasher=$17, has_ac=$18, pets_allowed=$19,
                            has_outdoor_space=$20, is_active=TRUE, last_seen_at=NOW(),
                            raw_metadata=$21
                        WHERE id=$22
                        """,
                        normalized.price, normalized.address_line1, normalized.city,
                        normalized.state, normalized.zip_code, normalized.neighborhood,
                        normalized.bedrooms, normalized.bathrooms, normalized.square_feet,
                        normalized.description, normalized.image_urls,
                        normalized.has_doorman, normalized.has_elevator, normalized.has_gym,
                        normalized.has_laundry_in_unit, normalized.has_laundry_in_bldg,
                        normalized.has_dishwasher, normalized.has_ac, normalized.pets_allowed,
                        normalized.has_outdoor_space, json.dumps(normalized.raw_metadata),
                        existing["id"],
                    )
                    if normalized.latitude is not None:
                        await conn.execute(
                            "UPDATE cs_listings SET latitude=$1, longitude=$2 WHERE id=$3",
                            normalized.latitude, normalized.longitude, existing["id"],
                        )
                    updated_count += 1
                else:
                    new_id = str(uuid.uuid4())
                    await conn.execute(
                        """
                        INSERT INTO cs_listings (
                            id, source_id, external_id,
                            address_line1, city, state, zip_code, neighborhood,
                            listing_type, bedrooms, bathrooms, square_feet,
                            price, fee_type,
                            has_doorman, has_elevator, has_gym,
                            has_laundry_in_unit, has_laundry_in_bldg,
                            has_dishwasher, has_ac, pets_allowed, has_outdoor_space,
                            listing_url, image_urls, description,
                            latitude, longitude, is_active, raw_metadata,
                            first_seen_at, last_seen_at
                        ) VALUES (
                            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                            $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
                            $27,$28,TRUE,$29,NOW(),NOW()
                        )
                        """,
                        new_id, source_id, normalized.external_id,
                        normalized.address_line1, normalized.city, normalized.state,
                        normalized.zip_code, normalized.neighborhood,
                        normalized.listing_type, normalized.bedrooms, normalized.bathrooms,
                        normalized.square_feet, normalized.price, normalized.fee_type,
                        normalized.has_doorman, normalized.has_elevator, normalized.has_gym,
                        normalized.has_laundry_in_unit, normalized.has_laundry_in_bldg,
                        normalized.has_dishwasher, normalized.has_ac, normalized.pets_allowed,
                        normalized.has_outdoor_space, normalized.listing_url, normalized.image_urls,
                        normalized.description, normalized.latitude, normalized.longitude,
                        json.dumps(normalized.raw_metadata),
                    )
                    new_count += 1

        update_job(job_id, status="done", new=new_count, updated=updated_count)
        logger.info("scrape-direct %s: done new=%d updated=%d", source, new_count, updated_count)

    except Exception as exc:
        logger.error("scrape-direct %s: failed: %s", source, exc, exc_info=True)
        update_job(job_id, status="failed", error=str(exc))
