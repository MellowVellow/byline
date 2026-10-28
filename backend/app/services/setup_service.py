"""Setup-agent deterministic logic: fallback questions + keyword payload (LLM refinement stays in router)."""
import hashlib as _hl

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


def deterministic_payload(raw: str):
    """Return (payload, base_rule_ids, diction). Pure/deterministic."""
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
    return payload, base, diction
