"""
Roast material: the specific, checkable sins found in one resume.

Each Finding carries the evidence, an actionable fix, and three one-liners at
different heat levels. The roast is then assembled from whichever findings are
actually present, so two different resumes get two different roasts.

Rules for anything written here: mock the document, never the person. No
comments on background, age, nationality, or anything a person cannot rewrite.
Every quip must be traceable to something the parser genuinely detected.
"""
import re
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional


@dataclass
class Finding:
    code: str
    weight: int           # how damning; orders the flags and picks the headline
    flag: str             # shown under "red flags"
    tip: str              # shown in the live tuner
    mild: str             # verdict candidates by intensity
    medium: str
    nuclear: str
    headline: Optional[str] = None

    def quip(self, intensity_value: str) -> str:
        return {"mild": self.mild, "medium": self.medium, "nuclear": self.nuclear}[intensity_value]


# Phrases that read as filler to a recruiter, beyond the parser's buzzword list.
_FIRST_PERSON_RE = re.compile(r"(?:^|[.\s])(I|I'm|I've|my|My)\s", re.MULTILINE)
_REFERENCES_RE = re.compile(r"references\s+(?:are\s+)?available", re.IGNORECASE)
_OBJECTIVE_RE = re.compile(r"^\s*(?:career\s+)?objective\s*:?\s*$", re.IGNORECASE | re.MULTILINE)
_LINK_RE = re.compile(r"(github\.com|gitlab\.com|linkedin\.com|behance\.|dribbble\.|https?://)", re.IGNORECASE)
_GPA_RE = re.compile(r"\bGPA\s*:?\s*([0-4](?:\.\d+)?)\s*(?:/\s*([45](?:\.0)?))?", re.IGNORECASE)
_YEAR_RANGE_RE = re.compile(r"\b(19|20)\d{2}\b", re.IGNORECASE)
_TUTORIAL_RE = re.compile(r"\b(tutorial|clone|to-?do app|calculator app|following along|bootcamp project)\b", re.IGNORECASE)
_PASSIVE_RE = re.compile(r"\b(was|were|has been|have been|had been)\s+\w+ed\b", re.IGNORECASE)
_ETC_RE = re.compile(r"\betc\b\.?", re.IGNORECASE)

_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "our", "their",
    "was", "were", "have", "has", "had", "are", "were", "will", "would", "using", "used", "use",
    "team", "teams", "work", "working", "worked", "new", "all", "other", "more", "than", "over",
    "across", "within", "including", "such", "also", "based", "well", "role", "roles", "company",
}


