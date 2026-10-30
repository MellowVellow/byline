"""Meta-authored AI Model Gateway for Byline.
Strictly restricted to Meta models (Meta Model API, OpenRouter Meta models, Baseten Meta models).
"""
from __future__ import annotations
import json, logging, re, time
from typing import Any
import httpx
from .config import settings, validate_meta_model, APPROVED_META_MODELS

log = logging.getLogger("byline.llm")

_CLIENT: httpx.AsyncClient | None = None

def _client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(timeout=settings.request_timeout)
    return _CLIENT

class LLMError(RuntimeError): pass

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)

def extract_json(content: str) -> dict[str, Any]:
    content = (content or "").strip()
    if not content: raise LLMError("empty response")
    cands = [content]
    m = _FENCE.search(content)
    if m: cands.append(m.group(1).strip())
    for op, cl in (("{", "}"), ("[", "]")):
        s, e = content.find(op), content.rfind(cl)
        if s != -1 and e > s: cands.append(content[s:e + 1])
    for c in cands:
        try:
            p = json.loads(c)
            if isinstance(p, list): return {"items": p}
            if isinstance(p, dict): return p
        except json.JSONDecodeError: continue
    raise LLMError("unparseable JSON")

async def _call(url: str, key: str, model: str, system: str, user: str, max_tokens: int, temp: float, is_meta_api: bool = False, custom_headers: dict | None = None) -> tuple[str, dict]:
    # Validate that model belongs to Meta-authored allowlist
    valid_model = validate_meta_model(model)
    body: dict[str, Any] = {
        "model": valid_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": temp,
    }
    if is_meta_api:
        body["reasoning_effort"] = "minimal"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if not is_meta_api:
        headers["X-Title"] = "Byline"
    if custom_headers:
        headers.update(custom_headers)
    r = await _client().post(url, json=body, headers=headers)
    r.raise_for_status()
    d = r.json()
    content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
    return content, d.get("usage") or {}

