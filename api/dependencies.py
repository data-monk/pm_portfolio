"""
Shared FastAPI dependencies — database pool and Redis client.
"""
from __future__ import annotations

import redis.asyncio as aioredis
from config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.cs_redis_url, decode_responses=True)
    return _redis


# Re-export get_pool for convenience
from db.connection import get_pool  # noqa: E402, F401
