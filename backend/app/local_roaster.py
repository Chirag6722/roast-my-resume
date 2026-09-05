"""
Rule-based roast engine used when no AI provider is configured.

Everything it says is derived from the resume that was actually submitted:
the bullets it quotes, the buzzwords it mocks, the skills it re-categorises
and the rewrite it produces all come from the parsed text. It is still a
heuristic, and the result is tagged engine="heuristic" so the UI can say so.
"""
import random
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app import roast_rules
from app.models import RoastIntensity, RoastResult, SectionCritique, ATSBreakdown, ShareableCardData

# Weak bullet openers and the stronger verb each becomes in the rewrite.
WEAK_OPENERS: List[Tuple[str, str]] = [
    ("responsible for", "Owned"),
    ("was responsible for", "Owned"),
    ("helped", "Drove"),
    ("assisted with", "Delivered"),
    ("assisted", "Supported"),
    ("worked on", "Built"),
    ("worked with", "Partnered with"),
    ("worked hard to", "Ensured"),
    ("participated in", "Contributed to"),
    ("attended", "Ran"),
    ("answered", "Resolved"),
    ("involved in", "Led"),
    ("tasked with", "Executed"),
    ("duties included", "Delivered"),
]

# Gerund or base verb that follows a weak opener -> past-tense achievement verb.
PAST_TENSE: Dict[str, str] = {
    "writing": "Wrote", "write": "Wrote", "maintaining": "Maintained", "maintain": "Maintained",
    "building": "Built", "build": "Built", "developing": "Developed", "develop": "Developed",
    "creating": "Created", "create": "Created", "managing": "Managed", "manage": "Managed",
    "testing": "Tested", "test": "Tested", "designing": "Designed", "design": "Designed",
    "supporting": "Supported", "support": "Supported", "leading": "Led", "lead": "Led",
    "handling": "Handled", "handle": "Handled", "coordinating": "Coordinated", "coordinate": "Coordinated",
    "organizing": "Organized", "organize": "Organized", "performing": "Performed", "perform": "Performed",
    "conducting": "Conducted", "conduct": "Conducted", "providing": "Provided", "provide": "Provided",
    "preparing": "Prepared", "prepare": "Prepared", "reviewing": "Reviewed", "review": "Reviewed",
    "monitoring": "Monitored", "monitor": "Monitored", "running": "Ran", "run": "Ran",
    "resolving": "Resolved", "resolve": "Resolved", "implementing": "Implemented", "implement": "Implemented",
    "analyzing": "Analyzed", "analyze": "Analyzed", "tracking": "Tracked", "track": "Tracked",
    "planning": "Planned", "plan": "Planned", "improving": "Improved", "improve": "Improved",
    "automating": "Automated", "automate": "Automated", "deploying": "Deployed", "deploy": "Deployed",
    "training": "Trained", "train": "Trained", "documenting": "Documented", "document": "Documented",
    "collaborating": "Collaborated", "collaborate": "Collaborated", "scheduling": "Scheduled", "schedule": "Scheduled",
    "attending": "Attended", "attend": "Attended", "participating": "Participated", "participate": "Participated",
    "responding": "Responded", "respond": "Responded", "assisting": "Assisted", "ensuring": "Ensured", "ensure": "Ensured",
}

PREPOSITIONS = {"with", "on", "in", "to", "for", "at", "by", "of"}

# A bracketed gap this engine already inserted, e.g. "[X%]" or "[N users/customers]".
PLACEHOLDER_RE = re.compile(r"\[[^\]]+\]")

METRIC_PLACEHOLDERS = [
    ", cutting [time/cost] by [X%]",
    " for [N users/customers]",
    ", delivering [X] ahead of schedule",
    ", raising [metric] from [A] to [B]",
]

SOFT_SKILLS = {
    "communication", "leadership", "teamwork", "team player", "problem solving",
    "multitasking", "time management", "hardworking", "hard working", "adaptability",
    "critical thinking", "interpersonal skills", "work ethic", "microsoft word",
    "ms word", "word", "powerpoint", "microsoft powerpoint", "microsoft office",
    "google docs", "email", "typing",
}

