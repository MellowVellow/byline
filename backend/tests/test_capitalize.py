import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers.complete import sentence_case, parse_options, valid_options, merge_partial, fix_suggestion, CAPS, ASSIST_TOKENS
from app.prompts import ASSIST

def test_after_period_capitalizes():
    assert sentence_case("Cats are quiet.", "dogs bark loudly") == "Dogs bark loudly"
    assert sentence_case("Really? ", "yes they do") == "Yes they do"
    assert sentence_case('He said "Stop."', "then left") == "Then left"

def test_mid_sentence_unchanged():
    assert sentence_case("Cats are", "quiet animals") == "quiet animals"
    assert sentence_case("The API", "uses VAD scores") == "uses VAD scores"

def test_sentence_and_block_assists_elaborate():
    assert "Block" in ASSIST and "3-5 sentences" in ASSIST["Block"]
    assert "advances the argument" in ASSIST["Sentence"]
    assert CAPS["Block"] >= 60 and ASSIST_TOKENS["Block"] >= 900
    block = " ".join(["word"] * 80)
    assert parse_options(block, "Block") == [block]
    assert parse_options(block, "Sentence") == []
    good_block = ("Cats sleep sixteen hours daily. " + "Owners gain quiet homes with lower daily demands and calmer evenings overall. " * 3).strip()
    assert valid_options([good_block], "Block")
    assert not valid_options(["Especially compared to loud dogs"], "Block")
    assert not valid_options(["short fragment here"], "Sentence")

def test_merge_partial_word():
    assert merge_partial("Cats n", "eed less constant supervision at home") == "need less constant supervision at home"
    assert merge_partial("Cats n", "eed minimal care, which suits busy beginners") == "need minimal care, which suits busy beginners"
    assert fix_suggestion("Pets. N", "eed no outdoor walks to stay healthy") == "Need no outdoor walks to stay healthy"
    assert merge_partial("Cats ", "need less care") == "need less care"
    assert merge_partial("Cats", "are calmer companions") == "are calmer companions"
    assert merge_partial("Cats the", "dog barks") == "dog barks"

def test_empty_before_capitalizes():
    assert sentence_case("", "first words here") == "First words here"
    assert sentence_case("  ", "  leading space") == "  Leading space"
