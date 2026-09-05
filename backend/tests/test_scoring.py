"""The ATS rubric and the bullet rewriter.

The Live Tuner and the report card must agree: if they use different formulas,
the tuner reports improvement that did not happen.
"""
from conftest import WEAK_RESUME, STRONG_RESUME, SHORT_RESUME


def score(client, text):
    res = client.post("/api/score", json={"text": text})
    assert res.status_code == 200, res.text
    return res.json()


def test_the_tuner_and_the_report_card_agree(client, guest):
    card = client.post("/api/roast", data={"resume_text": WEAK_RESUME, "intensity": "medium"},
                       headers=guest).json()["ats_analysis"]
    live = score(client, WEAK_RESUME)
    assert live["total_score"] == card["total_score"]
    for part in ("formatting_score", "keyword_score", "impact_score", "brevity_score"):
        assert live[part] == card[part], part


def test_scoring_saves_nothing(client, guest):
    """The tuner re-scores on every keystroke-ish action; it must not fill history."""
    before = len(client.get("/api/history", headers=guest).json())
    score(client, WEAK_RESUME)
    score(client, STRONG_RESUME)
    assert len(client.get("/api/history", headers=guest).json()) == before


def test_a_stronger_resume_scores_higher(client):
    assert score(client, STRONG_RESUME)["total_score"] > score(client, WEAK_RESUME)["total_score"]


def test_sub_scores_stay_within_their_band(client):
    s = score(client, WEAK_RESUME)
    for part in ("formatting_score", "keyword_score", "impact_score", "brevity_score"):
        assert 0 <= s[part] <= 25, (part, s[part])
    assert 0 <= s["total_score"] <= 100


def test_text_too_short_to_judge_is_refused(client):
    assert client.post("/api/score", json={"text": "hi"}).status_code == 400
    assert client.post("/api/score", json={"text": "   "}).status_code == 400


# ----------------------------------------------------------------- the rewriter
def test_applying_the_rewrite_raises_the_score(client):
    """The whole point of the tuner. While the impact sub-score had a floor and
    the rewriter's verbs were missing from the parser's list, acting on the
    app's own advice moved nothing."""
    before = score(client, WEAK_RESUME)
    after = score(client, before["improved_text"])
    assert after["total_score"] > before["total_score"]
    assert after["weak_bullet_count"] < before["weak_bullet_count"]


def test_filling_in_real_numbers_raises_it_further(client):
    rewritten = score(client, WEAK_RESUME)["improved_text"]
    filled = (rewritten
              .replace("[N users/customers]", "40 engineers")
              .replace("[X%]", "30%")
              .replace("[metric] from [A] to [B]", "coverage from 54% to 92%"))
    assert score(client, filled)["total_score"] > score(client, rewritten)["total_score"]


def test_the_rewrite_is_idempotent(client):
    """Re-running must not stack a second placeholder onto every bullet."""
    once = score(client, WEAK_RESUME)["improved_text"]
    twice = score(client, once)["improved_text"]
    assert twice.strip() == once.strip()


def test_the_rewrite_invents_nothing(client):
    improved = score(client, WEAK_RESUME)["improved_text"]
    assert "JOHNATHAN DOE" in improved, "the candidate's own header was lost"
    for invented in ("CloudScale", "InnovateX", "Alex R.", "TechCorp Solutions Inc"):
        assert invented not in improved


def test_weak_openers_are_replaced(client):
    improved = score(client, WEAK_RESUME)["improved_text"]
    assert "Responsible for" not in improved
    assert "Wrote code" in improved


def test_already_strong_bullets_are_left_alone(client):
    text = ("EXPERIENCE\nRole - Co\n"
            "- Reduced latency by 40% for 5k users.\n"
            "- Built the API gateway in Go for 12 teams.")
    improved = score(client, text)["improved_text"]
    assert "Reduced latency by 40% for 5k users" in improved


def test_tips_are_returned_and_specific(client):
    tips = score(client, WEAK_RESUME)["tips"]
    assert tips
    assert any("number" in t.lower() for t in tips)


def test_counts_describe_the_submitted_text(client):
    s = score(client, SHORT_RESUME)
    assert s["bullet_count"] >= 1
    assert s["metric_bullet_count"] >= 1  # "reduced costs 20%"
