import re
from pathlib import Path

from app.lint_rules import LINT_RULE_IDS
from app.constants import DICTIONS, TONES, CLAUSES

ROOT = Path(__file__).resolve().parents[2]


def test_lint_ids_match_frontend():
    ts = (ROOT / "frontend/src/lib/rules.ts").read_text()
    fe_ids = set(re.findall(r"R\('([A-Z_0-9]+)'", ts))
    assert fe_ids == LINT_RULE_IDS


def test_constants_match_frontend():
    ts = (ROOT / "frontend/src/lib/constants.ts").read_text()
    for name, py_val in [("DICTIONS", DICTIONS), ("TONES", TONES), ("CLAUSES", CLAUSES)]:
        m = re.search(rf"export const {name} = \[([^\]]+)\]", ts)
        assert m, name
        fe_val = re.findall(r"'([^']+)'", m.group(1))
        assert fe_val == py_val, name
