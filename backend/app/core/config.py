"""
CubeVision AI — Core Configuration

Centralized settings using Pydantic Settings.
All config is loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "cubevision"

    # JWT Authentication
    jwt_secret_key: str = "cubevision-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # CORS
    cors_origins: str = '["http://localhost:3000"]'

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # LLM Configuration (separate module)
    llm_provider: str = "gemini"  # gemini | openai | local
    gemini_api_key: str = ""
    openai_api_key: str = ""
    local_llm_endpoint: str = "http://localhost:11434"

    # Upload
    max_upload_size_mb: int = 10
    upload_dir: str = "./uploads"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.cors_origins)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Singleton instance
settings = Settings()
