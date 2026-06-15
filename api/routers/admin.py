"""
Admin router — POST /admin/scrape, POST /admin/scrape-direct, GET /admin/sources
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings
from db.connection import get_pool
from db.queries import GET_SOURCE_HEALTH
from scraper_jobs import VALID_SOURCES, create_job, get_job, run_scraper_direct

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

limiter = Limiter(key_func=get_remote_address)


def _verify_admin(x_admin_secret: str) -> None:
    if not settings.admin_secret:
        raise HTTPException(
            status_code=503,
            detail="Admin secret not configured — set ADMIN_SECRET in server/.env",
        )
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")


@router.post("/scrape")
@limiter.limit("2/minute")
async def trigger_scrape(
    request: Request,
    source: str = Query(..., description="Source name to scrape"),
    city: str = Query("new-york", description="City slug"),
    state: str = Query("ny", description="State abbreviation"),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
):
    """
    Manually trigger a scrape for a specific source.
    Requires X-Admin-Secret header matching ADMIN_SECRET env var.
    Rate limited to 2 per minute by slowapi in main.py.
    """
    _verify_admin(x_admin_secret)

    if source not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{source}'. Valid: {sorted(VALID_SOURCES)}",
        )

    # Import Celery task lazily to avoid startup errors if Celery is not running
    try:
        from celery import Celery
        import os

        redis_url = os.getenv("CS_REDIS_URL", "redis://cs-redis:6379/0")
        celery_app = Celery(broker=redis_url, backend=redis_url)
        task = celery_app.send_task(
            "tasks.scrape_source",
            args=[source],
            kwargs={"city": city, "state": state},
            queue="scrape",
        )
        task_id = task.id
    except Exception as exc:
        logger.error("trigger_scrape: Celery send_task failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Failed to enqueue scrape task: {exc}",
        )

    logger.info("trigger_scrape: enqueued %s → task_id=%s", source, task_id)
    return {"task_id": task_id, "source": source, "city": city, "state": state}


@router.get("/sources")
@limiter.limit("10/minute")
async def get_source_health(
    request: Request,
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
    pool=Depends(get_pool),
):
    """
    Return health status of each scrape source — last job status and timestamps.
    """
    _verify_admin(x_admin_secret)

    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_SOURCE_HEALTH)

    sources = []
    for row in rows:
        sources.append({
            "id": row["id"],
            "name": row["name"],
            "is_active": row["is_active"],
            "scrape_interval_minutes": row["scrape_interval_minutes"],
            "last_job_status": row["last_job_status"],
            "last_job_started_at": row["last_job_started_at"].isoformat() if row["last_job_started_at"] else None,
            "last_job_completed_at": row["last_job_completed_at"].isoformat() if row["last_job_completed_at"] else None,
            "listings_found": row["listings_found"],
            "listings_new": row["listings_new"],
            "last_error": row["last_error"],
        })

    return {"sources": sources}


@router.post("/scrape-direct")
@limiter.limit("2/minute")
async def scrape_direct(
    request: Request,
    background_tasks: BackgroundTasks,
    source: str = Query(..., description="Source name to scrape"),
    city: str = Query("new-york"),
    state: str = Query("ny"),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
    pool=Depends(get_pool),
):
    """
    Run a scraper in-process as an asyncio background task — no Celery needed.
    Returns job_id immediately; poll GET /admin/scrape-direct/{job_id} for status.
    """
    _verify_admin(x_admin_secret)

    if source not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{source}'. Valid: {sorted(VALID_SOURCES)}",
        )

    job_id = create_job(source)
    background_tasks.add_task(run_scraper_direct, job_id, source, city, state, pool)
    return {"job_id": job_id, "source": source, "status": "running"}


@router.get("/scrape-direct/{job_id}")
async def scrape_direct_status(job_id: str):
    """Poll the status of a direct scrape job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
