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

# Verified Meta-authored model identifiers across approved providers
APPROVED_META_MODELS = {
    # OpenRouter Meta models
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
    "meta-llama/llama-3.2-3b-instruct",
    "meta-llama/llama-3.2-1b-instruct",
    "meta-llama/llama-3-70b-instruct",
    "meta-llama/llama-3-8b-instruct",
    # Meta Model API
    "muse-spark-1.3",
    "muse-glimmer-30b",
    "muse-voice-transcribe-1.0",
    # Baseten-hosted Meta models
    "meta-llama/Llama-3.3-70B-Instruct",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
}

class Settings:
    meta_api_key: str = os.getenv("META_API_KEY", "")
    meta_base_url: str = os.getenv("META_BASE_URL", "https://api.meta.ai/v1")
    meta_model: str = os.getenv("META_MODEL", "muse-spark-1.3")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("FALLBACK_MODEL", os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct"))
    fallback_model: str = openrouter_model
    baseten_api_key: str = os.getenv("BASETEN_API_KEY", "")
    baseten_model: str = os.getenv("BASETEN_MODEL", "meta-llama/Llama-3.3-70B-Instruct")
    languagetool_url: str = os.getenv("LANGUAGETOOL_URL", "http://localhost:8010/v2/check")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
    request_timeout: float = float(os.getenv("REQUEST_TIMEOUT", "60"))
    local_base_url: str = os.getenv("LOCAL_BASE_URL", "")
    local_model: str = os.getenv("LOCAL_MODEL", "")

settings = Settings()

def validate_meta_model(model: str) -> str:
    """Strictly enforce Meta-authored model restriction."""
    cleaned = (model or "").strip()
    if not cleaned:
        return settings.fallback_model
    # Normalize model identifier
    if cleaned in APPROVED_META_MODELS:
        return cleaned
    # Check lowercase match
    for approved in APPROVED_META_MODELS:
        if cleaned.lower() == approved.lower():
            return approved
    raise ValueError(
        f"Forbidden model '{cleaned}'. Byline strictly permits Meta-authored models only "
        f"(e.g., meta-llama/llama-3.3-70b-instruct, muse-spark-1.3, muse-glimmer-30b)."
    )

def cors_list() -> list[str]:
    return [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
