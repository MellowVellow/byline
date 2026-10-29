import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers.complete import post_process, valid_options, retry_hint


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