TECH_CATEGORIES: Dict[str, List[str]] = {
    "Languages": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
                  "sql", "html", "css", "kotlin", "swift", "ruby", "php", "scala", "r", "bash"],
    "Frameworks & Libraries": ["react", "next.js", "nextjs", "node", "node.js", "express", "django",
                               "flask", "fastapi", "spring", "angular", "vue", "tailwind", "tailwindcss",
                               "pandas", "numpy", "pytorch", "tensorflow", ".net", "rails"],
    "Cloud & DevOps": ["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
                       "github actions", "jenkins", "linux", "nginx"],
    "Data & Tools": ["postgresql", "postgres", "mysql", "mongodb", "redis", "git", "excel",
                     "microsoft excel", "tableau", "power bi", "jira", "figma", "graphql", "rest"],
}

METRIC_RE = re.compile(r"(\d+(?:\.\d+)?%|\$\d[\d,]*(?:\.\d+)?[kmb]?|\b\d+\s*(?:users|clients|customers|requests|ms|seconds|x|million|k|hours|teams|people|releases|projects)\b|\b\d{2,}\b)", re.IGNORECASE)
BULLET_RE = re.compile(r"^\s*[-•*▪◦]\s*")
DATE_RANGE_RE = re.compile(r"\(?\b(19|20)\d{2}\b\s*[-–—to]+\s*(?:(19|20)\d{2}|present|current|now)\b\)?", re.IGNORECASE)


