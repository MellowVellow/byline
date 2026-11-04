from __future__ import annotations
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env", override=False)
except ImportError:  # pragma: no cover - dependency always installed in practice
    _env = ROOT / ".env"
    if _env.exists():
        for line in _env.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

APPROVED_META_MODELS = {
    "meta-models/muse-spark-open-1026",
    "muse-spark-open-1026",
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
    "meta-llama/llama-3.2-3b-instruct",
    "meta-llama/llama-3.2-1b-instruct",
    "meta-llama/llama-3-70b-instruct",
    "meta-llama/llama-3-8b-instruct",
    "muse-spark-1.3",
    "muse-glimmer-30b",
    "muse-voice-transcribe-1.0",
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
    def waitlist_local_fallback(self) -> bool:
        return os.getenv("WAITLIST_LOCAL_FALLBACK", "").strip().lower() in ("1", "true", "yes")

    @property
    def ip_budget_enabled(self) -> bool:
        return os.getenv("IP_BUDGET_ENABLED", "1").strip().lower() not in ("0", "false", "no")

    @property
    def ip_token_budget(self) -> int:
        try:
            return max(0, int(os.getenv("IP_TOKEN_BUDGET", "1000000")))
        except ValueError:
            return 1_000_000

    @property
    def ip_budget_usd(self) -> float:
        """Per-IP spend cap. 0 disables the dollar check."""
        try:
            return max(0.0, float(os.getenv("IP_BUDGET_USD", "0.20")))
        except ValueError:
            return 0.20

    @property
    def suggest_rate_per_minute(self) -> int:
        try:
            return max(1, int(os.getenv("SUGGEST_RATE_PER_MINUTE", "30")))
        except ValueError:
            return 30

    @property
    def suggest_rate_per_day(self) -> int:
        try:
            return max(1, int(os.getenv("SUGGEST_RATE_PER_DAY", "500")))
        except ValueError:
            return 500

    @property
    def ip_budget_window_hours(self) -> float:
        try:
            return max(0.1, float(os.getenv("IP_BUDGET_WINDOW_HOURS", "24")))
        except ValueError:
            return 24.0

    @property
    def price_in_per_m(self) -> float:
        try:
            return max(0.0, float(os.getenv("PRICE_IN_PER_M", "0.50")))
        except ValueError:
            return 0.50

    @property
    def price_out_per_m(self) -> float:
        try:
            return max(0.0, float(os.getenv("PRICE_OUT_PER_M", "1.50")))
        except ValueError:
            return 1.50

    @property
    def trust_proxy(self) -> bool:
        return os.getenv("TRUST_PROXY", "").strip().lower() in ("1", "true", "yes")

    @property
    def usage_db_path(self) -> Path:
        return Path(os.getenv("USAGE_DB_PATH", str(ROOT / "data" / "usage.db"))).expanduser()

    @property
    def admin_token(self) -> str:
        return os.getenv("ADMIN_TOKEN", "").strip()

    @property
    def api_key(self) -> str:
        """Single shared API key. Empty = auth disabled (local dev only)."""
        return os.getenv("API_KEY", "").strip()

    @property
    def env(self) -> str:
        """Deployment environment: dev | prod. Prod fails closed (no mocks)."""
        return os.getenv("ENV", "dev").strip().lower()

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
    def body_limit_mb(self) -> int:
        """Single max-request-body cap enforced on JSON and file uploads alike."""
        try:
            return max(1, int(os.getenv("BODY_LIMIT_MB", "22")))
        except ValueError:
            return 22

    @property
    def local_base_url(self) -> str:
        return os.getenv("LOCAL_BASE_URL", "").strip().rstrip("/")

    @property
    def local_model(self) -> str:
        return os.getenv("LOCAL_MODEL", "").strip()

    @property
    def local_prefer(self) -> bool:
        return os.getenv("LOCAL_PREFER", "").strip().lower() in ("1", "true", "yes")

    @property
    def tavily_api_key(self) -> str:
        return os.getenv("TAVILY_API_KEY", "").strip().strip("'\"")

    @property
    def jina_base_url(self) -> str:
        return (os.getenv("JINA_BASE_URL") or "https://localhost:8000").strip().rstrip("/")

    @property
    def usage_backend(self) -> str:
        """Hot-path usage store: sqlite (default) | supabase.

        sqlite = single-instance disk DB. supabase = Postgres rollup tables
        (usage_hourly / usage_daily) as system of record for multi-instance.
        Sync script mirrors sqlite -> supabase; API reads sqlite unless set.
        """
        v = os.getenv("USAGE_BACKEND", "sqlite").strip().lower()
        return v if v in ("sqlite", "supabase") else "sqlite"

    @property
    def usage_sync_cursor_path(self) -> Path:
        return Path(os.getenv("USAGE_SYNC_CURSOR", str(ROOT / "data" / ".usage_sync"))).expanduser()


settings = Settings()

def validate_meta_model(model: str) -> str:
    """Strictly enforce Meta-authored model restriction."""
    cleaned = (model or "").strip()
    if not cleaned:
        return settings.fallback_model
    if cleaned in APPROVED_META_MODELS:
        return cleaned
    for approved in APPROVED_META_MODELS:
        if cleaned.lower() == approved.lower():
            return approved
    raise ValueError(
        f"Forbidden model '{cleaned}'. Byline strictly permits Meta-authored models only "
        f"(e.g., meta-llama/llama-3.3-70b-instruct, muse-spark-1.3, muse-glimmer-30b)."
    )

def cors_list() -> list[str]:
    return [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
