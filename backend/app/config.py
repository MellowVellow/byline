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
    # Hackathon primary model (Baseten-hosted)
    "meta-models/muse-spark-open-1026",
    "muse-spark-open-1026",
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
    @property
    def meta_api_key(self) -> str:
        return os.getenv("META_API_KEY", "").strip().strip("'\"")

    @property
    def meta_base_url(self) -> str:
        return (os.getenv("META_BASE_URL") or "https://api.meta.ai/v1").strip().rstrip("/")

    @property
    def meta_model(self) -> str:
        return (os.getenv("META_MODEL") or "muse-spark-1.3").strip()

    @property
    def openrouter_api_key(self) -> str:
        return os.getenv("OPENROUTER_API_KEY", "").strip().strip("'\"")

    @property
    def openrouter_model(self) -> str:
        return (os.getenv("FALLBACK_MODEL") or os.getenv("OPENROUTER_MODEL") or "meta-llama/llama-3.3-70b-instruct").strip()

    @property
    def openrouter_base_url(self) -> str:
        return (os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1").strip().rstrip("/")

    @property
    def fallback_model(self) -> str:
        return self.openrouter_model

    @property
    def baseten_api_key(self) -> str:
        return os.getenv("BASETEN_API_KEY", "").strip().strip("'\"")

    @property
    def baseten_base_url(self) -> str:
        return (os.getenv("BASETEN_BASE_URL") or "https://inference.baseten.co/v1").strip().rstrip("/")

    # Hackathon primary: always use muse-spark-open-1026 on Baseten
    @property
    def baseten_model(self) -> str:
        return (os.getenv("BASETEN_MODEL") or "meta-models/muse-spark-open-1026").strip()

    @property
    def languagetool_url(self) -> str:
        return os.getenv("LANGUAGETOOL_URL", "http://localhost:8010/v2/check").strip()

    @property
    def supabase_url(self) -> str:
        return os.getenv("SUPABASE_URL", "").strip().rstrip("/")

    @property
    def supabase_key(self) -> str:
        return (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip().strip("'\"")

    @property
    def cors_origins(self) -> str:
        return os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")

    @property
    def request_timeout(self) -> float:
        try:
            return float(os.getenv("REQUEST_TIMEOUT", "60"))
        except ValueError:
            return 60.0

    @property
    def local_base_url(self) -> str:
        return os.getenv("LOCAL_BASE_URL", "").strip().rstrip("/")

    @property
    def local_model(self) -> str:
        return os.getenv("LOCAL_MODEL", "").strip()

    @property
    def local_prefer(self) -> bool:
        return os.getenv("LOCAL_PREFER", "").strip().lower() in ("1", "true", "yes")

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
