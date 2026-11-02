import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app import prompts
from app.routers.complete import post_process, valid_options, retry_hint

client = TestClient(app)


def test_question_gets_question_mark():
    out = post_process("before", ["What does it cost", "Who pays", "Why bother?"], "Question")
    assert all(s.endswith("?") for s in out)


def test_question_valid_requires_three_marked():
    assert valid_options(["A?", "B?", "C?"], "Question")
    assert not valid_options(["A?", "B?"], "Question")
    assert not valid_options(["A", "B?", "C?"], "Question")


def test_retry_hint_question():
    assert "3 questions" in retry_hint("Question")
    assert "full sentences" in retry_hint("Phrase")


def test_levels_prompt_requests_prefetch_depth_with_avoid():
    _, u = prompts.complete_levels_prompt("before text here", "", "General", ["shown one", "shown two"])
    assert '"cue":[6 strings]' in u
    assert "ALREADY SHOWN" in u and "shown one" in u
    _, u2 = prompts.complete_levels_prompt("before text here", "", "General")
    assert "ALREADY SHOWN" not in u2


def test_grouped_reroll_with_avoid_returns_levels_not_422():
    # Frontend ships up to 12 shown options as avoid; the old max_length=3
    # schema 422'd every reroll, so the app always fell back to static text.
    six = {
        "cue": [f"cue {i}" for i in range(6)],
        "question": [f"what is {i}?" for i in range(6)],
        "fragment": [f"continuing thought number {i} here" for i in range(6)],
        "sentence": [f"This is a full finishing sentence number {i} here today." for i in range(6)],
    }
    avoid = [f"old option {i}" for i in range(12)]
    with patch("app.routers.complete.llm.json_call", new_callable=AsyncMock) as m:
        m.return_value = (six, {}, "test-model")
        r = client.post("/api/complete", json={
            "level": "General", "assist_level": "All",
            "before": "Strategic electrification delivers", "after": "",
            "avoid": avoid, "version": 1})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert set(body["levels"].keys()) == {"cue", "question", "fragment", "sentence"}
        assert all(len(body["levels"][lv]) == 6 for lv in body["levels"])
        # avoid reached the prompt (reroll alts differ from shown)
        _s, u = m.call_args[0]
        assert "ALREADY SHOWN" in u and "old option 0" in u
