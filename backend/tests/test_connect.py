import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app import prompts

client = TestClient(app)

def test_connect_prompt_format():
    s, u = prompts.connect_prompt("Argumentative essay", "First point", "Second point", "contrast")
    assert "Meta reasoning models" in s
    assert "FIRST POINT" in u.upper() or "PRECEDING THOUGHT" in u
    assert "contrast" in u

def test_connect_endpoint_meta_success():
    mock_data = {
        "options": [
            {"relation_type": "Contrast", "bridge_text": "However, evidence shows...", "rationale": "Direct contrast"},
            {"relation_type": "Concession", "bridge_text": "While this holds true...", "rationale": "Nuanced qualification"},
            {"relation_type": "Evidence-Bridge", "bridge_text": "Recent studies corroborate...", "rationale": "Empirical bridge"},
        ]
    }

    with patch("app.routers.connect.llm.json_call", new_callable=AsyncMock) as mock_meta:
        mock_meta.return_value = (mock_data, {"total_tokens": 85}, "meta-llama/llama-3.3-70b-instruct")

        resp = client.post(
            "/api/connect",
            json={"context": "Transit essay", "before": "Car reliance is costly.", "after": "High-speed rail saves money.", "relation_hint": "contrast"}
        )

        assert resp.status_code == 200
        d = resp.json()
        assert d["ok"] is True
        assert d["provider"] == "meta"
        assert d["model"] == "meta-llama/llama-3.3-70b-instruct"
        assert len(d["options"]) == 3
        assert d["options"][0]["bridge_text"] == "However, evidence shows..."
