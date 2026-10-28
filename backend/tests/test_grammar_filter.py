import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.grammar_filter import filter_matches, defined_acronyms

TEXT = "Valence-Arousal-Dominance (VAD) is used. Virtual Reality Exposure Therapy (VRET) helps. The VAD model and VRET approach shows results."

def spell(frm_to, word):
    frm = TEXT.index(word, frm_to)
    return {"from": frm, "to": frm + len(word), "message": "Possible spelling mistake found.", "replacements": [], "rule": "MORFOLOGIK_RULE_EN_US"}

def test_defined_acronyms_found():
    assert defined_acronyms(TEXT) == {"VAD", "VRET"}

def test_defined_acronym_flags_dropped_everywhere():
    ms = [spell(0, "VAD"), spell(40, "VRET"), spell(80, "VAD"), spell(90, "VRET")]
    assert filter_matches(TEXT, ms) == []

def test_real_grammar_kept_and_deduped():
    frm = TEXT.index("shows")
    m = {"from": frm, "to": frm + 5, "message": "agreement", "replacements": ["show"], "rule": "AGREEMENT"}
    assert filter_matches(TEXT, [m, dict(m)]) == [m]

def test_regional_spelling_variant_dropped():
    t = "The utilisation of colour in the centre helps."
    for word, repl in [("utilisation", "utilization"), ("colour", "color"), ("centre", "center")]:
        frm = t.index(word)
        m = {"from": frm, "to": frm + len(word), "message": "Possible spelling mistake found.", "replacements": [repl], "rule": "MORFOLOGIK_RULE_EN_US"}
        assert filter_matches(t, [m]) == [], word


def test_undefined_typo_kept():
    t = "The results shows teh data."
    m = {"from": 18, "to": 21, "message": "Possible spelling mistake found.", "replacements": ["the"], "rule": "MORFOLOGIK_RULE_EN_US"}
    assert filter_matches(t, [m]) == [m]