class LocalRoaster:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _bullets(text: str) -> List[str]:
        return [BULLET_RE.sub("", ln).strip() for ln in text.splitlines() if BULLET_RE.match(ln)]

    @staticmethod
    def _has_metric(line: str) -> bool:
        return bool(METRIC_RE.search(line))

    @classmethod
    def _weak_opener(cls, line: str) -> Optional[Tuple[str, str]]:
        low = line.lower().lstrip()
        for weak, strong in WEAK_OPENERS:
            if low.startswith(weak):
                return weak, strong
        return None

    @classmethod
    def rewrite_bullet(cls, line: str) -> str:
        """Turn a duty into an achievement: strong verb first, metric placeholder if none."""
        cleaned = line.rstrip(" .")
        weak = cls._weak_opener(cleaned)
        if weak:
            rest = cleaned[len(weak[0]):].lstrip(" :,-")
            # "helped with testing" -> drop the preposition so the verb can lead: "Tested".
            lead = rest.split(" ", 1)
            if len(lead) > 1 and lead[0].lower() in PREPOSITIONS:
                rest = lead[1].lstrip()
            words = rest.split(" ", 1)
            first = words[0].lower().strip(",.") if words else ""
            tail = words[1] if len(words) > 1 else ""
            if first in PAST_TENSE:
                # "helped maintain docs" -> "Maintained docs"; "responsible for writing code" -> "Wrote code"
                cleaned = f"{PAST_TENSE[first]} {tail}".strip()
            elif first and first.rstrip("e") == weak[1].lower().rstrip("ed"):
                cleaned = f"{weak[1]} {tail}".strip()  # "worked hard to ensure X" -> "Ensured X"
            else:
                cleaned = f"{weak[1]} {rest}"
        # Drop "various", "great attitude"-style padding.
        cleaned = re.sub(r"\b(various|numerous|several|different|great|strong|excellent|good)\s+", "", cleaned, flags=re.IGNORECASE)
        # Keep a conjoined verb in the same tense: "Wrote code and attending standups"
        # -> "Wrote code and attended standups".
        cleaned = re.sub(
            r"\b(and|then)\s+(\w+)",
            lambda m: f"{m.group(1)} {PAST_TENSE[m.group(2).lower()].lower()}"
            if m.group(2).lower() in PAST_TENSE else m.group(0),
            cleaned,
        )
        cleaned = cleaned[:1].upper() + cleaned[1:]
        # Skip the placeholder when the bullet already has a number, or already
        # carries one from an earlier pass, so re-running never stacks them up.
        if not cls._has_metric(cleaned) and not PLACEHOLDER_RE.search(cleaned):
            lead_word = cleaned.split(" ", 1)[0].rstrip(",.").lower()
            # Don't pick a placeholder that echoes the verb the bullet already opens with.
            options = [p for p in METRIC_PLACEHOLDERS if not p.lstrip(", ").lower().startswith(lead_word[:5])]
            options = options or METRIC_PLACEHOLDERS
            cleaned += options[sum(map(ord, line)) % len(options)]
        return cleaned.strip()

    @classmethod
    def rank_bullets(cls, bullets: List[str]) -> List[Tuple[int, str]]:
        """Worst first: weak opener + no metric scores highest."""
        scored = []
        for b in bullets:
            score = 0
            if cls._weak_opener(b):
                score += 2
            if not cls._has_metric(b):
                score += 1
            if len(b.split()) < 6:
                score += 1
            scored.append((score, b))
        return sorted(scored, key=lambda t: -t[0])

    @staticmethod
    def _split_skills(skills_text: str) -> List[str]:
        parts = re.split(r"[,|•·\n;/]+(?![^()]*\))", skills_text)
        out = []
        for p in parts:
            p = re.sub(r"^(languages|frameworks|tools|technologies|skills|technical skills)\s*:\s*", "", p.strip(), flags=re.IGNORECASE)
            if 0 < len(p) <= 40:
                out.append(p.strip())
        return out

    @classmethod
    def categorise_skills(cls, skills: List[str]) -> Tuple[Dict[str, List[str]], List[str], List[str]]:
        cats: Dict[str, List[str]] = {k: [] for k in TECH_CATEGORIES}
        soft, other = [], []
        for s in skills:
            low = s.lower()
            if low in SOFT_SKILLS or any(low.startswith(x) for x in ("microsoft", "ms ")):
                soft.append(s)
                continue
            placed = False
            for cat, names in TECH_CATEGORIES.items():
                if low in names:
                    cats[cat].append(s)
                    placed = True
                    break
            if not placed:
                other.append(s)
        return cats, soft, other

    @staticmethod
    def _header_lines(raw: str) -> Tuple[str, str]:
        """Name and contact line from the top of the resume."""
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        name = lines[0] if lines else "YOUR NAME"
        contact = ""
        for ln in lines[1:4]:
            if "@" in ln or re.search(r"\d{3}[-.\s]?\d{3,4}", ln) or "|" in ln:
                contact = ln
                break
        return name, contact

    @staticmethod
    def _job_blocks(exp_text: str) -> List[Tuple[str, List[str]]]:
        """Group experience into (heading, bullets). A heading is a non-bullet line."""
        blocks: List[Tuple[str, List[str]]] = []
        for ln in exp_text.splitlines():
            if not ln.strip():
                continue
            if BULLET_RE.match(ln):
                if not blocks:
                    blocks.append(("Role", []))
                blocks[-1][1].append(BULLET_RE.sub("", ln).strip())
            else:
                blocks.append((ln.strip(), []))
        return blocks

    # ------------------------------------------------------------------ findings
    _DEFAULT_HEADLINE = {
        RoastIntensity.MILD: "GENTLE WAKE-UP CALL",
        RoastIntensity.MEDIUM: "SARCASM WITH RECEIPTS",
        RoastIntensity.NUCLEAR: "TOTAL EMOTIONAL ANNIHILATION",
    }

    # Used only when the detector finds nothing wrong, which is rare and earned.
    _CLEAN_VERDICTS = {
        RoastIntensity.MILD: [
            "Genuinely solid. The remaining gains are in wording, not structure.",
            "Nothing here embarrasses you, which puts it ahead of most of the pile.",
            "This one does the basics properly. That is rarer than it should be.",
        ],
        RoastIntensity.MEDIUM: [
            "Annoyingly competent. I had to work for this one.",
            "No structural sins worth the name. Now make the numbers bigger and the sentences shorter.",
            "I went looking for a disaster and found a decent resume. Inconvenient.",
        ],
        RoastIntensity.NUCLEAR: [
            "I came to destroy this and left mildly impressed. Do not let it go to your head.",
            "Fine. It survives. The bar was on the floor and you cleared it standing up.",
            "You have denied me a punchline, which is its own kind of rude.",
        ],
    }

    @classmethod
    def _findings(cls, parsed: Dict[str, Any]) -> List[roast_rules.Finding]:
        """Every specific sin in this resume, worst first. One source of truth
        for the red flags, the live-tuner tips, the verdict and the paragraphs."""
        raw = parsed.get("raw_text", "")
        sections = parsed.get("sections", {})
        metrics = parsed.get("metrics", {})

        exp = sections.get("experience", "")
        proj = sections.get("projects", "")
        bullets = cls._bullets(exp) + cls._bullets(proj) + cls._bullets(sections.get("other", ""))
        skills = cls._split_skills(sections.get("skills", ""))
        cats, soft_skills, _ = cls.categorise_skills(skills)

        opener_of = lambda b: (cls._weak_opener(b) or (None, None))[0]  # noqa: E731
        return roast_rules.detect_findings(
            raw=raw,
            summary=sections.get("summary", ""),
            experience=exp,
            skills_text=sections.get("skills", ""),
            education=sections.get("education", ""),
            projects=proj,
            bullets=bullets,
            weak_bullets=[b for s, b in cls.rank_bullets(bullets) if s >= 2],
            metric_bullets=[b for b in bullets if cls._has_metric(b)],
            buzzwords=metrics.get("buzzwords", []),
            strong_verbs=metrics.get("strong_verbs", []),
            skills=skills,
            soft_skills=soft_skills,
            tech_skills=[s for v in cats.values() for s in v],
            total_words=metrics.get("total_words", len(raw.split())),
            weak_opener_of=opener_of,
        )

    @classmethod
    def _paragraphs(
        cls, *, findings: List[roast_rules.Finding], chosen_code: str,
        intensity: RoastIntensity, total: int, total_words: int,
        n_bullets: int, n_metrics: int, n_skills: int, n_buzz: int, is_senior: bool,
    ) -> Tuple[str, str]:
        """Two paragraphs built from the findings that are actually present, so
        the body of the roast changes with the resume rather than the template."""
        heat = intensity.value
        # The verdict already used one finding, so the body draws only on the others.
        # Nothing is said twice in the same roast.
        rest = [f for f in findings if f.code != chosen_code]
        lead = rest[0].quip(heat) if rest else ""
        second = rest[1].quip(heat) if len(rest) > 1 else ""
        third = rest[2].quip(heat) if len(rest) > 2 else ""

        openers = {
            "mild": [
                "Here is the honest version.",
                "Nothing here is fatal, but a recruiter will notice this first.",
                "Taking it at face value:",
            ],
            "medium": [
                "Let us go through it.",
                "A recruiter gives this six seconds, so let us spend them well.",
                "The screener does not care about your intentions, only this:",
            ],
            "nuclear": [
                "Right. Brace yourself.",
                "I read this so a hiring manager would not have to.",
                "Let us perform the autopsy.",
            ],
        }[heat]

        body = " ".join(x for x in (lead, second) if x)
        p1 = f"{random.choice(openers)} {body}".strip()
        if not body:
            p1 = f"{random.choice(openers)} Structurally this holds up, which is more than most of the pile manages."

        stat = f"{n_metrics} measurable {'result' if n_metrics == 1 else 'results'} across {n_bullets} bullet{'s' if n_bullets != 1 else ''}"
        remaining = third or (f"The only thing left is {findings[-1].tip[0].lower()}{findings[-1].tip[1:]}" if findings else "")

        # The closing line has to match the actual score. Calling an 89/100 a
        # disaster is the fastest way to lose the reader's trust in the whole roast.
        if total >= 75:
            closers = {
                "mild": [
                    f"{total}/100 with {stat}. This is already working. Polish it, do not rebuild it.",
                    f"You are at {total}/100. The structure and the evidence are both there; the rest is wording.",
                ],
                "medium": [
                    f"{total}/100 with {stat}. Annoyingly, most of this is right. {remaining}".strip(),
                    f"{total}/100. You have done the hard part. What is left is tightening, not fixing.",
                ],
                "nuclear": [
                    f"{total}/100. I wanted this to be a disaster and it refuses. {remaining}".strip(),
                    f"{total}/100 with {stat}. This clears a recruiter screen, which spoils my afternoon.",
                ],
            }[heat]
        elif total >= 50:
            closers = {
                "mild": [
                    f"You are at {total}/100 with {stat}. Fix the ratio and this becomes a different document.",
                    f"{total}/100. {stat.capitalize()}. The structure is fine; the evidence is what is thin.",
                ],
                "medium": [
                    f"With {total}/100 and {stat}, the screener is not rejecting you out of spite. It has nothing to match on.",
                    f"{total}/100. {n_skills} skills claimed, {n_metrics} proven. That gap is the whole problem.",
                    f"{total}/100 and {stat}. {remaining or 'Every fix on this page is an hour of work, not a career change.'}",
                ],
                "nuclear": [
                    f"{total}/100 across {total_words} words. {remaining or 'You have written a great deal and proven remarkably little.'}",
                    f"A {total}/100 with {stat}. Recruiters spend six seconds per resume. You will not need all six.",
                ],
            }[heat]
        else:
            closers = {
                "mild": [
                    f"{total}/100 with {stat}. This needs a rebuild, not a polish, and that is genuinely fixable.",
                    f"At {total}/100 the problem is not your experience, it is that none of it is on the page.",
                ],
                "medium": [
                    f"{total}/100. {n_skills} skills claimed, {n_metrics} proven, {n_buzz} clichés deployed. Start again from the bullets.",
                    f"{total}/100 with {stat}. An automated screen will not pass this, and a human would not either.",
                ],
                "nuclear": [
                    f"{total}/100. {n_skills} skills claimed, {n_metrics} outcomes shown, {n_buzz} clichés deployed. This file should ship with a hazard label.",
                    f"{total}/100 across {total_words} words. {remaining or 'A great deal written, remarkably little proven.'}",
                ],
            }[heat]
        p2 = random.choice(closers)
        if is_senior and intensity != RoastIntensity.MILD:
            p2 += " At your level the reader expects scope and business outcomes, not a task list."
        return p1, p2

    # ------------------------------------------------------------------ scoring
    @classmethod
    def score(cls, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """The one ATS rubric. Used for the report card and for the live re-score,
        so a number shown in the tuner is directly comparable to the original."""
        raw = parsed.get("raw_text", "")
        sections = parsed.get("sections", {})
        metrics = parsed.get("metrics", {})

        exp = sections.get("experience", "")
        edu = sections.get("education", "")
        buzzwords: List[str] = metrics.get("buzzwords", [])
        strong_verbs: List[str] = metrics.get("strong_verbs", [])
        total_words = metrics.get("total_words", len(raw.split()))

        all_bullets = cls._bullets(exp) + cls._bullets(sections.get("projects", "")) + cls._bullets(sections.get("other", ""))
        weak_bullets = [b for s, b in cls.rank_bullets(all_bullets) if s >= 2]
        num_metrics = len([b for b in all_bullets if cls._has_metric(b)])

        skills = cls._split_skills(sections.get("skills", ""))
        cats, soft_skills, _ = cls.categorise_skills(skills)

        formatting = 22
        if not exp:
            formatting -= 6
        if not skills:
            formatting -= 3
        if not edu:
            formatting -= 2
        if total_words > 800:
            formatting -= 3
        formatting = max(6, min(25, formatting))

        keyword = 10 + len(strong_verbs) * 3 + min(6, sum(len(v) for v in cats.values())) - len(buzzwords) * 2 - len(soft_skills)
        keyword = max(4, min(25, keyword))

        # No floor above zero here: a floor would hide the gain from fixing weak
        # bullets, so acting on our own advice would show no score movement.
        impact = num_metrics * 5 + len(strong_verbs) * 2 - len(weak_bullets) * 2
        impact = max(0, min(25, impact))

        brevity = 25 - max(0, (total_words - 450) // 40)
        if total_words < 120:
            brevity -= 6  # too thin to judge
        brevity = max(6, min(25, brevity))

        # Same detector the roast uses, so the advice and the burns never disagree.
        tips = [f.tip for f in cls._findings(parsed)[:6]]
        if not tips:
            tips.append("Nothing obvious left to fix. Tighten the wording and make sure every bullet names an outcome.")

        return {
            "total_score": max(12, min(95, formatting + keyword + impact + brevity)),
            "formatting_score": formatting,
            "keyword_score": keyword,
            "impact_score": impact,
            "brevity_score": brevity,
            "tips": tips,
            "bullet_count": len(all_bullets),
            "metric_bullet_count": num_metrics,
            "weak_bullet_count": len(weak_bullets),
        }

    @classmethod
    def improve_text(cls, raw_text: str) -> str:
        """Apply the same bullet rewrite the critiques use, to every bullet in the text.
        Generic: it works on any resume and never invents facts, only placeholders."""
        out: List[str] = []
        for line in raw_text.splitlines():
            if BULLET_RE.match(line):
                marker = BULLET_RE.match(line).group(0)
                body = BULLET_RE.sub("", line).strip()
                indent = marker[:len(marker) - len(marker.lstrip())]
                out.append(f"{indent}- {cls.rewrite_bullet(body)}")
            else:
                out.append(line)
        return "\n".join(out)

    # ------------------------------------------------------------------ main
    @classmethod
    def generate(
        cls,
        parsed: Dict[str, Any],
        file_name: str,
        intensity: RoastIntensity,
        target_job: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> RoastResult:
        raw = parsed.get("raw_text", "")
        sections = parsed.get("sections", {})
        metrics = parsed.get("metrics", {})

        summary = sections.get("summary", "")
        exp = sections.get("experience", "")
        skills_text = sections.get("skills", "")
        edu = sections.get("education", "")
        proj = sections.get("projects", "")

        buzzwords: List[str] = metrics.get("buzzwords", [])
        strong_verbs: List[str] = metrics.get("strong_verbs", [])
        total_words = metrics.get("total_words", len(raw.split()))

        all_bullets = cls._bullets(exp) + cls._bullets(proj) + cls._bullets(sections.get("other", ""))
        ranked = cls.rank_bullets(all_bullets)
        weak_bullets = [b for s, b in ranked if s >= 2]
        metric_bullets = [b for b in all_bullets if cls._has_metric(b)]
        num_metrics = len(metric_bullets)

        skills = cls._split_skills(skills_text)
        cats, soft_skills, other_skills = cls.categorise_skills(skills)
        name, contact = cls._header_lines(raw)

        # ---------------------------------------------------------- scoring
        sub = cls.score(parsed)
        formatting, keyword, impact, brevity = (
            sub["formatting_score"], sub["keyword_score"], sub["impact_score"], sub["brevity_score"]
        )
        total = sub["total_score"]
        if intensity == RoastIntensity.NUCLEAR:
            total = max(12, total - 6)

        # ---------------------------------------------------------- findings
        findings = cls._findings(parsed)
        red_flags = [f.flag for f in findings[:6]]
        if not red_flags:
            red_flags.append("Nothing structural is broken. The remaining work is sharper wording and better numbers.")
        green_flags = roast_rules.positives(
            strong_verbs=strong_verbs,
            metric_bullets=metric_bullets,
            experience=exp,
            education=edu,
            tech_skills=[s for v in cats.values() for s in v],
            has_links=roast_rules.has_links(raw),
        )

        # ---------------------------------------------------------- verdict
        is_senior = bool(re.search(r"\b(senior|lead|principal|staff|director|head of|vp|vice president|chief|manager)\b", raw[:600], re.IGNORECASE))
        heat = intensity.value

        # The verdict is one finding's one-liner. Weighting by severity keeps the
        # sharpest material likely without making every roast identical.
        chosen_code = ""
        if findings:
            top = findings[: min(4, len(findings))]
            chosen = random.choices(top, weights=[f.weight for f in top], k=1)[0]
            verdict = chosen.quip(heat)
            headline = chosen.headline or cls._DEFAULT_HEADLINE[intensity]
            chosen_code = chosen.code
            # With only a sin or two there is little to draw on, so a strong resume
            # would otherwise get the same line every time. Let the score speak too.
            if len(findings) <= 2 and total >= 70 and random.random() < 0.5:
                verdict = random.choice(cls._CLEAN_VERDICTS[intensity])
                headline = "ANNOYINGLY COMPETENT"
                chosen_code = ""
        else:
            verdict = random.choice(cls._CLEAN_VERDICTS[intensity])
            headline = "SURPRISINGLY SURVIVABLE"

        p1, p2 = cls._paragraphs(
            findings=findings, chosen_code=chosen_code,
            intensity=intensity, total=total, total_words=total_words,
            n_bullets=len(all_bullets), n_metrics=num_metrics,
            n_skills=len(skills), n_buzz=len(buzzwords), is_senior=is_senior,
        )

        # ---------------------------------------------------------- critiques
        critiques: List[SectionCritique] = []

        # Summary
        summary_buzz = [b for b in buzzwords if b in summary.lower()]
        title_guess = ""
        for ln in raw.splitlines()[1:4]:
            if re.search(r"engineer|developer|manager|analyst|designer|scientist|intern|director|vice president|vp|consultant|specialist", ln, re.IGNORECASE):
                title_guess = ln.split("|")[0].strip()
                break
        top_tech = [s for v in cats.values() for s in v][:4]
        rewritten_summary = (
            f"{title_guess or 'Professional'} with hands-on experience in {', '.join(top_tech) if top_tech else '[your three core tools or domains]'}. "
            f"{cls.rewrite_bullet(metric_bullets[0]) if metric_bullets else 'Delivered [your best measurable result here, e.g. cut processing time 40% for 5k users]'}."
        )
        if summary:
            burn = (
                f"Your summary uses {len(summary_buzz)} buzzword{'s' if len(summary_buzz) != 1 else ''} in {len(summary.split())} words"
                + (f" ({', '.join(summary_buzz[:3])})" if summary_buzz else "")
                + ". It tells the reader you exist and nothing else."
            )
        else:
            burn = "There is no summary. The recruiter's first six seconds land on your address."
        critiques.append(SectionCritique(
            section_name="Professional Summary",
            severity="critical" if (summary_buzz and intensity != RoastIntensity.MILD) or not summary else "danger",
            original_snippet=summary[:160] if summary else None,
            burn=burn,
            fix_advice="Two sentences: your title and years, then one specific result with a number. No adjectives about your personality.",
            rewritten_content=rewritten_summary,
        ))

        # Experience
        worst_two = [b for _, b in ranked[:2]]
        rewritten_exp = "\n".join(f"• {cls.rewrite_bullet(b)}" for b in (worst_two or all_bullets[:2])) or "• [Add bullets: strong verb + what you built + measurable result]"
        if worst_two:
            opener = cls._weak_opener(worst_two[0])
            burn = (
                f"\"{worst_two[0][:110]}\" — "
                + (f"opening with \"{opener[0]}\" is code for \"I was in the room\"." if opener else "no number, no outcome, no reason to keep reading.")
            )
        else:
            burn = "No experience bullets were found. Either the section is missing or it is a paragraph, and nobody reads paragraphs."
        critiques.append(SectionCritique(
            section_name="Work Experience",
            severity="critical" if len(weak_bullets) >= 2 or not all_bullets else "danger",
            original_snippet="\n".join(worst_two)[:200] if worst_two else (exp[:160] or None),
            burn=burn,
            fix_advice="Rewrite every bullet as: strong verb, what you did, measured result. If you do not have the number, estimate it honestly and be ready to defend it.",
            rewritten_content=rewritten_exp,
        ))

        # Skills
        tech_lines = [f"{cat}: {', '.join(v)}" for cat, v in cats.items() if v]
        if other_skills:
            tech_lines.append(f"Other: {', '.join(other_skills[:8])}")
        if soft_skills:
            burn = f"{', '.join(soft_skills[:4])} are not skills, they are the minimum requirement for being employed. That is {len(soft_skills)} slots wasted."
        elif skills:
            burn = f"{len(skills)} skills in one undifferentiated list. Recruiters cannot tell what you are expert in versus what you once installed."
        else:
            burn = "No skills section was found. The ATS keyword matcher has nothing to work with."
        critiques.append(SectionCritique(
            section_name="Skills",
            severity="warning" if not soft_skills or intensity == RoastIntensity.MILD else "danger",
            original_snippet=skills_text[:160] if skills_text else None,
            burn=burn,
            fix_advice="Group tools by category and drop anything a hiring manager would assume you have. Prove soft skills in the bullets instead.",
            rewritten_content="\n".join(tech_lines) if tech_lines else "Languages: [ ... ]\nFrameworks & Libraries: [ ... ]\nCloud & DevOps: [ ... ]\nData & Tools: [ ... ]",
        ))

        # Projects
        proj_bullets = cls._bullets(proj)
        if proj:
            burn = (
                f"\"{proj_bullets[0][:100]}\" — a project bullet with no users, link or stack is a hobby, not evidence." if proj_bullets and not cls._has_metric(proj_bullets[0])
                else "Projects exist, which is good. Now make each one prove a skill the job actually needs."
            )
            rewritten_proj = "\n".join(f"• {cls.rewrite_bullet(b)}" for b in proj_bullets[:3]) or "• " + cls.rewrite_bullet(proj.splitlines()[0])
        elif is_senior:
            burn = "No projects or key initiatives section. At your level the reader wants the two things you owned end to end, with the business result of each."
            rewritten_proj = "• [Initiative name]: owned [scope, team size] and delivered [business result: revenue, cost, growth] over [timeframe]."
        else:
            burn = "No projects section. For anyone under five years of experience that is the section that gets interviews."
            rewritten_proj = "• [Project name] ([link]): built [what] with [stack], used by [N people] / cut [metric] by [X%]."
        critiques.append(SectionCritique(
            section_name="Key Initiatives" if is_senior and not proj else "Projects",
            severity="warning",
            original_snippet=proj[:160] if proj else None,
            burn=burn,
            fix_advice="One line per project: name, link, stack, and the one number that shows it mattered.",
            rewritten_content=rewritten_proj,
        ))

        # ---------------------------------------------------------- full rewrite
        md: List[str] = [f"# {name.upper()}"]
        if contact:
            md.append(contact)
        md += ["", "---", "", "## SUMMARY", rewritten_summary, ""]
        if tech_lines:
            md += ["## SKILLS"] + [f"- **{ln.split(':', 1)[0]}:** {ln.split(':', 1)[1].strip()}" for ln in tech_lines] + [""]
        blocks = cls._job_blocks(exp)
        if blocks:
            md.append("## EXPERIENCE")
            for heading, bullets in blocks:
                md += ["", f"### {heading}"]
                for b in bullets[:4]:
                    md.append(f"- {cls.rewrite_bullet(b)}")
            md.append("")
        if proj:
            md += ["## PROJECTS"] + [ln for ln in rewritten_proj.replace("• ", "- ").splitlines()] + [""]
        if edu:
            md += ["## EDUCATION"] + [ln.strip() for ln in edu.splitlines() if ln.strip()] + [""]
        full_rewrite = "\n".join(md).strip()

        # ---------------------------------------------------------- keywords
        detected = sorted({s for v in cats.values() for s in v} | {v.capitalize() for v in strong_verbs})
        missing = ["Quantified impact (%, $, users)", "Ownership verbs (led, built, shipped)", "Scope (team size, scale)"]
        if target_job:
            job_words = {w.lower().strip(",.()") for w in target_job.split() if len(w) > 3}
            resume_words = {w.lower().strip(",.()") for w in raw.split()}
            tech_in_job = sorted({n for names in TECH_CATEGORIES.values() for n in names if n in job_words and n not in resume_words})
            if tech_in_job:
                missing = [t.title() if len(t) > 3 else t.upper() for t in tech_in_job[:6]] + missing[:1]

        return RoastResult(
            id=str(uuid.uuid4()),
            user_id=user_id,
            created_at=datetime.utcnow().strftime("%b %d, %Y • %I:%M %p"),
            file_name=file_name,
            intensity=intensity,
            target_job=target_job,
            engine="heuristic",
            overall_verdict=verdict,
            headline_roast=headline,
            savage_paragraphs=[p1, p2],
            ats_analysis=ATSBreakdown(
                total_score=total,
                formatting_score=formatting,
                keyword_score=keyword,
                impact_score=impact,
                brevity_score=brevity,
                missing_keywords=missing,
                detected_keywords=detected,
                red_flags=red_flags,
                green_flags=green_flags,
            ),
            section_critiques=critiques,
            full_rewritten_resume=full_rewrite,
            shareable_card=ShareableCardData(
                # Stored unquoted; each card supplies its own quotation marks.
                burn_line=verdict,
                ats_score=total,
                intensity=intensity.value.upper(),
                candidate_alias=f"APPLICANT #{random.randint(1042, 9999)}",
                date_formatted=datetime.utcnow().strftime("%B %Y"),
            ),
        )
