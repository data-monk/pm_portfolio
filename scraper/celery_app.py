from celery import Celery
from celery.schedules import crontab
import os

REDIS_URL = os.getenv("CS_REDIS_URL", "redis://localhost:6380/0")

app = Celery(
    "commute_search",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/New_York",
    enable_utc=True,
    task_routes={
        "tasks.scrape_source": {"queue": "scrape"},
        "tasks.mark_stale_listings": {"queue": "scrape"},
        "tasks.batch_commute_enrich": {"queue": "commute"},
    },
    beat_scheduler="redbeat.RedBeatScheduler",
    beat_schedule={
        "scrape-apartments-com": {
            "task": "tasks.scrape_source",
            "schedule": crontab(minute=0, hour="*/6"),
            "args": ["apartments_com"],
        },
        "scrape-streeteasy": {
            "task": "tasks.scrape_source",
            "schedule": crontab(minute=15, hour="*/6"),
            "args": ["streeteasy"],
        },
        "scrape-zillow": {
            "task": "tasks.scrape_source",
            "schedule": crontab(minute=30, hour="*/6"),
            "args": ["zillow"],
        },
        "scrape-facebook": {
            "task": "tasks.scrape_source",
            "schedule": crontab(minute=0, hour="*/12"),
            "args": ["facebook_marketplace"],
        },
        "mark-stale": {
            "task": "tasks.mark_stale_listings",
            "schedule": crontab(minute=55, hour="*/6"),
        },
    },
)
