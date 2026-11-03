from pathlib import Path

from app.lint_rules import LINT_RULE_IDS

ROOT = Path(__file__).resolve().parents[2]


def test_lint_ids_match_frontend():
    p = ROOT / "frontend/src/lib/rules.ts"
    if not p.exists():
        import pytest as _pytest
        _pytest.skip("frontend/src/lib/rules.ts removed — backend-only lint rules")
    import re
    ts = p.read_text()
    fe_ids = set(re.findall(r"R\('([A-Z_0-9]+)'", ts))
    assert fe_ids == LINT_RULE_IDS
