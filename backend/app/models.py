from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class RoastIntensity(str, Enum):
    MILD = "mild"
    MEDIUM = "medium"
    NUCLEAR = "nuclear"

# Auth Models
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Section Breakdown
class SectionCritique(BaseModel):
    section_name: str
    severity: str # "warning", "danger", "critical"
    original_snippet: Optional[str] = None
    burn: str
    fix_advice: str
    rewritten_content: str

class ATSBreakdown(BaseModel):
    total_score: int
    formatting_score: int
    keyword_score: int
    impact_score: int
    brevity_score: int
    missing_keywords: List[str] = []
    detected_keywords: List[str] = []
    red_flags: List[str] = []
    green_flags: List[str] = []

class ShareableCardData(BaseModel):
    title: str = "ROASTMYRESUME VERDICT"
    burn_line: str
    ats_score: int
    intensity: str
    candidate_alias: str = "ANONYMOUS APPLICANT"
    date_formatted: str

class RoastResult(BaseModel):
    id: str
    user_id: Optional[str] = None
    created_at: str
    file_name: str
    intensity: RoastIntensity
    target_job: Optional[str] = None
    # Which engine produced the roast. Only the local rule-based engine exists today.
    engine: str = "heuristic"
    overall_verdict: str
    headline_roast: str
    savage_paragraphs: List[str]
    ats_analysis: ATSBreakdown
    section_critiques: List[SectionCritique]
    full_rewritten_resume: str
    shareable_card: ShareableCardData

class ScoreRequest(BaseModel):
    text: str


class ScoreResult(BaseModel):
    """Live re-score of edited text. Same rubric as the report card, nothing saved."""
    total_score: int
    formatting_score: int
    keyword_score: int
    impact_score: int
    brevity_score: int
    tips: List[str] = []
    bullet_count: int = 0
    metric_bullet_count: int = 0
    weak_bullet_count: int = 0
    improved_text: str = ""


class HistoryItemSummary(BaseModel):
    id: str
    file_name: str
    created_at: str
    intensity: RoastIntensity
    ats_score: int
    overall_verdict: str