def detect_findings(
    *,
    raw: str,
    summary: str,
    experience: str,
    skills_text: str,
    education: str,
    projects: str,
    bullets: List[str],
    weak_bullets: List[str],
    metric_bullets: List[str],
    buzzwords: List[str],
    strong_verbs: List[str],
    skills: List[str],
    soft_skills: List[str],
    tech_skills: List[str],
    total_words: int,
    weak_opener_of: Callable[[str], Optional[str]],
) -> List[Finding]:
    """Every sin this resume actually commits, worst first."""
    out: List[Finding] = []
    n_bullets = len(bullets)
    n_metrics = len(metric_bullets)
    quote = lambda s, n=70: f"'{s[:n].rstrip()}'"  # noqa: E731

    # ---------------------------------------------------------------- impact
    if n_bullets and n_metrics == 0:
        out.append(Finding(
            "no_metrics", 100,
            f"{n_bullets} bullet points and not one number. Recruiters cannot hire vibes.",
            "No numbers anywhere. Add at least one measurable result (%, $, users, time saved).",
            mild=f"{n_bullets} bullets, zero numbers. The reader has to take all of it on trust.",
            medium=f"{n_bullets} bullets and not a single number. You are asking to be believed, not hired.",
            nuclear=f"You wrote {total_words} words and proved nothing. That takes a strange kind of discipline.",
            headline="NUMBERS NOT FOUND",
        ))
    elif n_bullets and n_metrics * 3 < n_bullets:
        out.append(Finding(
            "few_metrics", 70,
            f"Only {n_metrics} of {n_bullets} bullets carry a measurable result.",
            f"Only {n_metrics} of {n_bullets} bullets carry a number. Aim for one in three.",
            mild=f"{n_metrics} of {n_bullets} bullets prove anything. The rest are taking up space.",
            medium=f"{n_bullets} bullets, {n_metrics} results. The math is not on your side.",
            nuclear=f"{n_metrics} numbers in {total_words} words. The rest is set dressing.",
            headline="MOSTLY UNPROVEN",
        ))

    if weak_bullets:
        opener = weak_opener_of(weak_bullets[0])
        worst = weak_bullets[0]
        out.append(Finding(
            "weak_openers", 90,
            f"{len(weak_bullets)} bullets open with filler like '{opener or worst.split()[0]}'.",
            f"{len(weak_bullets)} bullets still open with filler. Start each with a past-tense achievement verb.",
            mild=f"{quote(worst)} describes a duty, not a result.",
            medium=f"{quote(worst)} is not an achievement, it is attendance.",
            nuclear=f"{quote(worst)} belongs in a diary, not in front of a hiring manager.",
            headline="DUTIES, NOT RESULTS",
        ))

    # ---------------------------------------------------------------- language
    if buzzwords:
        top = buzzwords[0]
        density = round(len(buzzwords) / max(1, total_words / 100), 1)
        out.append(Finding(
            "buzzwords", 80,
            f"Buzzword bingo: {', '.join(buzzwords[:4])}.",
            f"Cut the clichés: {', '.join(buzzwords[:3])}.",
            mild=f"'{top}' is doing a lot of work here, and none of it is convincing.",
            medium=f"'{top}' again? The recruiter has read that phrase 400 times today.",
            nuclear=f"{len(buzzwords)} clichés at {density} per hundred words. This is not a resume, it is a bingo card.",
            headline="CLICHE SATURATION",
        ))

    if soft_skills:
        out.append(Finding(
            "soft_skills", 60,
            f"Listing {', '.join(soft_skills[:3])} as skills wastes space a real tool could use.",
            f"Drop assumed skills from the list: {', '.join(soft_skills[:3])}.",
            mild=f"'{soft_skills[0]}' is assumed, not impressive.",
            medium=f"{', '.join(soft_skills[:2])} are not skills, they are the minimum for staying employed.",
            nuclear=f"Listing '{soft_skills[0]}' as a skill is like listing 'breathes air' under certifications.",
            headline="SKILLS OR ADJECTIVES",
        ))

    if _FIRST_PERSON_RE.search(raw):
        out.append(Finding(
            "first_person", 45,
            "Written in the first person. Resumes drop 'I' and 'my' by convention.",
            "Remove first-person pronouns. Start lines with the verb instead.",
            mild="It slips into the first person, which reads more like a cover letter.",
            medium="'I' and 'my' belong in the cover letter, not here.",
            nuclear="Nobody wants your memoir. Delete every 'I' and start with the verb.",
            headline="WRONG VOICE",
        ))

    passives = _PASSIVE_RE.findall(raw)
    if len(passives) >= 2:
        out.append(Finding(
            "passive_voice", 50,
            f"{len(passives)} passive constructions. Passive voice hides who did the work.",
            "Rewrite passive lines in the active voice so it is clear you did it.",
            mild="Several lines are passive, which quietly hides your own contribution.",
            medium="The passive voice makes it sound like the work happened near you, not because of you.",
            nuclear="Everything here 'was done'. By whom? The document refuses to say.",
            headline="PASSIVE THROUGHOUT",
        ))

    if _ETC_RE.search(raw):
        out.append(Finding(
            "etc_used", 35,
            "'etc.' appears. It tells the reader you ran out of things worth naming.",
            "Replace 'etc.' with the actual items, or cut the line.",
            mild="'etc.' is doing the work three specifics should be doing.",
            medium="'etc.' is what you write when you have stopped trying.",
            nuclear="'etc.' is the written equivalent of a shrug.",
            headline="AND SO ON",
        ))

    if raw.count("!") >= 2:
        out.append(Finding(
            "exclamations", 30,
            f"{raw.count('!')} exclamation marks. Enthusiasm is not evidence.",
            "Remove the exclamation marks. Let the numbers carry the excitement.",
            mild="The exclamation marks are trying to supply energy the results should.",
            medium="Exclamation marks do not make a bullet more impressive, only louder.",
            nuclear="You cannot punctuate your way out of having no numbers.",
            headline="TOO MANY EXCLAMATIONS",
        ))

    # ---------------------------------------------------------------- structure
    if not summary:
        out.append(Finding(
            "no_summary", 55,
            "No summary or profile section, so the first six seconds are wasted.",
            "Add a two-line summary: title, years, and one headline result.",
            mild="There is no summary, so the reader has to assemble your pitch themselves.",
            medium="No summary. The most valuable six seconds on the page are spent on your address.",
            nuclear="No summary, no hook, no reason to read line two.",
            headline="NO OPENING",
        ))

    if _OBJECTIVE_RE.search(raw):
        out.append(Finding(
            "objective", 50,
            "An 'Objective' section. It describes what you want, not what you deliver.",
            "Replace the objective with a summary of what you have already delivered.",
            mild="The objective tells the reader what you want. They are reading to find out what you offer.",
            medium="An objective section states your wishes. The hiring manager has their own.",
            nuclear="'Objective: to obtain a position'. Congratulations, so is everyone else in the pile.",
            headline="OBJECTIVE, NOT OFFER",
        ))

    if _REFERENCES_RE.search(raw):
        out.append(Finding(
            "references_line", 40,
            "'References available upon request' is assumed and wastes a line.",
            "Delete the references line. It is assumed, and the space is worth more.",
            mild="The references line is assumed. That is a free line back.",
            medium="'References available upon request' has been assumed since roughly 1995.",
            nuclear="You spent a line telling us you know people. Everyone knows people.",
            headline="ASSUMED AND PRINTED",
        ))

    if experience and not _YEAR_RANGE_RE.search(experience):
        out.append(Finding(
            "no_dates", 65,
            "No dates in the experience section. Screeners filter on tenure.",
            "Add month and year ranges to every role.",
            mild="The experience section has no dates, which makes the timeline guesswork.",
            medium="No dates anywhere. A recruiter reads a missing timeline as a hidden one.",
            nuclear="No dates. Either you have something to hide or you forgot the single easiest field.",
            headline="TIMELINE MISSING",
        ))

    if experience and not bullets:
        out.append(Finding(
            "wall_of_text", 75,
            "Experience is written as prose. Nobody reads paragraphs on a resume.",
            "Break the experience section into bullets, one result each.",
            mild="Your experience is a paragraph. Bullets get read; paragraphs get skimmed.",
            medium="A wall of text where the bullets should be. It will be skimmed and forgotten.",
            nuclear="Paragraphs. On a resume. Read in six seconds. Do the arithmetic.",
            headline="WALL OF TEXT",
        ))

    long_bullets = [b for b in bullets if len(b.split()) > 30]
    if long_bullets:
        out.append(Finding(
            "long_bullets", 45,
            f"{len(long_bullets)} bullets run past 30 words. That is a paragraph wearing a dot.",
            f"Cut {len(long_bullets)} over-long bullets to roughly 20 words each.",
            mild=f"{len(long_bullets)} bullets are long enough to lose the reader mid-sentence.",
            medium=f"{len(long_bullets)} of your bullets are paragraphs with a dot in front.",
            nuclear=f"A {max(len(b.split()) for b in long_bullets)}-word bullet point is not a bullet, it is a hostage note.",
            headline="BULLETS TOO LONG",
        ))

    # Same opening word on several bullets reads as a template.
    openers = [b.split()[0].lower() for b in bullets if b.split()]
    if openers:
        top_opener, count = max(((o, openers.count(o)) for o in set(openers)), key=lambda t: t[1])
        if count >= 3 and len(bullets) >= 4:
            out.append(Finding(
                "repeated_opener", 40,
                f"{count} bullets start with the same word, '{top_opener}'.",
                f"Vary the opening verbs. {count} bullets currently start with '{top_opener}'.",
                mild=f"{count} bullets open with '{top_opener}'. Variety would keep the reader moving.",
                medium=f"'{top_opener}' opens {count} of your bullets. It reads like a template, because it is one.",
                nuclear=f"'{top_opener}' {count} times. You found one verb and refused to let go.",
                headline="ONE VERB, REPEATED",
            ))

    # ---------------------------------------------------------------- evidence
    unproven = [
        s for s in tech_skills
        if not re.search(r"(?<![a-z0-9])" + re.escape(s.lower()) + r"(?![a-z0-9])",
                         " ".join(bullets).lower())
    ]
    if len(tech_skills) >= 4 and len(unproven) >= 3:
        out.append(Finding(
            "skills_not_evidenced", 65,
            f"{len(unproven)} listed skills never appear in a single bullet: {', '.join(unproven[:3])}.",
            f"Prove or cut {len(unproven)} skills that appear nowhere in your experience.",
            mild=f"{len(unproven)} of your skills are claimed but never demonstrated.",
            medium=f"You list {', '.join(unproven[:2])} and then never mention them again. That is a claim, not a skill.",
            nuclear=f"{len(unproven)} skills listed and never proven. A keyword pile is not a career.",
            headline="CLAIMED, NOT SHOWN",
        ))

    if skills and not _LINK_RE.search(raw):
        out.append(Finding(
            "no_links", 45,
            "No GitHub, portfolio or LinkedIn link anywhere.",
            "Add a link to your work: GitHub, portfolio, or LinkedIn.",
            mild="There is no link to your actual work, so all of this stays unverifiable.",
            medium="No link to anything you built. The reader has only your word for it.",
            nuclear="Not one link. You claim you build things and provide no evidence that anything exists.",
            headline="NOTHING TO VERIFY",
        ))

    if _TUTORIAL_RE.search(projects or raw):
        out.append(Finding(
            "tutorial_project", 50,
            "A project reads as a tutorial follow-along or a clone.",
            "Replace tutorial projects with something you designed, or state what you changed.",
            mild="A tutorial project shows you can follow instructions, which is not the bar here.",
            medium="A clone project tells a hiring manager you can follow a video to the end.",
            nuclear="Your flagship project is something 40,000 other applicants also built on a Sunday.",
            headline="TUTORIAL GRADE",
        ))

    gpa = _GPA_RE.search(raw)
    if gpa:
        try:
            value, scale = float(gpa.group(1)), float(gpa.group(2) or 4.0)
            if scale and value / scale < 0.875:
                out.append(Finding(
                    "gpa_listed", 35,
                    f"GPA {gpa.group(1)} is printed. Convention is to list it only when it sells you.",
                    "Drop the GPA. The space is worth more as a result.",
                    mild="The GPA is not doing you any favours. That line could hold an achievement.",
                    medium="Printing that GPA is a choice, and it is not the one that gets you the interview.",
                    nuclear="You volunteered a number nobody asked for, and it was not a flattering one.",
                    headline="UNFORCED DISCLOSURE",
                ))
        except (TypeError, ValueError):
            pass

    # ---------------------------------------------------------------- length
    if total_words > 700:
        out.append(Finding(
            "too_long", 60,
            f"{total_words} words. That is a short story, not a resume.",
            f"{total_words} words is too long. Cut to roughly 450.",
            mild=f"At {total_words} words this is longer than the six seconds it will get.",
            medium=f"{total_words} words. Nobody is reading past the first third of that.",
            nuclear=f"{total_words} words. I have read shorter terms-and-conditions pages, and enjoyed them more.",
            headline="FAR TOO LONG",
        ))
    elif total_words < 150 and n_bullets < 4:
        out.append(Finding(
            "too_thin", 55,
            f"Only {total_words} words. There is not enough here to assess.",
            f"Only {total_words} words. Add the roles, tools and results you have left out.",
            mild=f"{total_words} words is not yet a resume, it is a placeholder.",
            medium=f"{total_words} words. This is a business card with ambitions.",
            nuclear=f"{total_words} words. You have submitted the outline and kept the resume.",
            headline="BARELY THERE",
        ))

    # Overused word beyond the buzzword list, e.g. "managed" eight times.
    words = [w.strip(".,():;•-").lower() for w in re.findall(r"[A-Za-z][A-Za-z'&/-]{3,}", raw)]
    counts: Dict[str, int] = {}
    for w in words:
        if w not in _STOPWORDS:
            counts[w] = counts.get(w, 0) + 1
    if counts:
        word, n = max(counts.items(), key=lambda kv: kv[1])
        if n >= 6 and total_words > 120:
            out.append(Finding(
                "repeated_word", 30,
                f"'{word}' appears {n} times. The reader notices before you do.",
                f"'{word}' appears {n} times. Swap most of them for something specific.",
                mild=f"'{word}' turns up {n} times, which flattens everything around it.",
                medium=f"'{word}' {n} times. At that point it stops carrying meaning.",
                nuclear=f"'{word}' appears {n} times. It has lost all meaning and taken the page with it.",
                headline="ONE WORD, EVERYWHERE",
            ))

    out.sort(key=lambda f: -f.weight)
    return out


def positives(
    *,
    strong_verbs: List[str],
    metric_bullets: List[str],
    experience: str,
    education: str,
    tech_skills: List[str],
    has_links: bool,
) -> List[str]:
    """Things the resume genuinely gets right. Never invented."""
    good: List[str] = []
    if metric_bullets:
        good.append(f"Quantified: \"{metric_bullets[0][:90]}\"")
    if strong_verbs:
        good.append(f"Strong verbs spotted: {', '.join(strong_verbs[:3])}.")
    if tech_skills:
        good.append(f"Concrete tools listed: {', '.join(tech_skills[:4])}.")
    if has_links:
        good.append("Links to your work are present, so claims can be checked.")
    if experience:
        good.append("Experience section is present and chronological.")
    if education:
        good.append("Education is stated clearly.")
    if not good:
        good.append("It opened without crashing the parser. That is the whole list.")
    return good


def has_links(raw: str) -> bool:
    return bool(_LINK_RE.search(raw))
