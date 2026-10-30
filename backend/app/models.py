from __future__ import annotations
from pydantic import BaseModel, Field

S = lambda n: Field(default="", max_length=n)  # noqa: E731

class CompleteIn(BaseModel):
    context: str = S(4000); level: str = Field(default="General", max_length=40)
    assist_level: str = Field(default="Phrase", max_length=20)
    before: str = S(8000); after: str = S(4000); version: int = 0
    facts: list[str] = Field(default_factory=list, max_length=5)
    last_two: str = S(2000)
    avoid: list[str] = Field(default_factory=list, max_length=3)

class TextIn(BaseModel):
    context: str = S(4000); level: str = Field(default="General", max_length=40); text: str = S(20000)
    before: str = S(4000); after: str = S(4000)
    persona: str = Field(default="Skeptical reader", max_length=60)

class SynonymIn(BaseModel):
    context: str = S(4000); level: str = Field(default="General", max_length=40)
    word: str = S(80); sentence: str = S(2000)

class ConnectIn(BaseModel):
    context: str = S(4000)
    before: str = S(6000)
    after: str = S(6000)
    relation_hint: str = Field(default="auto", max_length=50)

class GrammarIn(BaseModel):
    text: str = S(20000)

class WaitlistIn(BaseModel):
    email: str = Field(min_length=3, max_length=320); note: str = S(500); company: str = S(200)

class ClaimIn(BaseModel):
    quote: str = S(2000); context: str = S(4000)

class LintRuleIn(BaseModel):
    id: str = S(80); category: str = Field(default="violet", max_length=30); rule: str = S(1000)

class LintIn(BaseModel):
    context: str = S(4000); text: str = S(20000)
    active_rules: list[LintRuleIn] = Field(default_factory=list, max_length=40)

class ResearchIn(BaseModel):
    url: str = S(2000); question: str = Field(default="Extract the key facts relevant to my writing, with sources.", max_length=1000)

class OutlineGenIn(BaseModel):
    answers: dict = Field(default_factory=dict)

class DatasetIn(BaseModel):
    pairs: list[dict] = Field(default_factory=list, max_length=200)

class SetupQuestionsIn(BaseModel):
    goal: str = S(2000); context: str = S(4000)

class SetupAgentIn(BaseModel):
    raw_goal: str = S(4000); transcript: str = S(4000); answers: dict = Field(default_factory=dict)

class CustomRuleOut(BaseModel):
    id: str = S(80); category: str = Field(default="violet", max_length=30); rule: str = S(1000)

class GhostFiltersOut(BaseModel):
    starter_categories: list[str] = Field(default_factory=list, max_length=10)
    allowed_transitions: list[str] = Field(default_factory=list, max_length=10)

class CiteIn(BaseModel):
    source_title: str = S(500); url: str = S(2000); locator: str = S(200)
    style: str = Field(default="apa", max_length=20); author: str = S(200); year: str = S(20)
    template: str = S(40); claim: str = S(1000); excerpt: str = S(1000); stat: str = S(200); term: str = S(200)

class BiblioIn(BaseModel):
    style: str = Field(default="apa", max_length=20); items: list[CiteIn] = Field(default_factory=list, max_length=50)
