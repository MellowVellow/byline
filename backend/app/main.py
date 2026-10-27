"""Byline v2 API — quote-anchored, soft-fail everywhere. Meta Muse primary."""
from __future__ import annotations
import json, logging, re
from pathlib import Path
import httpx
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from . import llm, prompts
from .config import settings, cors_list, ROOT
from .models import CompleteIn, TextIn, SynonymIn, GrammarIn, WaitlistIn, ClaimIn, LintIn, ResearchIn, DiagramIn, OutlineGenIn, DatasetIn
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
              web_search=bool(settings.meta_api_key), supabase=bool(settings.supabase_url))

@app.post("/api/complete")
async def complete(body: CompleteIn):
    try:
        s, u = prompts.complete_prompt(body.context, body.level, body.before, body.after, body.assist_level, body.voice, body.style)
        try:
            t0 = __import__('time').perf_counter(); local_raw = await llm.local_text(s, u); dt = __import__('time').perf_counter() - t0
            sugg = [sentence_case(body.before, x) for x in parse_options(local_raw, body.assist_level)]
            if sugg: return ok(suggestions=sugg, version=body.version, model=f"local:{llm.settings.local_model or 'glimmer-lora'}", ms=round(dt * 1000), usage={})
            raise ValueError("local empty")
        except Exception:
            pass
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
            seen = set()
            for res in (r.get("search_results") or [])[:3]:
                url = res.get("url", "")
                if not url or url in seen: continue
                seen.add(url)
                out.append({"title": res.get("title", "") or url, "url": url, "label": "grounded", "why": answer[:240], "excerpt": answer[:240],
                            "claim_quote": c["quote"], "claim_context": c["context"]})
            if not seen and answer:
                for a in (r.get("annotations") or [])[:2]:
                    url = a.get("url", "")
                    if url and url not in seen:
                        seen.add(url)
                        out.append({"title": a.get("title", "") or url, "url": url, "label": "grounded", "why": answer[:240], "excerpt": answer[:240],
                                    "claim_quote": c["quote"], "claim_context": c["context"]})
        return ok(readings=out, claims=claims, model=model)
    except Exception as e: return fail(error=str(e)[:200])

FACT_SCHEMA = {"type": "object", "properties": {"facts": {"type": "array", "items": {"type": "object", "properties": {"fact": {"type": "string"}, "source_title": {"type": "string"}, "url": {"type": "string"}, "locator": {"type": "string"}, "excerpt": {"type": "string"}}, "required": ["fact", "source_title", "url", "locator", "excerpt"], "additionalProperties": False}}}, "required": ["facts"], "additionalProperties": False}

@app.post("/api/research")
async def research(body: ResearchIn):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")): return fail(error="url must be http(s)")
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
    except Exception as e: return fail(error=str(e)[:240])

@app.post("/api/research/upload")
async def research_upload(file: UploadFile = File(...), question: str = "Extract the key facts relevant to my writing, with sources."):
    try:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024: return fail(error="file >20MB")
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
    except Exception as e: return fail(error=str(e)[:240])

@app.post("/api/diagram")
async def diagram(body: DiagramIn):
    try:
        s, u = prompts.diagram_prompt(body.context, body.text, body.kind if body.kind in ("mindmap", "flowchart") else "mindmap")
        data, usage, model = await llm.json_call(s, u, max_tokens=1400, temperature=0.4)
        mermaid = (data.get("mermaid") or "").strip()
        if not mermaid or not (mermaid.startswith("mindmap") or mermaid.startswith("flowchart") or mermaid.startswith("graph")): return fail(error="bad mermaid")
        nodes = [n for n in data.get("nodes", []) if isinstance(n, dict) and (n.get("quote", "") in body.text)]
        return ok(mermaid=mermaid, caption=data.get("caption", ""), nodes=nodes, model=model, usage=usage)
    except Exception as e: return fail(error=str(e)[:200])

@app.post("/api/outline-generate")
async def outline_generate(body: OutlineGenIn):
    try:
        s, u = prompts.outline_generate_prompt(json.dumps(body.answers)[:3000])
        data, usage, model = await llm.json_call(s, u, max_tokens=1400, temperature=0.5)
        return ok(context_summary=data.get("context_summary", ""), audience_text=data.get("audience_text", ""), audience_level=data.get("audience_level", 3),
                  outline=data.get("outline", []), model=model, usage=usage) if data.get("outline") else fail()
    except Exception as e: return fail(error=str(e)[:200])

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
    except Exception as e: return fail(error=str(e)[:240])

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
    except Exception as e: return fail(error=str(e)[:160])

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
