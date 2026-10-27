import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.swapcheck import slot_ok

T = "A plethora of reasons exist for choosing a cat."

def test_noun_to_determiner_rejected():
    assert not slot_ok(T, T.index("plethora"), "plethora", "many")

def test_article_determiner_clash_rejected():
    assert not slot_ok(T, T.index("plethora"), "plethora", "many reasons")

def test_noun_to_noun_accepted():
    assert slot_ok(T, T.index("plethora"), "plethora", "wealth")
    assert slot_ok(T, T.index("plethora"), "plethora", "abundance") is False  # a+abundance: a/an clash caught here too

def test_an_agreement():
    t2 = "An abundance of reasons exist."
    assert slot_ok(t2, t2.index("abundance"), "abundance", "wealth") is False

def test_determiner_to_determiner_ok():
    t3 = "Many reasons exist."
    assert slot_ok(t3, 0, "Many", "Several")

from app.swapcheck import match_case

def test_match_case_preserves_capital():
    assert match_case("Plethora", "lot") == "Lot"
    assert match_case("plethora", "Lot") == "Lot"
