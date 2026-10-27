from __future__ import annotations
from pydantic import BaseModel, Field

class CompleteIn(BaseModel):
    context: str = ""; level: str = "General"; voice: str = ""; assist_level: str = "Phrase"
    before: str = ""; after: str = ""; version: int = 0

class TextIn(BaseModel):
    context: str = ""; level: str = "General"; text: str = ""; before: str = ""; after: str = ""
    persona: str = "Skeptical reader"

class SynonymIn(BaseModel):
    context: str = ""; level: str = "General"; word: str = ""; sentence: str = ""

class GrammarIn(BaseModel):
    text: str = ""

class WaitlistIn(BaseModel):
    email: str = Field(min_length=3, max_length=320); note: str = ""

class ClaimIn(BaseModel):
    quote: str = ""; context: str = ""
