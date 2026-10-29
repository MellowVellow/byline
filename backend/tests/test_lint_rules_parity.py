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
    # Style settings were removed from the UI (style → lint rules), so only
    # DICTIONS stays frontend-visible; TONES/CLAUSES remain backend-only for
    # the setup-agent prompts.
    ts = (ROOT / "frontend/src/lib/constants.ts").read_text()
    m = re.search(r"export const DICTIONS = \[([^\]]+)\]", ts)
    assert m, "DICTIONS"
    fe_val = re.findall(r"'([^']+)'", m.group(1))
    assert fe_val == DICTIONS, "DICTIONS"
