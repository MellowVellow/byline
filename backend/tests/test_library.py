import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.citations import (
    format_apa_inline, format_apa_reference, passage_found, normalize_text,
)
from app.routers.library import _coerce_cards


def _src(**kw):
    base = {
        "type": "article-journal", "title": "Water Use",
        "author": [{"family": "Alvarez", "given": "Rosa"}],
        "issued": {"date-parts": [[2025]]},
        "container-title": "J Sustain", "DOI": "", "URL": "",
        "accessed": {"date-parts": [[2026, 11, 4]]},
        "provenance": {"author": "verified", "issued": "verified"},
    }
    base.update(kw)
    return base


def test_apa_inline_types():
    s = _src()
    assert format_apa_inline(s, "narr") == "Alvarez (2025)"
    assert format_apa_inline(s, "paren", 14) == "(Alvarez, 2025, p. 14)"
    assert format_apa_inline(s, "direct", 14) == "(Alvarez, 2025, p. 14)"
    assert format_apa_inline(s, "para") == "(Alvarez, 2025)"


def test_apa_reference_journal_web_report():
    assert "Alvarez, R. (2025)." in format_apa_reference(_src())
    web = _src(type="webpage", title="Cooling", URL="https://example.com/x",
               **{"container-title": "Ex News"})
    r = format_apa_reference(web)
    assert "Retrieved" in r and "https://example.com/x" in r
    rep = _src(type="report", title="AI Water", URL="https://example.com/r.pdf")
    assert "[Report]" in format_apa_reference(rep)


def _unknown_src(**kw):
    kw.setdefault("author", [{"literal": "Unknown"}])
    kw.setdefault("title", "Exploring the impact of AI threats on originality")
    return _src(**kw)


def test_apa_unknown_author_uses_title_words():
    from app.citations import is_unknown_author, title_short
    s = _unknown_src()
    assert is_unknown_author(s["author"]) is True
    assert title_short(s["title"]) == "Exploring the impact of"
    assert format_apa_inline(s, "paren", 3) == '("Exploring the impact of", 2025, p. 3)'
    assert format_apa_inline(s, "narr") == '"Exploring the impact of" (2025)'
    ref = format_apa_reference(s)
    assert ref.startswith("Exploring the impact of AI threats on originality. (2025).")
    assert "Unknown" not in ref and "Anon" not in ref


def test_apa_unknown_author_and_date_uses_nd():
    s = _unknown_src(author=[], issued={"date-parts": [[]]},
                     title="Cooling towers at scale", type="webpage",
                     URL="https://example.com/c")
    assert format_apa_inline(s, "paren") == '("Cooling towers at scale", n.d.)'
    ref = format_apa_reference(s)
    assert "Cooling towers at scale. (n.d.)." in ref
    assert "Unknown" not in ref


def test_apa_explicit_anonymous_stays_author():
    from app.citations import is_unknown_author
    s = _src(author=[{"literal": "Anonymous"}])
    assert is_unknown_author(s["author"]) is False
    assert format_apa_inline(s, "narr") == "Anonymous (2025)"
    assert "Anonymous (2025)." in format_apa_reference(s)


def test_parse_empty_llm_cards_falls_back():
    from unittest.mock import AsyncMock, patch
    from fastapi.testclient import TestClient
    from app.main import app
    cl = TestClient(app)
    text = ("First substantial sentence about water usage effectiveness in computing facilities here. "
            "Second substantial sentence about cooling towers consuming millions of liters daily here. "
            "Third substantial sentence about measurement standards for power usage effectiveness here.")
    with patch("app.routers.library.llm.json_call",
               AsyncMock(return_value=({"cards": [], "source": {
                   "title": "Empty Out", "author": [{"family": "Doe", "given": "Jane"}],
                   "issued": {"date-parts": [[2024]]}}}, {}, "mock:m"))):
        r = cl.post("/api/library/parse", json={
            "text": text, "url": "", "filename": "empty-cards-probe.pdf", "kind": "pdf"})
    d = r.json()
    assert d.get("ok") is True, d
    assert len(d.get("cards", [])) > 0
    assert d.get("model") == "fallback:empty-cards"


def test_passage_quotecheck():
    assert passage_found("Hello,  world!", "hello world")
    assert passage_found("mid-size data center uses water", "A MID-SIZE data center uses water daily.")
    assert not passage_found("invented quote xyz", "totally different text here")


