from app.services.setup_service import deterministic_payload, fallback_questions


def test_deterministic_investor_payload():
    payload, base, diction = deterministic_payload("Investor pitch for enterprise SaaS security metrics")
    assert diction == "Technical"
    assert "R_RSE_02" in base and "R_AMB_01" in base
    assert payload["dimensions"]["tone"].startswith("Authoritative")
    assert payload["configuration_id"].startswith("cfg_")


def test_deterministic_academic_payload():
    payload, base, diction = deterministic_payload("academic thesis paper")
    assert diction == "Academic"
    assert base == ["R_AMB_01"]


def test_fallback_questions_shape():
    qs = fallback_questions("my essay", "")
    assert len(qs) == 6 and all(q["maps_to"] for q in qs)
