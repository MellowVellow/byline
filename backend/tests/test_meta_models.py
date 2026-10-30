import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from app.config import settings, validate_meta_model, APPROVED_META_MODELS
from app import llm

def test_meta_allowlist_acceptance():
    """Approved Meta models are accepted."""
    assert validate_meta_model("meta-llama/llama-3.3-70b-instruct") == "meta-llama/llama-3.3-70b-instruct"
    assert validate_meta_model("muse-spark-1.3") == "muse-spark-1.3"
    assert validate_meta_model("muse-glimmer-30b") == "muse-glimmer-30b"
    assert validate_meta_model("meta-llama/Llama-3.3-70B-Instruct") == "meta-llama/Llama-3.3-70B-Instruct"

def test_forbidden_models_rejected():
    """Non-Meta models are strictly rejected with ValueError."""
    forbidden = [
        "nvidia/Llama-3.1-Nemotron-70B-Instruct",
        "google/gemini-2.5-flash",
        "openai/gpt-4o",
        "anthropic/claude-3-5-sonnet",
        "mistralai/mistral-large",
        "qwen/qwen-2.5-72b",
    ]
    for model in forbidden:
        with pytest.raises(ValueError, match="Forbidden model"):
            validate_meta_model(model)

@pytest.mark.anyio
async def test_offline_meta_mock_fallback():
    """When no API key is configured, fallback uses internal Meta mock engine without failing."""
    with pytest.MonkeyPatch.context() as m:
        m.setattr(settings, "openrouter_api_key", "")
        m.setattr(settings, "meta_api_key", "")
        m.setattr(settings, "baseten_api_key", "")

        content, usage, model = await llm.chat(
            "You are Byline's Connect Engine, powered by Meta reasoning models.",
            "Connect these two thoughts."
        )
        assert "options" in content
        assert "mock:" in model
        assert usage.get("total_tokens", 0) > 0