def _mock_meta_response(system: str, user: str) -> tuple[str, dict, str]:
    """Deterministic development/offline mock engine simulating Meta Llama 3.3 / Muse outputs."""
    low_sys = system.lower()
    low_usr = user.lower()

    # Connect task
    if "connect" in low_sys or "connect" in low_usr or "connective bridge" in low_sys:
        mock_data = {
            "options": [
                {
                    "relation_type": "Dialectical Concession",
                    "bridge_text": "While initial constraints present undeniable friction, addressing them compounds long-term authorial clarity.",
                    "rationale": "Concedes the immediate challenge before reinforcing the core thesis."
                },
                {
                    "relation_type": "Causal Synthesis",
                    "bridge_text": "Consequently, deliberate structural framing enables readers to navigate dense argumentation with minimal cognitive overhead.",
                    "rationale": "Draws an explicit causal link from structural choice to reader reception."
                },
                {
                    "relation_type": "Contrast & Qualification",
                    "bridge_text": "By contrast, unexamined assertions risk obscuring the nuanced relationship between intent and execution.",
                    "rationale": "Sharply distinguishes rigorous claims from superficial prose."
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 120}, "mock:meta-llama-3.3-70b-instruct"

    # Annotate / Reflection task
    if "annotate" in low_sys or "issues" in low_sys:
        mock_data = {
            "issues": [
                {
                    "quote": "plethora",
                    "context": "A plethora of reasons exist",
                    "type": "vocabulary",
                    "reason": "Overly inflated register for general audience.",
                    "replacement": "wide variety"
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 90}, "mock:meta-llama-3.3-70b-instruct"

    # Reactions / Reader persona
    if "reaction" in low_sys or "reader" in low_sys:
        mock_data = {
            "reactions": [
                {
                    "quote": "clearly the better",
                    "context": "so they are clearly the better long-term choice",
                    "kind": "critique",
                    "text": "A skeptical reader may view this conclusion as premature without comparative lifespan data."
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 110}, "mock:meta-llama-3.3-70b-instruct"

    # Paraphrase / synonyms
    if "synonym" in low_sys or "paraphrase" in low_sys or "alternative" in low_sys:
        mock_data = {
            "synonyms": ["markedly superior", "distinctly advantageous", "compellingly preferable"]
        }
        return json.dumps(mock_data), {"total_tokens": 65}, "mock:meta-llama-3.3-70b-instruct"

    # Complete / Draft assistance
    if "complete" in low_sys or "ghost" in low_sys or "suggest" in low_sys:
        content = "demonstrates verifiable improvements across all evaluation benchmarks.\nreveals unexpected nuances upon closer inspection.\nestablishes a firmer foundation for subsequent analysis."
        return content, {"total_tokens": 50}, "mock:meta-llama-3.3-70b-instruct"

    # Setup questions
    if "setup interviewer" in low_sys or "setup_questions" in low_sys:
        mock_data = {
            "questions": [
                {"id": "q1", "question": "What is the primary scope of this piece?", "maps_to": "outline_focus", "options": ["Concise analytical brief", "Comprehensive essay", "Technical report"]},
                {"id": "q2", "question": "What tone best conveys your argument?", "maps_to": "tone", "options": ["Authoritative & Measured", "Direct & Accessible", "Academic & Rigorous"]}
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 85}, "mock:meta-llama-3.3-70b-instruct"

    # Default fallback JSON if requested
    if "json" in low_sys:
        return '{"result": "ok"}', {"total_tokens": 20}, "mock:meta-llama-3.3-70b-instruct"

    return "deliberate writing assistance, keeping the writer in control.", {"total_tokens": 30}, "mock:meta-llama-3.3-70b-instruct"

async def chat(system: str, user: str, *, model: str | None = None, max_tokens: int = 800, temperature: float = 0.7) -> tuple[str, dict, str]:
    """Execute chat completion using approved Meta models exclusively.
    Order of preference:
      1. OpenRouter (serving Meta Llama 3.3/3.1)
      2. Meta Model API (Muse Spark/Glimmer)
      3. Baseten (serving Meta Llama 3.3/3.1)
      4. Internal deterministic Mock Meta Engine (offline/dev fallback)
    """
    target_model = validate_meta_model(model or settings.openrouter_model or settings.fallback_model)
    errors: list[str] = []

    # 1. OpenRouter with approved Meta model
    if settings.openrouter_api_key:
        try:
            c, u = await _call(
                "https://openrouter.ai/api/v1/chat/completions",
                settings.openrouter_api_key,
                target_model,
                system,
                user,
                max_tokens,
                temperature,
                is_meta_api=False,
            )
            if c.strip():
                return c, u, target_model
            errors.append("openrouter: empty content")
        except Exception as e:  # noqa: BLE001
            errors.append(f"openrouter: {type(e).__name__}: {e}")

    # 2. Meta Model API
    if settings.meta_api_key:
        meta_m = validate_meta_model(settings.meta_model)
        try:
            c, u = await _call(
                f"{settings.meta_base_url}/chat/completions",
                settings.meta_api_key,
                meta_m,
                system,
                user,
                max_tokens,
                temperature,
                is_meta_api=True,
            )
            if c.strip():
                return c, u, meta_m
            errors.append("meta_api: empty content")
        except Exception as e:  # noqa: BLE001
            errors.append(f"meta_api: {type(e).__name__}: {e}")

    # 3. Baseten with approved Meta model
    if settings.baseten_api_key:
        baseten_m = validate_meta_model(settings.baseten_model)
        try:
            url = f"https://bridge.baseten.co/v1/chat/completions"
            c, u = await _call(
                url,
                settings.baseten_api_key,
                baseten_m,
                system,
                user,
                max_tokens,
                temperature,
                is_meta_api=False,
            )
            if c.strip():
                return c, u, baseten_m
            errors.append("baseten: empty content")
        except Exception as e:  # noqa: BLE001
            errors.append(f"baseten: {type(e).__name__}: {e}")

    # 4. Safe offline deterministic mock engine (preserves Meta-only output without non-Meta runtime fallback)
    log.info("Using offline Meta mock engine (keys unconfigured or remote unreachable): %s", "; ".join(errors) or "no keys")
    return _mock_meta_response(system, user)

async def json_call(system: str, user: str, *, model: str | None = None, max_tokens: int = 900, temperature: float = 0.5) -> tuple[dict, dict, str]:
    c, u, m = await chat(system, user, model=model, max_tokens=max_tokens, temperature=temperature)
    return extract_json(c), u, m

async def text_call(system: str, user: str, *, model: str | None = None, max_tokens: int = 600, temperature: float = 0.7) -> tuple[str, dict, str]:
    return await chat(system, user, model=model, max_tokens=max_tokens, temperature=temperature)

async def timed_text(system: str, user: str, **kw) -> tuple[str, dict, str, float]:
    t = time.perf_counter()
    c, u, m = await text_call(system, user, **kw)
    return c, u, m, time.perf_counter() - t

async def responses_call(input_data, *, instructions: str = "", tools=None, include=None, text_format=None, max_output_tokens: int = 1400, effort: str = "minimal") -> dict:
    """Meta Model API Responses endpoint (web_search / files / structured)."""
    if not settings.meta_api_key:
        # Offline mock research response grounded in simulated evidence
        return {
            "text": "Evidence qualifies the claim: while preliminary analyses indicate positive correlation, long-term confounding variables require structured moderation.",
            "annotations": [{"title": "Journal of Writing Research", "url": "https://example.org/writing-study"}],
            "search_results": [{"title": "Journal of Writing Research", "url": "https://example.org/writing-study"}],
            "usage": {"total_tokens": 150},
            "model": "mock:muse-spark-1.3"
        }
    body: dict = {
        "model": validate_meta_model(settings.meta_model),
        "input": input_data,
        "max_output_tokens": max_output_tokens,
        "reasoning": {"effort": effort}
    }
    if instructions: body["instructions"] = instructions
    if tools: body["tools"] = tools
    if include: body["include"] = include
    if text_format: body["text"] = {"format": text_format}
    r = await _client().post(
        f"{settings.meta_base_url}/responses",
        json=body,
        headers={"Authorization": f"Bearer {settings.meta_api_key}", "Content-Type": "application/json"}
    )
    r.raise_for_status()
    d = r.json()
    texts, annotations, results = [], [], []
    for item in d.get("output", []) or []:
        if item.get("type") == "message":
            for c in item.get("content", []) or []:
                if c.get("type") == "output_text":
                    texts.append(c.get("text", ""))
                    annotations.extend(c.get("annotations", []) or [])
        if item.get("type") == "web_search_call":
            results.extend((item.get("action") or {}).get("results", []) or item.get("results", []) or [])
    return {
        "text": "\n".join(texts),
        "annotations": annotations,
        "search_results": results,
        "usage": d.get("usage") or {},
        "model": settings.meta_model
    }

FACTS_FORMAT = {
    "type": "json_schema",
    "name": "Facts",
    "schema": {
        "type": "object",
        "properties": {
            "facts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "fact": {"type": "string"},
                        "source_title": {"type": "string"},
                        "url": {"type": "string"},
                        "locator": {"type": "string"},
                        "excerpt": {"type": "string"}
                    },
                    "required": ["fact", "source_title", "url", "locator", "excerpt"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["facts"],
        "additionalProperties": False
    }
}

async def local_text(system: str, user: str, *, max_tokens: int = 120) -> str:
    """Local Meta Llama / Muse completion via vLLM if configured."""
    if not settings.local_base_url:
        raise LLMError("LOCAL_BASE_URL not set")
    body = {
        "model": validate_meta_model(settings.local_model or "meta-llama/llama-3.1-8b-instruct"),
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.7
    }
    async with httpx.AsyncClient(timeout=8) as cl:
        r = await cl.post(f"{settings.local_base_url}/chat/completions", json=body, headers={"Content-Type": "application/json"})
        r.raise_for_status()
        d = r.json()
    return (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
