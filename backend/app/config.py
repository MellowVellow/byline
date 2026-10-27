from __future__ import annotations
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_env = ROOT / ".env"
if _env.exists():
    for line in _env.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

class Settings:
    meta_api_key: str = os.getenv("META_API_KEY", "")
    meta_base_url: str = os.getenv("META_BASE_URL", "https://api.meta.ai/v1")
    meta_model: str = os.getenv("META_MODEL", "muse-spark-1.3")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    fallback_model: str = os.getenv("FALLBACK_MODEL", "google/gemini-2.5-flash-lite")
    languagetool_url: str = os.getenv("LANGUAGETOOL_URL", "http://localhost:8010/v2/check")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
    request_timeout: float = float(os.getenv("REQUEST_TIMEOUT", "60"))
    local_base_url: str = os.getenv("LOCAL_BASE_URL", "")
    local_model: str = os.getenv("LOCAL_MODEL", "")

settings = Settings()

def cors_list() -> list[str]:
    return [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
