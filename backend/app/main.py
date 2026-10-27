"""Byline v2 API — quote-anchored, soft-fail everywhere. Meta Muse primary."""
from __future__ import annotations
import json, logging, re
from pathlib import Path
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import llm, prompts
from .config import settings, cors_list, ROOT
from .models import CompleteIn, TextIn, SynonymIn, GrammarIn, WaitlistIn, ClaimIn, LintIn
from .quote import filter_anchored
from .grammar_filter import filter_matches
from .swapcheck import swap_ok

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Byline v2")
app.add_middleware(CORSMiddleware, allow_origins=cors_list() or ["*"], allow_methods=["*"], allow_headers=["*"])

CAPS = {"Hint": 5, "Phrase": 8, "Sentence": 25, "Question": 12}

def ok(**kw): return {"ok": True, **kw}
def fail(**kw): return {"ok": False, **kw}

_SENT_END = re.compile(r"""[.!?]["'”’)\]]*\s*$""")

def sentence_case(before: str, suggestion: str) -> str:
    """Auto rule: at sentence start (empty / after . ! ?), capitalize first letter."""
    b = (before or "").rstrip()
    if b and not _SENT_END.search(b):
        return suggestion
    m = re.search(r"[A-Za-z]", suggestion)
    if not m:
        return suggestion
    i = m.start()
    return suggestion[:i] + suggestion[i].upper() + suggestion[i + 1:]

def parse_options(raw: str, assist: str) -> list[str]:
    out = []
    for line in raw.splitlines():
        s = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip().strip('"')
        if s and s not in out: out.append(s)
    cap = CAPS.get(assist, 8)
    return [s for s in out if len(s.split()) <= cap + 3][:3]

@app.get("/api/health")
async def health():
    lt = False
    try:
        async with httpx.AsyncClient(timeout=3) as cl:
            r = await cl.get(settings.languagetool_url.replace("/v2/check", "/v2/languages"))
            lt = r.status_code == 200
    except Exception: pass
    return ok(meta_configured=bool(settings.meta_api_key), model=settings.meta_model,
              fallback_configured=bool(settings.openrouter_api_key), languagetool=lt,
              tavily=bool(settings.tavily_api_key), supabase=bool(settings.supabase_url))

@app.post("/api/complete")
async def complete(body: CompleteIn):
    try:
        s, u = prompts.complete_prompt(body.context, body.level, body.before, body.after, body.assist_level, body.voice, body.style)
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=650, temperature=0.8)
        sugg = [sentence_case(body.before, x) for x in parse_options(raw, body.assist_level)]
        return ok(suggestions=sugg, version=body.version, model=model, ms=round(dt * 1000), usage=usage) if sugg else fail(version=body.version)
    except Exception as e: return fail(error=str(e)[:200], version=body.version)

@app.post("/api/annotate")
async def annotate(body: TextIn):
    try:
        s, u = prompts.annotate_prompt(body.context, body.level, body.text, body.before, body.after, body.style)
        data, usage, model = await llm.json_call(s, u, max_tokens=1000, temperature=0.4)
        issues = filter_anchored(data.get("issues", []), body.text)
        cache: dict = {}
        for it in issues:
            rep = (it.get("replacement") or "").strip()
            if not rep:
                continue
            if await swap_ok(body.text, it["quote"], rep, cache):
                continue
            # broken swap (e.g. noun->determiner): try same-POS synonyms, LT+slot filtered
            fixed = ""
            if " " not in it["quote"].strip():
                try:
                    ss, uu = prompts.synonyms_prompt(body.context, body.level, it["quote"], body.text[:400], body.style)
                    d2, _, _ = await llm.json_call(ss, uu, max_tokens=500, temperature=0.4)
                    for cand in [w for w in d2.get("synonyms", []) if isinstance(w, str) and " " not in w][:8]:
                        if cand.lower() != it["quote"].lower() and await swap_ok(body.text, it["quote"], cand, cache):
                            fixed = cand; break
                except Exception:
                    pass
            it["replacement"] = fixed  # "" = flag shown, no unsafe Apply offered
        return ok(issues=issues, model=model, usage=usage)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/reactions")
async def reactions(body: TextIn):
    try:
        s, u = prompts.reactions_prompt(body.context, body.level, body.text, body.persona, body.style)
        data, usage, model = await llm.json_call(s, u, max_tokens=1100, temperature=0.6)
        return ok(reactions=filter_anchored(data.get("reactions", []), body.text), model=model, usage=usage)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/main-idea")
