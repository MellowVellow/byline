/** Stored benchmark snapshot (results/bench_muse.json + bench_modes.json, aggregated). Rerun bench scripts to refresh. */
export const BENCH_MODELS: { model: string; provider: string; rows: { case: string; ms: number; inp: number; out: number; reasoning: number; ok: string }[] }[] = [
  { model: 'muse-spark-1.3', provider: 'meta', rows: [
    { case: 'complete_phrase_anxiety', ms: 1617, inp: 96, out: 133, reasoning: 105, ok: '1/1' },
    { case: 'complete_phrase_cooking', ms: 1982, inp: 102, out: 298, reasoning: 266, ok: '1/1' },
    { case: 'annotate_quote', ms: 1983, inp: 176, out: 499, reasoning: 386, ok: '1/1' },
    { case: 'main_idea', ms: 1213, inp: 78, out: 108, reasoning: 90, ok: '1/1' },
    { case: 'reactions', ms: 2933, inp: 145, out: 490, reasoning: 303, ok: '1/1' } ] },
  { model: 'muse-wonder-1.0', provider: 'meta', rows: [
    { case: 'complete_phrase_anxiety', ms: 2333, inp: 96, out: 159, reasoning: 128, ok: '1/1' },
    { case: 'complete_phrase_cooking', ms: 2515, inp: 102, out: 192, reasoning: 161, ok: '1/1' },
    { case: 'annotate_quote', ms: 3563, inp: 176, out: 352, reasoning: 224, ok: '1/1' },
    { case: 'main_idea', ms: 1978, inp: 78, out: 111, reasoning: 83, ok: '1/1' },
    { case: 'reactions', ms: 3111, inp: 145, out: 347, reasoning: 137, ok: '1/1' } ] },
  { model: 'muse-spark-1.2', provider: 'meta', rows: [
    { case: 'complete_phrase_anxiety', ms: 2277, inp: 96, out: 265, reasoning: 234, ok: '1/1' },
    { case: 'complete_phrase_cooking', ms: 2473, inp: 102, out: 345, reasoning: 310, ok: '1/1' },
    { case: 'annotate_quote', ms: 2872, inp: 176, out: 570, reasoning: 433, ok: '1/1' },
    { case: 'main_idea', ms: 3402, inp: 78, out: 122, reasoning: 86, ok: '1/1' },
    { case: 'reactions', ms: 5053, inp: 145, out: 622, reasoning: 410, ok: '1/1' } ] },
  { model: 'muse-spark-1.1', provider: 'meta', rows: [
    { case: 'complete_phrase_anxiety', ms: 3651, inp: 96, out: 474, reasoning: 443, ok: '1/1' },
    { case: 'complete_phrase_cooking', ms: 3126, inp: 102, out: 440, reasoning: 410, ok: '1/1' },
    { case: 'annotate_quote', ms: 2523, inp: 176, out: 633, reasoning: 487, ok: '1/1' },
    { case: 'main_idea', ms: 1706, inp: 78, out: 256, reasoning: 224, ok: '1/1' },
    { case: 'reactions', ms: 4168, inp: 145, out: 888, reasoning: 712, ok: '1/1' } ] },
  { model: 'google/gemini-2.5-flash-lite', provider: 'openrouter', rows: [
    { case: 'complete_phrase_anxiety', ms: 1441, inp: 86, out: 24, reasoning: 0, ok: '1/1' },
    { case: 'complete_phrase_cooking', ms: 834, inp: 92, out: 17, reasoning: 0, ok: '1/1' },
    { case: 'annotate_quote', ms: 1050, inp: 165, out: 86, reasoning: 0, ok: '1/1' },
    { case: 'main_idea', ms: 891, inp: 69, out: 18, reasoning: 0, ok: '1/1' },
    { case: 'reactions', ms: 1769, inp: 132, out: 210, reasoning: 0, ok: '1/1' } ] },
]
export const BENCH_PROMPTS: Record<string, string> = {
  complete_phrase_anxiety: 'CONTEXT: essay about anxiety and health · LEVEL: General · ASSIST: Phrase · TEXT BEFORE: "Over the past decade, researchers have argued that access to care is shaped less by medicine than by" → 3 continuations, one per line.',
  complete_phrase_cooking: 'CONTEXT: cooking blog about weeknight dinners · same prefix · continuations must fit cooking context.',
  annotate_quote: 'CONTEXT: argue cats are better than dogs · LEVEL: General · TEXT: cats/dogs sample · Flag vocabulary + relevance, verbatim quote+context JSON.',
  main_idea: 'TEXT: cats/dogs sample · One plain sentence: single main idea taken from text.',
  reactions: 'Skeptical reader · cats/dogs sample · Up to 3 reactions (question|comment|critique), verbatim quote+context JSON.',
}
export const BENCH_PARAMS = 'Meta: reasoning_effort=minimal, temperature=0.7, max_tokens 400–900 · OpenRouter: temperature=0.7, max_tokens≤400'
export const BENCH_MODES: { text: string; mode: string; calls: number; inp: number; out: number; reasoning: number; ms: number }[] = [
  { text: 'short(~35w)', mode: 'drafting', calls: 1, inp: 176, out: 260, reasoning: 231, ms: 5084 },
  { text: 'short(~35w)', mode: 'editing', calls: 4, inp: 672, out: 1569, reasoning: 1200, ms: 8235 },
  { text: 'short(~35w)', mode: 'linting', calls: 1, inp: 845, out: 904, reasoning: 732, ms: 3652 },
  { text: 'short(~35w)', mode: 'editing+lint', calls: 5, inp: 1517, out: 2582, reasoning: 1958, ms: 11525 },
  { text: 'medium(~190w)', mode: 'drafting', calls: 1, inp: 360, out: 352, reasoning: 319, ms: 2480 },
  { text: 'medium(~190w)', mode: 'editing', calls: 4, inp: 746, out: 1040, reasoning: 722, ms: 8690 },
  { text: 'medium(~190w)', mode: 'linting', calls: 1, inp: 1029, out: 1550, reasoning: 689, ms: 4387 },
  { text: 'medium(~190w)', mode: 'editing+lint', calls: 5, inp: 2014, out: 3098, reasoning: 1687, ms: 13310 },
]
