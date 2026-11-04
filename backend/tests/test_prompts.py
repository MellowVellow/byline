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


def test_reactions_avoid_block():
    _, u = prompts.reactions_prompt("c", "General", "hi", avoid=["old option"])
    assert "ALREADY SHOWN" in u and "old option" in u
    _, u2 = prompts.reactions_prompt("c", "General", "hi")
    assert "ALREADY SHOWN" not in u2


def test_language_directive_defaults_to_english():
    s, u = prompts.complete_prompt("ctx", "General", "before", "", "Phrase", [], "")
    assert "Respond in English" in s
    assert "Bahasa Indonesia" not in s


def test_language_directive_indonesian():
    s, u = prompts.complete_prompt("ctx", "General", "Saya suka", "", "Phrase", [], "", None, "id-ID")
    assert "Bahasa Indonesia" in s
    assert "Bahasa Indonesia" in u
    assert "standard Bahasa Indonesia" in u


def test_synonyms_and_reactions_carry_indonesian():
    s, u = prompts.synonyms_prompt("c", "General", "cepat", "Dia berlari cepat", language="id-ID")
    assert "Bahasa Indonesia" in s
    s2, _ = prompts.reactions_prompt("c", "General", "Halo dunia", language="id-ID")
    assert "Bahasa Indonesia" in s2


def test_frequency_candidates_skipped_for_indonesian():
    from app.routers.annotate import frequency_candidates
    assert frequency_candidates("Saya sangat suka menulis setiap hari", "General", "id-ID") == ""


def test_merge_partial_skips_zipf_for_indonesian():
    from app.routers.complete import merge_partial
    # ID path returns suggestion unchanged instead of EN zipf merge
    assert merge_partial("Saya mak", "an yang baik", language="id-ID") == "an yang baik"
