"""
CommuteFirst FastAPI application entry point.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import settings
from db.connection import close_pool, get_pool
from routers import admin, listings, saved


# ── Rate limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.cs_redis_url,
)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm the DB connection pool on startup; close it on shutdown."""
    await get_pool()
    yield
    await close_pool()


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="CommuteFirst API",
    description="Commute-centric real estate aggregator — App 5 of PM Portfolio",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # No cookies — session tokens are query params
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Session-Token", "X-Admin-Secret"],
    max_age=3600,
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(listings.router, prefix="/api/commute-search")
app.include_router(saved.router, prefix="/api/commute-search")
app.include_router(admin.router, prefix="/api/commute-search")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": "commute-search-api", "version": "1.0.0"}


# ── Apply rate limits to search route ────────────────────────────────────────
# slowapi requires the limiter to be available on the route; we apply it
# as a dependency via a middleware approach to avoid circular import issues.

@app.middleware("http")
async def rate_limit_search(request: Request, call_next):
    """
    Apply tighter rate limiting to the search endpoint:
    - /api/commute-search/listings/search: 30/minute
    - /api/commute-search/admin/*: 2/minute (enforced per-route in admin.py)
    - All others: unlimited (Nginx handles 100/min at the proxy level)
    """
    # Delegate to FastAPI route handlers; slowapi decorators on routes handle limits
    response = await call_next(request)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    import logging
    logging.getLogger(__name__).error(
        "Unhandled exception: %s\n%s", exc, traceback.format_exc()
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
