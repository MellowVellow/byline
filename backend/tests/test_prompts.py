import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import prompts


def test_complete_no_duplicate_level_or_last_two():
    _, u = prompts.complete_prompt("ctx", "General", "Cats need food. Dogs need care.", "", "Phrase", [], "Cats need food.")
    assert u.count("LEVEL:") == 1
    assert "LAST_TWO" not in u


def test_complete_keeps_distinct_last_two():
    _, u = prompts.complete_prompt("ctx", "General", "before text", "", "Phrase", [], "distinct tail")
    assert "LAST_TWO" in u


def test_complete_avoid_block_for_reroll():
    _, u = prompts.complete_prompt("ctx", "General", "before text", "", "Phrase", [], "", ["option one", "option two"])
    assert "ALREADY SHOWN" in u and "option one" in u and "option two" in u
    _, u2 = prompts.complete_prompt("ctx", "General", "before text", "", "Phrase", [], "")
    assert "ALREADY SHOWN" not in u2


def test_complete_has_no_style_or_voice():
    s, u = prompts.complete_prompt("ctx", "General", "before", "", "Phrase", [], "")
    assert "STYLE" not in s and "VOICE" not in u and "Audience" not in s


def test_user_text_fenced_everywhere():
    for _, u in [prompts.reactions_prompt("c", "General", "hi"), prompts.main_idea_prompt("c", "General", "hi"),
                 prompts.outline_prompt("hi"), prompts.claims_prompt("hi"), prompts.lint_prompt("c", "hi", "[]")]:
        assert "<<<TEXT" in u
