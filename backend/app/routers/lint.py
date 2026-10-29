from fastapi import APIRouter
from .. import llm, prompts
from ..models import LintIn
from .common import ok, fail, err, meta

router = APIRouter()

@router.post("/api/lint")
async def lint(body: LintIn):
    if not body.active_rules:
        return ok(lint_results=[])
    try:
        import json as _json
        rules = [{"id": r.id, "color": r.category, "rule": r.rule} for r in body.active_rules if r.id and r.rule]
        rule_map = {r["id"]: r["color"] for r in rules}
        s, u = prompts.lint_prompt(body.context, body.text, _json.dumps(rules))
        data, usage, model = None, {}, ""
        last_err = None
        for _attempt in range(2):  # one retry on parse/upstream hiccup
            try:
                data, usage, model = await llm.json_call(s, u, max_tokens=1800, temperature=0.3)
                break
            except Exception as e:  # noqa: BLE001
                last_err = e
        if data is None:
            raise last_err or RuntimeError("lint LLM failed")
        out = []
        for it in data.get("lint_results", []):
            if not isinstance(it, dict):
                continue
            tgt, ctx = it.get("target", ""), it.get("context", "")
            if not tgt or tgt not in body.text or not ctx or ctx not in body.text or tgt not in ctx:
                continue
            rid = it.get("rule_id", "")
            if rid not in rule_map:
                continue
            out.append({"rule_id": rid, "color_category": rule_map[rid], "target": tgt, "context": ctx,
                        "message": it.get("message", ""), "suggestion": it.get("suggestion", "")})
        return ok(lint_results=out[:12], model=model, usage=usage, meta=meta("lint", s, u, usage, model, 0, 0.3, 1800))
    except Exception as e:
        return err(e)
