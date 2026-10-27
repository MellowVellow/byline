import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import sentence_case

def test_after_period_capitalizes():
    assert sentence_case("Cats are quiet.", "dogs bark loudly") == "Dogs bark loudly"
    assert sentence_case("Really? ", "yes they do") == "Yes they do"
    assert sentence_case('He said "Stop."', "then left") == "Then left"

def test_mid_sentence_unchanged():
    assert sentence_case("Cats are", "quiet animals") == "quiet animals"
    assert sentence_case("The API", "uses VAD scores") == "uses VAD scores"

def test_empty_before_capitalizes():
    assert sentence_case("", "first words here") == "First words here"
    assert sentence_case("  ", "  leading space") == "  Leading space"
