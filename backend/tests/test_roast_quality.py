"""The roast copy itself.

The engine used to hold three fixed verdicts per intensity, so every roast read
the same and none of it referred to the resume in front of it.
"""
import re

from app.local_roaster import LocalRoaster
from app.models import RoastIntensity
from conftest import WEAK_RESUME, STRONG_RESUME, parse

MARKETER_RESUME = """SAM PATEL
Marketing Manager | sam@patel.com | linkedin.com/in/sampatel

SUMMARY
Marketing manager focused on lifecycle campaigns.

EXPERIENCE
Marketing Manager - BrightCo (2020 - 2024)
- Grew email list from 12,000 to 74,000 subscribers in 18 months.
- Launched referral programme that drove $310,000 in tracked revenue.

SKILLS
HubSpot, SQL, Figma, Google Analytics

EDUCATION
BA Communications - Leeds (2016 - 2019)"""


def verdicts(text, intensity=RoastIntensity.MEDIUM, runs=30):
    parsed = parse(text)
    return {LocalRoaster.generate(parsed, "r.txt", intensity).overall_verdict for _ in range(runs)}


def test_one_resume_produces_varied_verdicts():
    assert len(verdicts(WEAK_RESUME)) >= 3


def test_headlines_vary_too():
    parsed = parse(WEAK_RESUME)
    heads = {LocalRoaster.generate(parsed, "r.txt", RoastIntensity.MEDIUM).headline_roast
             for _ in range(30)}
    assert len(heads) >= 3


def test_two_different_resumes_share_no_verdict():
    assert not (verdicts(WEAK_RESUME, runs=20) & verdicts(MARKETER_RESUME, runs=20))


def test_a_roast_never_repeats_itself():
    for text in (WEAK_RESUME, STRONG_RESUME, MARKETER_RESUME):
        parsed = parse(text)
        for intensity in RoastIntensity:
            for _ in range(8):
                r = LocalRoaster.generate(parsed, "r.txt", intensity)
                body = " ".join(r.savage_paragraphs)
                assert r.overall_verdict.strip(".") not in body
                assert r.savage_paragraphs[0] != r.savage_paragraphs[1]


def test_a_strong_resume_is_never_called_a_disaster():
    """Telling someone scoring 89 that their file needs a hazard label destroys
    trust in the rest of the report."""
    harsh = re.compile(r"hazard label|proved nothing|start again from the bullets", re.I)
    parsed = parse(STRONG_RESUME)
    for intensity in RoastIntensity:
        for _ in range(12):
            r = LocalRoaster.generate(parsed, "r.txt", intensity)
            if r.ats_analysis.total_score >= 75:
                assert not harsh.search(" ".join(r.savage_paragraphs)), r.savage_paragraphs


def test_a_weak_resume_is_never_called_finished():
    praise = re.compile(r"already working|done the hard part|do the basics properly", re.I)
    parsed = parse(WEAK_RESUME)
    for _ in range(12):
        r = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.MEDIUM)
        assert not praise.search(" ".join(r.savage_paragraphs))


def test_nothing_is_invented():
    parsed = parse(MARKETER_RESUME)
    r = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.NUCLEAR)
    everything = " ".join([r.overall_verdict, *r.savage_paragraphs,
                           *r.ats_analysis.red_flags, *r.ats_analysis.green_flags])
    for invented in ("CloudScale", "InnovateX", "Alex R.", "TechCorp"):
        assert invented not in everything


def test_a_quantified_resume_is_not_accused_of_having_no_numbers():
    parsed = parse(MARKETER_RESUME)
    r = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.NUCLEAR)
    text = " ".join([r.overall_verdict, *r.savage_paragraphs, *r.ats_analysis.red_flags])
    assert "not one number" not in text
    assert "zero numbers" not in text


def test_green_flags_quote_something_real():
    parsed = parse(MARKETER_RESUME)
    flags = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.MILD).ats_analysis.green_flags
    joined = " ".join(flags)
    assert any(token in joined for token in ("74,000", "310,000", "HubSpot", "SQL")), flags


def test_a_weak_resume_trips_the_specific_findings():
    codes = {f.code for f in LocalRoaster._findings(parse(WEAK_RESUME))}
    for expected in ("no_metrics", "weak_openers", "objective",
                     "references_line", "gpa_listed", "etc_used", "no_links"):
        assert expected in codes, sorted(codes)


def test_a_strong_resume_trips_far_fewer():
    assert len(LocalRoaster._findings(parse(STRONG_RESUME))) < \
           len(LocalRoaster._findings(parse(WEAK_RESUME)))


def test_copy_hygiene():
    """Doubled spaces and stray punctuation are what template seams look like."""
    for text in (WEAK_RESUME, STRONG_RESUME, MARKETER_RESUME):
        parsed = parse(text)
        for intensity in RoastIntensity:
            for _ in range(5):
                r = LocalRoaster.generate(parsed, "r.txt", intensity)
                for line in [r.overall_verdict, *r.savage_paragraphs]:
                    assert "  " not in line, line
                    assert line == line.strip()
                    assert "''" not in line
                    assert ".." not in line.replace("...", "")


def test_nuclear_scores_no_higher_than_mild():
    parsed = parse(WEAK_RESUME)
    mild = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.MILD).ats_analysis.total_score
    nuclear = LocalRoaster.generate(parsed, "r.txt", RoastIntensity.NUCLEAR).ats_analysis.total_score
    assert nuclear <= mild


def test_every_roast_is_labelled_rule_based():
    """The UI shows this to make clear no AI wrote the roast."""
    r = LocalRoaster.generate(parse(WEAK_RESUME), "r.txt", RoastIntensity.MILD)
    assert r.engine == "heuristic"


def test_the_share_card_burn_line_is_unquoted():
    """Each surface adds its own quotation marks; storing them too doubled them up."""
    r = LocalRoaster.generate(parse(WEAK_RESUME), "r.txt", RoastIntensity.MEDIUM)
    assert not r.shareable_card.burn_line.startswith('"')
    assert r.shareable_card.burn_line == r.overall_verdict
