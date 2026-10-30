import logging, time
from fastapi import APIRouter
from .. import llm, prompts
from ..models import ConnectIn
from .common import ok, fail, err, meta

log = logging.getLogger("byline.connect")
router = APIRouter()

@router.post("/api/connect")
async def connect(body: ConnectIn):
    try:
        s, u = prompts.connect_prompt(body.context, body.before, body.after, body.relation_hint)
        t0 = time.perf_counter()
        data, usage, model = await llm.json_call(s, u, max_tokens=700, temperature=0.6)
        dt = time.perf_counter() - t0
        options = data.get("options", [])
        if options and isinstance(options, list):
            return ok(
                options=options[:3],
                model=model,
                provider="meta",
                ms=round(dt * 1000),
                usage=usage,
                meta=meta("connect", s, u, usage, model, dt * 1000, 0.6, 700),
            )
        return fail(error="no_options_generated")
    except Exception as e:
        return err(e)
