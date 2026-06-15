from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cs_postgres_dsn: str = "postgresql://cs_user:password@cs-postgres:5432/commute_search"
    cs_redis_url: str = "redis://cs-redis:6379/0"
    google_maps_api_key: str = ""
    google_maps_browser_key: str = ""
    fb_enabled: bool = False
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]
    admin_secret: str = ""

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()
