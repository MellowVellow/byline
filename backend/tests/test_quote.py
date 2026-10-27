import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.quote import filter_anchored, valid_anchor

TEXT = "Cats are independent, as I said. A plethora of reasons exist."

def test_verbatim_passes():
    assert valid_anchor({"quote": "plethora", "context": "A plethora of reasons exist."}, TEXT)

def test_paraphrase_dropped():
    items = [{"quote": "many reasons", "context": "A plethora of reasons exist."},
             {"quote": "plethora", "context": "A plethora of reasons exist."}]
    assert len(filter_anchored(items, TEXT)) == 1

def test_quote_outside_context_dropped():
    assert not valid_anchor({"quote": "independent", "context": "A plethora of reasons exist."}, TEXT)