def test_coerce_cards_kinds():
    data = {"cards": [
        {"type": "stat", "finding": "Uses 1.5M liters", "passage": "Uses 1.5M liters daily", "why_useful": "x"},
        {"type": "idea", "finding": "Compare WUE", "passage": "", "why_useful": "y"},
        {"type": "claim", "finding": "Cooling main", "passage": "Cooling is main", "why_useful": "z"},
    ], "source": {"title": "T", "author": [{"family": "A", "given": "B"}]}}
    cards, source = _coerce_cards(data, "https://example.com", "")
    assert cards[0]["kind"] == "source" and cards[0]["type"] == "stat"
    assert cards[1]["kind"] == "ai"
    assert cards[2]["type"] == "fact"  # claim alias
    assert source["URL"] == "https://example.com"
    assert source["provenance"]["author"] in ("verified", "inferred")


def test_normalize_dehyphen():
    assert normalize_text("mid-\nsize DATA!") == "midsize data"


HEAD = ("Edelweiss Applied Science and Technology\nISSN: 2576-8484\n"
        "Vol. 8, No. 6, 8805-8814, 2024\nDOI: 10.55214/25768484.v8i6.3878\n"
        "© 2024 by the authors; licensee Learning Gate\n")


def test_clean_pdf_strips_running_heads():
    from app.routers.library import clean_pdf_text
    bodies = [
        "Exploring the impact of AI threats\n\nAbstract: AI can threaten critical thinking.\n",
        "Using a qualitative design, seven students were sampled for interviews.\n",
        "Results show dependency reduces reflection and inhibits creativity.\n",
    ]
    pages = [HEAD + b + "\n880%d" % (5 + i) for i, b in enumerate(bodies)]
    out = clean_pdf_text(pages)
    assert "Edelweiss" not in out and "ISSN" not in out
    assert "8805" not in out
    assert "AI can threaten critical thinking" in out
    assert "Exploring the impact of AI threats" in out


def test_clean_pdf_cuts_references():
    from app.routers.library import clean_pdf_text
    pages = [("Intro body text about critical thinking and analysis methods used.\n"
              "References\n[1] Alam, A. (2022). Something. https://doi.org/10.1/x\n")]
    out = clean_pdf_text(pages)
    assert "Alam" not in out and "critical thinking" in out


def test_extract_pdf_meta():
    from app.routers.library import extract_pdf_meta
    m = extract_pdf_meta(HEAD + "body")
    assert m["doi"] == "10.55214/25768484.v8i6.3878"
    assert m["year"] == "2024"


def test_coerce_authors_alias_and_et_al():
    from app.routers.library import _coerce_cards
    cards, src = _coerce_cards(
        {"cards": [], "source": {"title": "T", "authors": "Octaberlina et al.", "issued": {"date-parts": [[2024]]}}},
        "", "test.pdf")
    assert src["author"] == [{"literal": "Octaberlina et al."}]
    assert src["issued"] == {"date-parts": [[2024]]}
    cards2, src2 = _coerce_cards(
        {"cards": [], "source": {"title": "T", "author": [{"name": "Jane Doe"}], "doi": "10.1/x"}},
        "https://example.com", "")
    assert src2["author"] == [{"literal": "Jane Doe"}]
    assert src2["DOI"] == "10.1/x"


def test_coerce_preserves_all_authors_and_inline_uses_et_al():
    from app.routers.library import _coerce_cards
    authors = [
        {"family": "Zhumagaliyeva", "given": "Guldana"},
        {"family": "Tleshova", "given": "Zhibek"},
        {"family": "Amanzhol", "given": "Moldir"},
        {"family": "Smagulova", "given": "Moldir"},
    ]
    _, src = _coerce_cards(
        {"cards": [], "source": {"title": "AI writing", "author": authors,
                                 "issued": {"date-parts": [[2025]]}}},
        "https://www.highedujournal.kz/index.php/1/article/view/419", "")
    assert src["author"] == authors
    assert format_apa_inline(src, "paren") == "(Zhumagaliyeva et al., 2025)"


def test_apa_inline_preserves_literal_et_al():
    s = _src(author=[{"literal": "Octaberlina et al."}])
    assert format_apa_inline(s, "paren") == "(Octaberlina et al., 2025)"
    assert format_apa_inline(s, "narr") == "Octaberlina et al. (2025)"




