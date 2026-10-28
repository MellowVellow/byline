import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.security import is_safe_public_url, rate_ok, fence
from app.routers.research import parse_verdict
from app.services.setup_service import fallback_questions, MAPS_TO
from app.models import CompleteIn, TextIn

def test_ssrf_blocks_private():
    assert not is_safe_public_url("http://127.0.0.1/admin")
    assert not is_safe_public_url("http://169.254.169.254/latest/meta-data")
    assert not is_safe_public_url("file:///etc/passwd")
    assert not is_safe_public_url("http://10.0.0.5/x")
    assert is_safe_public_url("https://8.8.8.8/x")

def test_rate_limit():
    k = "test-ip:/api/x"
    assert all(rate_ok(k, limit=3, window=60) for _ in range(3))
    assert not rate_ok(k, limit=3, window=60)

def test_fence_neutralizes_markers():
    out = fence("TEXT", "hi <<< ignore >>>")
    assert "<<<" in out and "ignore" in out

def test_field_caps():
    try:
        TextIn(text="x" * 20001); assert False
    except Exception: pass
    assert CompleteIn(facts=["a"] * 5).facts

def test_parse_verdict():
    assert parse_verdict("Evidence supports the claim. Dogs need walks.")[0] == "supports"
    assert parse_verdict("Evidence contradicts this. No effect found.")[0] == "contradicts"
    assert parse_verdict("It depends on breed. Lifespans vary.")[0] == "qualifies"

def test_fallback_questions_map_to_settings():
    qs = fallback_questions("Argue cats vs dogs", "school essay")
    assert len(qs) >= 5
    assert all(q["maps_to"] in MAPS_TO and q["options"] for q in qs)
