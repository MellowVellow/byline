"""Backend lint rule catalog (id, name, short rule) for setup-agent LLM prompt.

Full catalog (descriptions/examples/UI) lives in frontend/src/lib/rules.ts.
IDs must match exactly — enforced by tests/test_lint_rules_parity.py.
"""

LINT_RULE_LIBRARY: list[tuple[str, str, str]] = [
    ("R_AMB_01", "BLUF", "Main takeaway first"),
    ("R_AMB_02", "Premise Contradiction", "No contradicting premises"),
    ("R_AMB_03", "Unsupported Causal Jump", "No therefore without entailment"),
    ("R_AMB_04", "Scope Alignment", "No absolute generalizations"),
    ("R_AMB_05", "False Dilemma", "No forced binary"),
    ("R_GRN_01", "Nominalization", "Active verbs over zombie nouns"),
    ("R_GRN_02", "Redundant Pairs", "No tautologies"),
    ("R_GRN_03", "Prepositional Stack", "Max 2 prepositional phrases"),
    ("R_GRN_04", "Passive Blame", "No actor-hiding passive"),
    ("R_GRN_05", "Vague Pronoun", "No ambiguous this/it"),
    ("R_CYN_01", "Opener Monotony", "Vary openers"),
    ("R_CYN_02", "Abrupt Shift", "Bridge topic shifts"),
    ("R_CYN_03", "Stress Position", "End on key terms"),
    ("R_CYN_04", "Parallelism", "Parallel list forms"),
    ("R_RSE_01", "Unanchored Jargon", "Define jargon first use"),
    ("R_RSE_02", "Unsubstantiated Claim", "Numbers+source for empirical claims"),
    ("R_RSE_03", "Abstract Without Instance", "Concrete example per abstraction"),
    ("R_RSE_04", "No-tradeoff Absolute", "State trade-offs"),
    ("R_VIO_01", "Hedging", "No weak qualifiers"),
    ("R_VIO_02", "Buzzword Saturation", "No generic buzzwords"),
    ("R_VIO_03", "Stacked Adverbs", "Strong word over very+weak"),
    ("R_VIO_04", "Forced Enthusiasm", "No exclamation/cheerleading"),
]

LINT_RULE_IDS = {r[0] for r in LINT_RULE_LIBRARY}