async def main_idea(body: TextIn):
    try:
        s, u = prompts.main_idea_prompt(body.context, body.level, body.text, body.style)
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=350, temperature=0.4)
        idea = raw.strip().splitlines()[0] if raw.strip() else ""
        return ok(main_idea=idea, model=model, ms=round(dt * 1000), usage=usage) if idea else fail()
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/outline")
async def outline(body: TextIn):
    try:
        s, u = prompts.outline_prompt(body.text)
        data, usage, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        return ok(outline=filter_anchored(data.get("outline", []), body.text), model=model, usage=usage)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/synonyms")
async def synonyms(body: SynonymIn):
    try:
        s, u = prompts.synonyms_prompt(body.context, body.level, body.word, body.sentence, body.style)
        data, usage, model = await llm.json_call(s, u, max_tokens=600, temperature=0.5)
        words = [w for w in data.get("synonyms", []) if isinstance(w, str) and " " not in w][:8]
        if body.sentence and body.word:
            cache: dict = {}
            kept = []
            for w in words:
                if w.lower() != body.word.lower() and await swap_ok(body.sentence, body.word, w, cache):
                    kept.append(w)
            if kept:
                words = kept
        return ok(synonyms=words, model=model, usage=usage)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/grammar")
async def grammar(body: GrammarIn):
    try:
        async with httpx.AsyncClient(timeout=8) as cl:
            r = await cl.post(settings.languagetool_url, data={"text": body.text, "language": "en-US", "level": "picky"})
            r.raise_for_status(); d = r.json()
        matches = [{"from": m["offset"], "to": m["offset"] + m["length"], "message": m.get("message", ""),
                    "replacements": [x["value"] for x in m.get("replacements", [])[:3]],
                    "rule": (m.get("rule") or {}).get("id", "")} for m in d.get("matches", [])]
        return ok(matches=filter_matches(body.text, matches))
    except Exception as e: return fail(error=str(e)[:120])

@app.post("/api/readings")
async def readings(body: TextIn):
    if not settings.tavily_api_key: return fail(error="TAVILY_API_KEY not set")
    try:
        s, u = prompts.claims_prompt(body.text)
        data, _, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        claims = filter_anchored(data.get("claims", []), body.text)[:4]
        out = []
        async with httpx.AsyncClient(timeout=15) as cl:
            for c in claims:
                r = await cl.post("https://api.tavily.com/search", json={"api_key": settings.tavily_api_key, "query": c.get("query") or c["quote"], "max_results": 3})
                res = (r.json().get("results") or []) if r.status_code == 200 else []
                if not res: continue
                listing = "\n".join(f"- {x.get('title','')} | {x.get('url','')} | {(x.get('content') or '')[:300]}" for x in res)
                s2, u2 = prompts.relevance_prompt(c["quote"], listing)
                try:
                    d2, _, _ = await llm.json_call(s2, u2, max_tokens=800, temperature=0.3)
                    labelled = d2.get("readings", [])
                except Exception: labelled = []
                for item in labelled:
                    item["claim_quote"], item["claim_context"] = c["quote"], c["context"]
                out.extend(labelled or [{"title": x.get("title", ""), "url": x.get("url", ""), "label": "related", "why": "", "excerpt": (x.get("content") or "")[:200], "claim_quote": c["quote"], "claim_context": c["context"]} for x in res])
        return ok(readings=out, claims=claims, model=model)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/lint")
async def lint(body: LintIn):
    if not body.active_rules:
        return ok(lint_results=[])
    try:
        import json as _json
        rules = [{"id": r.id, "color": r.category, "rule": r.rule} for r in body.active_rules if r.id and r.rule]
        rule_map = {r["id"]: r["color"] for r in rules}
        s, u = prompts.lint_prompt(body.context, body.style, body.text, _json.dumps(rules))
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
        return ok(lint_results=out[:12], model=model, usage=usage)
    except Exception as e:
        return fail(error=str(e)[:200])

@app.post("/api/waitlist")
async def waitlist(body: WaitlistIn):
    email = body.email.strip().lower()
    if "@" not in email: return fail(error="invalid email")
    if settings.supabase_url and settings.supabase_key:
        try:
            async with httpx.AsyncClient(timeout=10) as cl:
                r = await cl.post(f"{settings.supabase_url}/rest/v1/waitlist",
                                  json={"email": email, "note": body.note},
                                  headers={"apikey": settings.supabase_key, "Authorization": f"Bearer {settings.supabase_key}", "Content-Type": "application/json", "Prefer": "return=minimal"})
                if r.status_code in (200, 201, 204, 409): return ok(store="supabase")
        except Exception: pass
    try:
        p = ROOT / "data" / "waitlist.jsonl"; p.parent.mkdir(exist_ok=True)
        with p.open("a") as f: f.write(json.dumps({"email": email, "note": body.note}) + "\n")
        return ok(store="local-file")
    except Exception as e: return fail(error=str(e)[:120])

@app.get("/")
async def root(): return ok(service="byline-v2", model=settings.meta_model)
