from __future__ import annotations
from pydantic import BaseModel, Field

class CompleteIn(BaseModel):
    context: str = ""; level: str = "General"; voice: str = ""; assist_level: str = "Phrase"
    before: str = ""; after: str = ""; version: int = 0; style: str = ""

class TextIn(BaseModel):
    context: str = ""; level: str = "General"; text: str = ""; before: str = ""; after: str = ""
    persona: str = "Skeptical reader"; style: str = ""

class SynonymIn(BaseModel):
    context: str = ""; level: str = "General"; word: str = ""; sentence: str = ""; style: str = ""

class GrammarIn(BaseModel):
    text: str = ""

class WaitlistIn(BaseModel):
    email: str = Field(min_length=3, max_length=320); note: str = ""

class ClaimIn(BaseModel):
    quote: str = ""; context: str = ""


class LintRuleIn(BaseModel):
    id: str = ""; category: str = "violet"; rule: str = ""

class LintIn(BaseModel):
    context: str = ""; style: str = ""; text: str = ""
    active_rules: list[LintRuleIn] = []
