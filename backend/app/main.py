"""Byline v2 API — quote-anchored, soft-fail everywhere. Meta Muse primary."""
from __future__ import annotations
import json, logging, re
from pathlib import Path
import httpx
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from . import llm, prompts
from .security import rate_ok, is_safe_public_url
from .config import settings, cors_list, ROOT
from .models import CompleteIn, TextIn, SynonymIn, GrammarIn, WaitlistIn, ClaimIn, LintIn, ResearchIn, DiagramIn, OutlineGenIn, DatasetIn, SetupAgentIn, SetupQuestionsIn, CiteIn, BiblioIn
from . import citations
from .quote import filter_anchored
from .grammar_filter import filter_matches
from .swapcheck import swap_ok, match_case

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Byline v2")
app.add_middleware(CORSMiddleware, allow_origins=cors_list() or ["http://localhost:5173"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

log = logging.getLogger("byline.api")

@app.middleware("http")
async def guard(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.url.path != "/api/health":
        ip = request.client.host if request.client else "unknown"
        if not rate_ok(f"{ip}:{request.url.path}", limit=120, window=60.0):
            return JSONResponse({"ok": False, "error": "rate_limited"}, status_code=429)
        clen = request.headers.get("content-length")
        if clen and clen.isdigit() and int(clen) > 22 * 1024 * 1024:
            return JSONResponse({"ok": False, "error": "payload_too_large"}, status_code=413)
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    return resp

CAPS = {"Hint": 5, "Phrase": 8, "Sentence": 25, "Question": 12}
ASSIST_TOKENS = {"Hint": 120, "Phrase": 220, "Sentence": 400, "Question": 220}

def ok(**kw): return {"ok": True, **kw}
def fail(**kw): return {"ok": False, **kw}
def err(e: Exception):
    log.warning("endpoint error: %s: %s", type(e).__name__, str(e)[:300])
    return fail(error="upstream_error")
def meta(endpoint, system, user, usage, model, ms=0, temperature=0, max_tokens=0):
    return {"endpoint": endpoint, "model": model or "", "ms": int(ms or 0),
            "usage": {"in": (usage or {}).get("prompt_tokens", 0), "out": (usage or {}).get("completion_tokens", 0),
                      "reasoning": ((usage or {}).get("completion_tokens_details") or {}).get("reasoning_tokens", 0)},
            "params": {"temperature": temperature, "max_tokens": max_tokens, "reasoning_effort": "minimal"},
            "prompt": {"system": (system or "")[:20000], "user": (user or "")[:20000]}}

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
    return ok(meta_configured=bool(settings.meta_api_key), model=settings.meta_model, languagetool=lt)

@app.post("/api/complete")
async def complete(body: CompleteIn):
    try:
        s, u = prompts.complete_prompt(body.context, body.level, body.before, body.after, body.assist_level, body.voice, body.style, body.facts, body.last_two)
        try:
            t0 = __import__('time').perf_counter(); local_raw = await llm.local_text(s, u); dt = __import__('time').perf_counter() - t0
            sugg = [sentence_case(body.before, x) for x in parse_options(local_raw, body.assist_level)]
            if sugg: return ok(suggestions=sugg, version=body.version, model=f"local:{llm.settings.local_model or 'glimmer-lora'}", ms=round(dt * 1000), usage={})
            raise ValueError("local empty")
        except Exception:
            pass
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=ASSIST_TOKENS.get(body.assist_level, 220), temperature=0.8)
        sugg = [sentence_case(body.before, x) for x in parse_options(raw, body.assist_level)]
        return ok(suggestions=sugg, version=body.version, model=model, ms=round(dt * 1000), usage=usage, meta=meta("complete", s, u, usage, model, dt*1000, 0.8, ASSIST_TOKENS.get(body.assist_level, 220))) if sugg else fail(version=body.version)
    except Exception as e: return err(e)

ZIPF_THRESHOLDS = {"Simple": 4.6, "Casual": 4.4, "Slang": 4.4, "General": 4.0, "Formal": 3.6, "Technical": 3.2, "Academic": 3.2, "Expert": 2.8, "Buzzwords": 4.2, "Bullshitting": 4.2}

def frequency_candidates(text: str, level: str) -> str:
    try:
        from wordfreq import zipf_frequency
        import re as _re
        words = sorted(set(w.lower() for w in _re.findall(r"[A-Za-z][a-z]{3,}", text)))
        th = ZIPF_THRESHOLDS.get(level, 4.0)
        scored = [(zipf_frequency(w, "en"), w) for w in words]
        rare = sorted((z, w) for z, w in scored if 0 < z < th)[:20]
        return ", ".join(f"{w} ({z:.1f})" for z, w in rare)
    except Exception:
        return ""

@app.post("/api/annotate")
async def annotate(body: TextIn):
    try:
        s, u = prompts.annotate_prompt(body.context, body.level, body.text, body.before, body.after, body.style, frequency_candidates(body.text, body.level))
        data, usage, model = await llm.json_call(s, u, max_tokens=1000, temperature=0.4)
        issues = filter_anchored(data.get("issues", []), body.text)
        cache: dict = {}
        for it in issues:
            rep = (it.get("replacement") or "").strip()
            raw_alts = []
            for a in it.get("alternatives", []) or []:
                if isinstance(a, dict) and a.get("text"): raw_alts.append({"text": str(a["text"]), "note": str(a.get("note", ""))})
                elif isinstance(a, str): raw_alts.append({"text": a, "note": ""})
            if rep and not any(a["text"].lower() == rep.lower() for a in raw_alts): raw_alts.insert(0, {"text": rep, "note": ""})
            valid = []
            for a in raw_alts[:5]:
                cand = match_case(it["quote"], a["text"])
                if cand.lower() != it["quote"].lower() and await swap_ok(body.text, it["quote"], cand, cache, it.get("context", "")):
                    valid.append({"text": cand, "note": a["note"]})
                if len(valid) >= 3: break
            if not valid and " " not in it["quote"].strip():
                try:
                    ss, uu = prompts.synonyms_prompt(body.context, body.level, it["quote"], body.text[:400], body.style)
                    d2, _, _ = await llm.json_call(ss, uu, max_tokens=500, temperature=0.4)
                    for cand0 in [w for w in d2.get("synonyms", []) if isinstance(w, str) and " " not in w][:8]:
                        cand = match_case(it["quote"], cand0)
                        if cand.lower() != it["quote"].lower() and await swap_ok(body.text, it["quote"], cand, cache, it.get("context", "")):
                            valid.append({"text": cand, "note": "synonym"})
                        if len(valid) >= 3: break
                except Exception:
                    pass
            it["alternatives"] = valid
            it["replacement"] = valid[0]["text"] if valid else "" 
        return ok(issues=issues, model=model, usage=usage, meta=meta("annotate", s, u, usage, model, 0, 0.4, 1000))
    except Exception as e: return err(e)

@app.post("/api/reactions")
async def reactions(body: TextIn):
    try:
        s, u = prompts.reactions_prompt(body.context, body.level, body.text, body.persona, body.style)
        data, usage, model = await llm.json_call(s, u, max_tokens=1100, temperature=0.6)
        return ok(reactions=filter_anchored(data.get("reactions", []), body.text), model=model, usage=usage, meta=meta("reactions", s, u, usage, model, 0, 0.6, 1100))
    except Exception as e: return err(e)

@app.post("/api/main-idea")
async def main_idea(body: TextIn):
    try:
        s, u = prompts.main_idea_prompt(body.context, body.level, body.text, body.style)
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=350, temperature=0.4)
        idea = raw.strip().splitlines()[0] if raw.strip() else ""
        return ok(main_idea=idea, model=model, ms=round(dt * 1000), usage=usage, meta=meta("main-idea", s, u, usage, model, dt*1000, 0.4, 350)) if idea else fail()
    except Exception as e: return err(e)

@app.post("/api/outline")
async def outline(body: TextIn):
    try:
        s, u = prompts.outline_prompt(body.text)
        data, usage, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        return ok(outline=filter_anchored(data.get("outline", []), body.text), model=model, usage=usage, meta=meta("outline", s, u, usage, model, 0, 0.3, 800))
    except Exception as e: return err(e)

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
            words = kept
        return ok(synonyms=words, model=model, usage=usage, meta=meta("synonyms", s, u, usage, model, 0, 0.5, 600))
    except Exception as e: return err(e)

@app.post("/api/grammar")
async def grammar(body: GrammarIn):
    try:
        async with httpx.AsyncClient(timeout=8) as cl:
            r = await cl.post(settings.languagetool_url, data={"text": body.text, "language": "en-US", "level": "picky"})
            r.raise_for_status(); d = r.json()
        matches = [{"from": m["offset"], "to": m["offset"] + m["length"], "message": m.get("message", ""),
                    "replacements": [x["value"] for x in m.get("replacements", [])[:3]],
                    "rule": (m.get("rule") or {}).get("id", "")} for m in d.get("matches", [])]
        return ok(matches=filter_matches(body.text, matches), meta={"endpoint":"grammar","model":"LanguageTool","ms":0,"usage":{"in":0,"out":0,"reasoning":0},"params":{"temperature":0,"max_tokens":0,"reasoning_effort":""},"prompt":{"system":"LanguageTool /v2/check level=picky","user":body.text[:20000]}})
    except Exception as e: return err(e)

def parse_verdict(answer: str):
    low = answer.lower()
    verdict = "qualifies"
    if low.startswith("evidence supports") or "supports the claim" in low[:120] or "evidence **supports**" in low[:160]: verdict = "supports"
    elif "contradict" in low[:160]: verdict = "contradicts"
    first = answer.strip().strip("*# ").split(". ")[0]
    summary = (first[:280] + ("." if first and not first.endswith(".") else "")).strip()
    return verdict, summary

@app.post("/api/readings")
async def readings(body: TextIn):
    try:
        s, u = prompts.claims_prompt(body.text)
        data, _, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        claims = filter_anchored(data.get("claims", []), body.text)[:4]
        out = []
        for c in claims:
            try:
                r = await llm.responses_call(
                    f"Claim from my draft: {c['quote']}\nUse web search. Answer in 2-3 sentences: does evidence support, contradict, or qualify this claim? Cite sources inline.",
                    instructions="Research assistant. Ground every statement in web search results and cite them.",
                    tools=[{"type": "web_search", "search_context_size": "medium"}], include=["web_search_call.results"], max_output_tokens=900)
            except Exception:
                continue
            answer = (r.get("text") or "").strip()
            verdict, summary = parse_verdict(answer)
            seen = set()
            srcs = [{"title": x.get("title", ""), "url": x.get("url", "")} for x in (r.get("search_results") or [])[:3]]
            if not srcs:
                srcs = [{"title": a.get("title", ""), "url": a.get("url", "")} for a in (r.get("annotations") or [])[:2]]
            for res in srcs:
                url = res.get("url", "")
                if not url or url in seen or not url.startswith(("http://", "https://")): continue
                seen.add(url)
                from urllib.parse import urlparse as _up
                out.append({"title": res.get("title", "") or url, "url": url, "label": verdict, "verdict": verdict,
                            "why": summary, "summary": summary, "excerpt": summary,
                            "domain": _up(url).netloc, "claim_quote": c["quote"], "claim_context": c["context"]})
        return ok(readings=out, claims=claims, model=model, meta=meta("readings", s, u, {}, model, 0, 0.3, 800))
    except Exception as e: return err(e)

FACT_SCHEMA = {"type": "object", "properties": {"facts": {"type": "array", "items": {"type": "object", "properties": {"fact": {"type": "string"}, "source_title": {"type": "string"}, "url": {"type": "string"}, "locator": {"type": "string"}, "excerpt": {"type": "string"}}, "required": ["fact", "source_title", "url", "locator", "excerpt"], "additionalProperties": False}}}, "required": ["facts"], "additionalProperties": False}

@app.post("/api/research")
async def research(body: ResearchIn):
    url = body.url.strip()
    if not is_safe_public_url(url): return fail(error="url_blocked")
    try:
        if url.lower().split("?")[0].endswith(".pdf"):
            r = await llm.responses_call([{"role": "user", "content": [
                {"type": "input_text", "text": f"{body.question} Extract structured facts as JSON per schema. locator = page number if known."},
                {"type": "input_file", "file_url": url}]}],
                instructions=prompts.FACTS_SYSTEM, text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
            facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
        else:
            r = await llm.responses_call(f"Research this source for my writing: {url}\nQuestion: {body.question}\nOpen/search the source, then extract structured facts as JSON per schema.",
                instructions=prompts.FACTS_SYSTEM, tools=[{"type": "web_search", "search_context_size": "high"}], include=["web_search_call.results"], text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
            facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
            if not facts and r.get("text"):
                facts = [{"fact": r["text"][:400], "source_title": url, "url": url, "locator": "web", "excerpt": r["text"][:240]}]
        for f in facts: f.setdefault("url", url)
        return ok(facts=facts[:12], model=r.get("model", ""), usage=r.get("usage"))
    except Exception as e: return err(e)

@app.post("/api/research/upload")
async def research_upload(file: UploadFile = File(...), question: str = "Extract the key facts relevant to my writing, with sources."):
    try:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024: return fail(error="file >20MB")
        # Local parse first: docx/csv/xlsx/txt/md → text fallback when Meta Files rejects binary
        local_text = citations.extract_doc_text(file.filename or "", content)
        if local_text:
            try:
                s, u = prompts.complete_prompt("", "General", local_text[:8000], "", "Phrase", "", "")
                data, usage, model = await llm.json_call(
                    prompts.FACTS_SYSTEM,
                    f"SOURCE: {file.filename}\nEXCERPT:\n{local_text[:8000]}\nQ: {question}\nReturn {{\"facts\":[...]}}.",
                    max_tokens=1800, temperature=0.3)
                facts = data.get("facts", []) if isinstance(data, dict) else []
                for f in facts:
                    f.setdefault("source_title", file.filename or "upload")
                    f.setdefault("url", file.filename or "upload")
                if facts: return ok(facts=facts[:12], model=model, usage=usage, parsed="local-text")
            except Exception: pass  # fall through to Meta Files path
        async with httpx.AsyncClient(timeout=60) as cl:
            up = await cl.post(f"{settings.meta_base_url}/files", headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                               data={"purpose": "user_data"}, files={"file": (file.filename or "upload", content, file.content_type or "application/octet-stream")})
            up.raise_for_status(); fid = up.json().get("id", "")
            if not fid: return fail(error="Meta Files upload returned no id")
            r = await llm.responses_call([{"role": "user", "content": [
                {"type": "input_text", "text": f"{question} Extract structured facts as JSON per schema. locator = page/section if known."},
                {"type": "input_file", "file_id": fid}]}],
                instructions=prompts.FACTS_SYSTEM, text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
        facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
        for f in facts: f.setdefault("source_title", file.filename or "upload")
        return ok(facts=facts[:12], file_id=fid, model=r.get("model", ""))
    except Exception as e: return err(e)

@app.post("/api/diagram")
async def diagram(body: DiagramIn):
    try:
        s, u = prompts.diagram_prompt(body.context, body.text, body.kind if body.kind in ("mindmap", "flowchart") else "mindmap")
        data, usage, model = await llm.json_call(s, u, max_tokens=1400, temperature=0.4)
        mermaid = (data.get("mermaid") or "").strip()
        if not mermaid or not (mermaid.startswith("mindmap") or mermaid.startswith("flowchart") or mermaid.startswith("graph")): return fail(error="bad mermaid")
        nodes = [n for n in data.get("nodes", []) if isinstance(n, dict) and (n.get("quote", "") in body.text)]
        return ok(mermaid=mermaid, caption=data.get("caption", ""), nodes=nodes, model=model, usage=usage)
    except Exception as e: return err(e)

@app.post("/api/outline-generate")
async def outline_generate(body: OutlineGenIn):
    try:
        s, u = prompts.outline_generate_prompt(json.dumps(body.answers)[:3000])
        data, usage, model = await llm.json_call(s, u, max_tokens=1400, temperature=0.5)
        if not data.get("outline"): return fail()
        clamp = lambda v, lo, hi, d: v if isinstance(v, int) and lo <= v <= hi else d
        return ok(context_summary=data.get("context_summary", ""), audience_text=data.get("audience_text", ""), audience_level=clamp(data.get("audience_level"), 1, 5, 3),
                  diction=data.get("diction") if data.get("diction") in prompts.DICTIONS else "General",
                  tones=[t for t in data.get("tones", []) if t in prompts.TONES][:3] if isinstance(data.get("tones"), list) else [],
                  voice=str(data.get("voice", ""))[:200], rhythm=clamp(data.get("rhythm"), 1, 3, 2),
                  gram_voice=data.get("gram_voice") if data.get("gram_voice") in ("active", "passive") else "passive",
                  clause=data.get("clause") if data.get("clause") in prompts.CLAUSES else "Subordinated",
                  density=clamp(data.get("density"), 1, 3, 2),
                  outline=data.get("outline", []), model=model, usage=usage)
    except Exception as e: return err(e)

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > 30 * 1024 * 1024: return fail(error="audio >30MB")
        req = json.dumps({"mode": "PUSH_TO_TALK", "model": "muse-voice-transcribe-1.0", "audioEncoding": "WAV"})
        async with httpx.AsyncClient(timeout=90) as cl:
            r = await cl.post(f"{settings.meta_base_url}/asr/transcribe", headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                              data={"request": req}, files={"audio": (file.filename or "audio.wav", content, "audio/wav")})
            r.raise_for_status(); d = r.json()
        return ok(transcript=d.get("transcript", ""), turns=d.get("turns", []))
    except Exception as e: return err(e)

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
        return ok(lint_results=out[:12], model=model, usage=usage, meta=meta("lint", s, u, usage, model, 0, 0.3, 1800))
    except Exception as e:
        return err(e)

@app.post("/api/cite")
async def cite(body: CiteIn):
    try:
        inline = citations.format_inline(body.source_title, body.url, body.locator, body.style, body.year)
        entry = citations.format_bibliography(body.source_title, body.url, body.locator, body.style, body.author, body.year)
        out = {"ok": True, "inline": inline, "entry": entry, "style": body.style.lower()}
        if body.template:
            out["sentence"] = citations.apply_template(body.template, inline, body.claim, body.excerpt, body.stat, body.term or body.claim)
        return out
    except Exception as e: return err(e)

@app.post("/api/cite/bibliography")
async def bibliography(body: BiblioIn):
    try:
        entries = [citations.format_bibliography(i.source_title, i.url, i.locator, body.style, i.author, i.year) for i in body.items[:50]]
        return ok(entries=entries, style=body.style.lower(), count=len(entries))
    except Exception as e: return err(e)

MAPS_TO = {"diction","tone","voice","audience","audience_level","rhythm","clause","density","doc_type","outline_focus"}
def fallback_questions(goal: str, context: str):
    topic = (goal or "this piece").strip()[:60]
    return [
        {"id":"q_diction","question":f"Register for {topic}?","maps_to":"diction","options":["General","Formal","Academic","Casual","Technical"]},
        {"id":"q_tone","question":"Tone readers should feel?","maps_to":"tone","options":["Serious","Objective","Humorous","Emotional"]},
        {"id":"q_audience","question":"Who reads this first?","maps_to":"audience","options":["Beginners","General readers","Practitioners","Experts"]},
        {"id":"q_voice","question":"Voice closest to yours?","maps_to":"voice","options":["Direct and plain","Warm and personal","Analytical and precise","Bold and opinionated"]},
        {"id":"q_rhythm","question":"Sentence rhythm?","maps_to":"rhythm","options":["Staccato","Varied","Flowing"]},
        {"id":"q_outline","question":"Outline should prioritise?","maps_to":"outline_focus","options":["Argument first","Story/chronology","Problem → solution","Comparison"]},
    ]

@app.post("/api/setup-questions")
async def setup_questions(body: SetupQuestionsIn):
    if not body.goal.strip() and not body.context.strip(): return fail(error="empty")
    try:
        s, u = prompts.setup_questions_prompt(body.goal, body.context)
        data, usage, model = await llm.json_call(s, u, max_tokens=1100, temperature=0.4)
        qs = []
        for q in (data.get("questions") or [])[:7]:
            if not isinstance(q, dict) or not q.get("question"): continue
            qs.append({"id": str(q.get("id") or f"q{len(qs)+1}")[:40], "question": str(q["question"])[:240],
                       "maps_to": q.get("maps_to") if q.get("maps_to") in MAPS_TO else "outline_focus",
                       "options": [str(o)[:80] for o in (q.get("options") or []) if isinstance(o, (str, int))][:5]})
        if len(qs) >= 3: return ok(questions=qs, model=model, usage=usage, meta=meta("setup-questions", s, u, usage, model, 0, 0.4, 1100))
        raise ValueError("too few questions")
    except Exception:
        return ok(questions=fallback_questions(body.goal, body.context), model="fallback", usage={})

@app.post("/api/setup-agent")
async def setup_agent(body: SetupAgentIn):
    import hashlib as _hl
    raw = (body.raw_goal or body.transcript or json.dumps(body.answers)[:2000] or "").strip()
    if not raw: return fail(error="empty goal")
    gl = raw.lower()
    # deterministic hybrid base: keyword -> preset rules
    base: list[str] = ["R_AMB_01"]
    def add(rid: str):
        if rid not in base: base.append(rid)
    if any(k in gl for k in ("hype", "buzzword", "marketing", "generic", "revolutionary", "game-chang")): add("R_VIO_02"); add("R_VIO_04")
    if any(k in gl for k in ("metric", "data", "evidence", "investor", "security", "enterprise", "cac", "nrr", "unit economic", "benchmark", "study")): add("R_RSE_02"); add("R_RSE_01")
    if any(k in gl for k in ("therefore", "consequently", "cause", "risk", "mitigat")): add("R_AMB_03")
    if any(k in gl for k in ("passive", "blame", "actor", "concise", "wordy", "fluff")): add("R_GRN_04"); add("R_GRN_01")
    if any(k in gl for k in ("flow", "transition", "abrupt", "jarring")): add("R_CYN_02")
    if any(k in gl for k in ("hedg", "authoritative", "confident")): add("R_VIO_01")
    base = base[:6]
    # diction heuristic
    diction = "General"
    if any(k in gl for k in ("technical", "saas", "security", "enterprise", "api", "b2b")): diction = "Technical"
    elif any(k in gl for k in ("academic", "scholarly", "paper", "thesis")): diction = "Academic"
    elif any(k in gl for k in ("casual", "blog", "gen-z", "gen z")): diction = "Casual"
    elif any(k in gl for k in ("formal", "investor", "conservative", "pitch")): diction = "Formal"
    tone = "Authoritative, Objective, Risk-Aware" if any(k in gl for k in ("investor", "enterprise", "authoritative", "conservative")) else "Serious, Objective"
    payload = {
        "configuration_id": "cfg_" + _hl.md5(raw.encode()).hexdigest()[:8],
        "dimensions": {"diction": diction, "tone": tone,
            "voice": "Direct, Metrics-Driven Technical Founder" if "investor" in gl or "enterprise" in gl else "Clear domain writer",
            "style": "Staccato sentences. Maximum 18 words per sentence. Zero passive voice." if any(k in gl for k in ("staccato", "enterprise", "investor", "technical")) else "Varied sentences. Active voice preferred."},
        "active_preset_rules": base,
        "custom_rules": [],
        "ghost_text_filters": {"starter_categories": ["Evidence & Corroboration", "Action & Directive"],
            "allowed_transitions": ["Consequently", "Therefore", "Specifically", "In fact"]},
        "followup_question": "" if len(raw.split()) > 12 else "Who reads this and what must they believe after paragraph one?",
    }
    # LLM synthesis: refine dims + customs (presets intersected with base)
    try:
        lib = [{"id": i, "name": n, "rule": r} for i, n, r in [
            ("R_AMB_01","BLUF","Main takeaway first"),("R_AMB_02","Premise Contradiction","No contradicting premises"),
            ("R_AMB_03","Unsupported Causal Jump","No therefore without entailment"),("R_AMB_04","Scope Alignment","No absolute generalizations"),
            ("R_AMB_05","False Dilemma","No forced binary"),("R_GRN_01","Nominalization","Active verbs over zombie nouns"),
            ("R_GRN_02","Redundant Pairs","No tautologies"),("R_GRN_03","Prepositional Stack","Max 2 prepositional phrases"),
            ("R_GRN_04","Passive Blame","No actor-hiding passive"),("R_GRN_05","Vague Pronoun","No ambiguous this/it"),
            ("R_CYN_01","Opener Monotony","Vary openers"),("R_CYN_02","Abrupt Shift","Bridge topic shifts"),
            ("R_CYN_03","Stress Position","End on key terms"),("R_CYN_04","Parallelism","Parallel list forms"),
            ("R_RSE_01","Unanchored Jargon","Define jargon first use"),("R_RSE_02","Unsubstantiated Claim","Numbers+source for empirical claims"),
            ("R_RSE_03","Abstract Without Instance","Concrete example per abstraction"),("R_RSE_04","No-tradeoff Absolute","State trade-offs"),
            ("R_VIO_01","Hedging","No weak qualifiers"),("R_VIO_02","Buzzword Saturation","No generic buzzwords"),
            ("R_VIO_03","Stacked Adverbs","Strong word over very+weak"),("R_VIO_04","Forced Enthusiasm","No exclamation/cheerleading")]]
        s, u = prompts.setup_agent_prompt(raw, json.dumps(lib))
        data, usage, model = await llm.json_call(s, u, max_tokens=1200, temperature=0.3)
        valid = {x["id"] for x in lib}
        llm_rules = [r for r in (data.get("active_preset_rules") or []) if r in valid]
        if llm_rules: payload["active_preset_rules"] = list(dict.fromkeys(base + llm_rules))[:6]
        dims = data.get("dimensions") or {}
        for k in ("diction", "tone", "voice", "style"):
            if isinstance(dims.get(k), str) and dims[k].strip(): payload["dimensions"][k] = dims[k].strip()[:300]
        if payload["dimensions"]["diction"] not in prompts.DICTIONS: payload["dimensions"]["diction"] = diction
        customs = []
        for i, c in enumerate((data.get("custom_rules") or [])[:3]):
            if isinstance(c, dict) and c.get("rule"):
                customs.append({"id": c.get("id") or f"CUSTOM_ENT_{i+1:02d}",
                    "category": c.get("category") if c.get("category") in ("amber","green","cyan","rose","violet") else "violet",
                    "rule": str(c["rule"])[:400]})
        if customs: payload["custom_rules"] = customs
        gf = data.get("ghost_text_filters") or {}
        if isinstance(gf.get("allowed_transitions"), list) and gf["allowed_transitions"]:
            payload["ghost_text_filters"]["allowed_transitions"] = [str(t)[:24] for t in gf["allowed_transitions"] if isinstance(t, str)][:6]
        if isinstance(gf.get("starter_categories"), list) and gf["starter_categories"]:
            payload["ghost_text_filters"]["starter_categories"] = [str(t)[:40] for t in gf["starter_categories"] if isinstance(t, str)][:5]
        if isinstance(data.get("followup_question"), str): payload["followup_question"] = data["followup_question"][:240]
        return ok(model=model, usage=usage, **payload)
    except Exception:
        return ok(model="deterministic", usage={}, **payload)

@app.post("/api/dataset")
async def dataset(body: DatasetIn):
    try:
        p = ROOT / "data" / "dataset.jsonl"; p.parent.mkdir(exist_ok=True)
        n = 0
        with p.open("a") as f:
            for pair in body.pairs[:200]:
                if pair.get("before") and pair.get("accepted"):
                    f.write(json.dumps({"context": pair.get("context", ""), "before": pair["before"], "accepted": pair["accepted"], "assist": pair.get("assist", ""), "ts": pair.get("ts", 0)}) + "\n"); n += 1
        total = sum(1 for _ in p.open()) if p.exists() else 0
        return ok(added=n, total=total)
    except Exception as e: return err(e)

@app.post("/api/waitlist")
async def waitlist(body: WaitlistIn):
    email = body.email.strip().lower()
    if body.company: return ok(store="supabase")
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
    except Exception as e: return err(e)

@app.get("/")
async def root(): return ok(service="byline-v2", model=settings.meta_model)
