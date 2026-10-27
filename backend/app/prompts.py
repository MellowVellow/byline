"""Quote-based prompts. NO ID tagging / offsets / word counting by model.

Contract: model returns exact verbatim `quote` + verbatim `context` snippet
containing quote. Client locates quote inside context inside doc (string search).
"""
from __future__ import annotations

LEVELS = {
    "Formal": "formal, uncontracted, precise (e.g. 'are not angry', never 'aren't mad')",
    "Casual": "relaxed, contractions natural (e.g. 'aren't mad')",
    "Bullshitting": "confident-sounding, buzzword-heavy, vague but fluent, low substance",
    "Slang": "very casual, colloquial, short and punchy (e.g. 'ain't ticked')",
    "Simple": "plain common words, no jargon",
    "General": "neutral standard written English",
    "Technical": "precise domain terms for practitioners",
    "Academic": "formal scholarly register, hedged claims",
    "Expert": "dense specialist vocabulary",
    "Buzzwords": "industry buzzwords where natural",
    "Poetic": "exaggerated, vague, sometimes meta, lyrical imagery",
    "GenZ": "gen-z, emotionally expressive, internet-native, still readable",
}
ASSIST = {
    "Hint": "short idea cues of 1-3 words only (e.g. 'cost of care'), never a clause",
    "Phrase": "finish current clause in at most 8 words, a fragment",
    "Sentence": "one complete sentence of at most 25 words",
    "Question": "one question to prompt writer (e.g. 'What does a dog cost?')",
}
QUOTE_RULE = ("Anchor every item with \"quote\": an EXACT verbatim substring copied character-for-character "
              "from TEXT, and \"context\": a short verbatim snippet from TEXT that contains quote exactly. "
              "Never invent, paraphrase, fix spelling inside quote/context, use IDs, or give offsets.")

def _lvl(level: str) -> str: return f"LEVEL: {level} - {LEVELS.get(level, LEVELS['General'])}"

def _style(style: str) -> str: return f"\nSTYLE (diction/tone/voice/rhythm/audience rules):\n{style}" if style else ""

def complete_prompt(context, level, before, after, assist, voice="", style=""):
    system = ("Help writer continue their own writing, in their own voice. Follow ASSIST exactly. "
              "Never repeat existing text. Return exactly 3 distinct options, one per line, no numbering, no quotes.")
    voice_line = f"VOICE: {voice}" if voice else _lvl(level)
    user = (f"CONTEXT (what finished text should be about): {context or '(infer from text)'}\n{_lvl(level)}\n{voice_line}{_style(style)}\n"
            f"ASSIST: {assist} - {ASSIST.get(assist, ASSIST['Phrase'])}\n"
            f"TEXT BEFORE CURSOR:\n{before or '(empty)'}\nTEXT AFTER CURSOR:\n{after or '(empty)'}\n"
            "TASK: 3 continuations from cursor fitting context+level. One per line.")
    return system, user

def annotate_prompt(context, level, text, before="", after="", style=""):
    system = f"Careful editor. JSON only. {QUOTE_RULE} Grammar/spelling handled elsewhere - never flag those."
    user = (f"CONTEXT: {context or '(none)'}\n{_lvl(level)}\nPREV (context only): {before or '(none)'}\nNEXT (context only): {after or '(none)'}\n"
            f"TEXT:\n{text}{_style(style)}\nTASK: Flag vocabulary (single word/phrase wrong for level), relevance/cohesion (off-topic vs context, abrupt jump), tone that violates STYLE banned tags or misses allowed tags, and jargon/acronyms undefined for target audience. Max 6. "
            'JSON: {"issues":[{"quote":"...","context":"...","type":"vocabulary|relevance","reason":"...","replacement":"..."}]} Replacement = full replacement for quote only, swapped into sentence it MUST stay grammatical: same part of speech as quote (noun->noun, verb->verb), respect preceding a/an/the. Never replace a noun with many/much/few.')
    return system, user

def reactions_prompt(context, level, text, persona="Skeptical reader", style=""):
    system = f"Reader persona: {persona}. JSON only. {QUOTE_RULE}"
    user = (f"CONTEXT (author intent): {context or '(none)'}\n{_lvl(level)}\nTEXT:\n{text}\n"
            "TASK: Up to 4 reactions: questions, comments, compliments, critiques. Flag repetition ('already mentioned'), contradictions, unclear jumps. "
            'JSON: {"reactions":[{"quote":"...","context":"...","kind":"question|comment|compliment|critique","text":"..."}]}')
    return system, user

def main_idea_prompt(context, level, text, style=""):
    system = "Ordinary reader, no background. One plain sentence: single main idea you take away. Honest if unclear. No JSON."
    user = f"CONTEXT: {context or '(none)'}\n{_lvl(level)}{_style(style)}\nTEXT:\n{text}\nTASK: One sentence only."
    return system, user

def outline_prompt(text):
    system = f"JSON only. {QUOTE_RULE}"
    user = (f"TEXT:\n{text}\nTASK: Label sections in order. Anchor each with first exact quote of section. "
            'JSON: {"outline":[{"quote":"...","context":"...","label":"..."}]}')
    return system, user

def synonyms_prompt(context, level, word, sentence, style=""):
    system = "Thesaurus. JSON only. Single-word synonyms fitting exact sentence meaning, simpler to advanced. No phrases, no original word."
    user = (f"CONTEXT: {context or '(none)'}\n{_lvl(level)}{_style(style)}\nSENTENCE: {sentence}\nWORD: {word}\n"
            'TASK: Up to 8. JSON: {"synonyms":["..."]}')
    return system, user

def claims_prompt(text):
    system = f"JSON only. {QUOTE_RULE}"
    user = (f"TEXT:\n{text}\nTASK: Pick 1-2 sentences per paragraph making checkable factual claims. "
            'JSON: {"claims":[{"quote":"...","context":"...","query":"<web search query>"}]}')
    return system, user

def relevance_prompt(claim, results):
    system = "Label web results vs claim. JSON only."
    user = (f"CLAIM: {claim}\nRESULTS:\n{results}\nTASK: Per result label supports|contradicts|defines|prerequisite|irrelevant + one-line why + exact important excerpt copied from result snippet. "
            'JSON: {"readings":[{"title":"...","url":"...","label":"supports","why":"...","excerpt":"..."}]}')
    return system, user


def lint_prompt(context, style, text, rules_json):
    system = ("Strict linter. JSON only. Evaluate TEXT strictly against ACTIVE RULES only - never flag anything not covered by a rule. "
              + QUOTE_RULE.replace('"quote"', '"target"').replace('quote', 'target'))
    user = (f"CONTEXT (North Star): {context or '(none)'}{_style(style)}\nACTIVE_RULES (JSON):\n{rules_json}\nTEXT:\n{text}\n"
            "TASK: For each violation return target (exact verbatim), context (verbatim snippet containing target), rule_id (must match an active rule id), "
            "color_category (copy that rule's color), message (one line, name the rule), suggestion (replacement text for target only, grammatical in place). Max 12. "
            'JSON: {"lint_results":[{"rule_id":"...","color_category":"amber|green|cyan|rose|violet","target":"...","context":"...","message":"...","suggestion":"..."}]}')
    return system, user
