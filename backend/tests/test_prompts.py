import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import prompts


def test_complete_no_duplicate_level_or_last_two():
    _, u = prompts.complete_prompt("ctx", "General", "Cats need food. Dogs need care.", "", "Phrase", "", "", [], "Cats need food.")
    assert u.count("LEVEL:") == 1
    assert "LAST_TWO" not in u


def test_complete_keeps_distinct_last_two_and_voice():
    _, u = prompts.complete_prompt("ctx", "General", "before text", "", "Phrase", "Custom voice", "", [], "distinct tail")
    assert "LAST_TWO" in u and "VOICE: Custom voice" in u


def test_user_text_fenced_everywhere():
    for _, u in [prompts.reactions_prompt("c", "General", "hi"), prompts.main_idea_prompt("c", "General", "hi"),
                 prompts.outline_prompt("hi"), prompts.claims_prompt("hi"), prompts.lint_prompt("c", "s", "hi", "[]"),
                 prompts.diagram_prompt("c", "hi", "mindmap")]:
        assert "<<<TEXT" in u
