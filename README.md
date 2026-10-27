# Byline v2 — Meta Hackathon

**Writing beyond just your thoughts.** AI suggests options, checks wording, reads like a stranger, checks sources — you choose every word.

Entirely new build (EXAMPLE/ kept as reference only). Quote-anchored AI: model returns exact verbatim `quote` + `context` snippet, TipTap client string-search locates offsets → color decorations. No ID tagging.

## Surfaces
- `/` landing + waitlist (Supabase `waitlist` table, local-file fallback) — run `supabase/waitlist.sql`
- `/demo` public demo, preloaded cats-vs-dogs, canned fallback if backend down
- `/app` full editor: ghost Tab completions (Muse Spark 1.3), LT grammar (red), vocab/cohesion (purple/yellow wavy), reader reactions + perceived main idea/intent gap (purple), Meta-grounded readings (blue), outline, synonyms, metrics (acceptance %, latency)

## Run
```bash
cp .env.example .env   # fill META_API_KEY etc, never commit .env
docker compose up -d languagetool   # custom image (languagetool/Dockerfile) on :8010, or set LANGUAGETOOL_URL
uv venv backend/.venv && uv pip install --python backend/.venv/bin/python -r backend/requirements.txt
backend/.venv/bin/uvicorn app.main:app --port 8000 --app-dir backend
npm --prefix frontend install && npm --prefix frontend run dev   # :5173, proxies /api -> :8000
```

## Deploy
- Frontend → Vercel: set backend URL in `vercel.json` rewrite (replace YOUR-BACKEND) or set `VITE_API_URL` env at build.
- Backend → Fly/Render/Railway: `uvicorn app.main:app`, env `META_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CORS_ORIGINS=https://your-vercel-domain`.
- LanguageTool → same host docker sidecar; public LT API URL also works via `LANGUAGETOOL_URL`.

## Dictionary exceptions (LanguageTool manual)
Grammar popup per misspelled word: **Ignore word** (= ignore.txt: never flag, no corrections) or **Add to dictionary** (= spelling.txt: never flag + used for corrections). Exceptions persist in browser and filter future checks instantly. **Export additions** in Language dock downloads `en_spelling_additions.txt`; merge it into `languagetool/en_spelling_additions.txt`, then `docker compose build languagetool && docker compose up -d languagetool` to bake words into the custom image for everyone.

## Benchmark
See `BENCHMARK.md`. Re-run: `python3 bench/bench_muse.py --samples 3`

## Tests
```bash
backend/.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend run build
```
