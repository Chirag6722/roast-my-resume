import re
from fastapi import FastAPI, UploadFile, File, Form, Header, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List

from app.config import settings
from app.models import (
    UserRegister, UserLogin, UserResponse, Token,
    RoastIntensity, RoastResult, HistoryItemSummary,
    ScoreRequest, ScoreResult
)
from app.local_roaster import LocalRoaster
from app.auth import get_password_hash, verify_password, create_access_token, get_optional_current_user
from app.database import db
from app.parser import ResumeParser
from app.ai_roaster import AIRoaster

app = FastAPI(
    title="Roast My Resume API",
    description="Backend API for AI-powered savage resume feedback, ATS analysis, and polished rewrites",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_GUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")

def get_guest_id(x_guest_id: Optional[str] = Header(default=None)) -> Optional[str]:
    """Anonymous per-browser id the frontend sends so guests only see their own roasts."""
    if x_guest_id and _GUEST_ID_PATTERN.match(x_guest_id):
        return x_guest_id
    return None

def _can_access(owner: dict, user_id: Optional[str], guest_id: Optional[str]) -> bool:
    if owner["user_id"]:
        return owner["user_id"] == user_id
    # Legacy guest roasts (no guest_id recorded) stay reachable by id, as they were before.
    return owner["guest_id"] is None or owner["guest_id"] == guest_id

@app.get("/")
def read_root():
    return {"status": "ok", "app": "RoastMyResume API", "version": "1.0.0"}

# --- LIVE FEED ENDPOINT (100% REAL FROM DATABASE) ---

_FILE_KINDS = {".pdf": "PDF resume", ".docx": "Word resume", ".doc": "Word resume",
               ".txt": "Text resume", ".md": "Text resume"}


def _file_kind(file_name: str) -> str:
    """The public feed must never publish a filename.

    Uploads are routinely named "Firstname_Lastname_Resume.pdf", so returning the
    real name put people's identities on the homepage next to their score. Only
    the format is shown, which is all the feed needs.
    """
    lower = (file_name or "").lower()
    if lower == "pasted_resume.txt":
        return "Pasted resume"
    for ext, label in _FILE_KINDS.items():
        if lower.endswith(ext):
            return label
    return "Resume"


@app.get("/api/live-feed")
def get_live_feed():
    # Only anonymous roasts are shown publicly; the count covers everything.
    real_roasts = db.get_public_roasts(limit=10)
    formatted_items = [
        {
            "id": r["id"],
            "quote": r["overall_verdict"],
            "file_kind": _file_kind(r["file_name"]),
            "intensity": r["intensity"].upper(),
            "ats_score": r["ats_score"],
        }
        for r in real_roasts
    ]
    return {
        "items": formatted_items,
        "total_burned": db.count_roasts()
    }

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserRegister):
    existing = db.get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    hashed_password = get_password_hash(user_data.password)
    user = db.create_user(user_data.name, user_data.email, hashed_password)
    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"]})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@app.post("/api/auth/login", response_model=Token)
def login(login_data: UserLogin):
    user = db.get_user_by_email(login_data.email)
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Prepare for more pain."
        )
    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"]})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(user_payload: Optional[dict] = Depends(get_optional_current_user)):
    if not user_payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = db.get_user_by_id(user_payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        created_at=user["created_at"]
    )

# --- ROAST ENDPOINTS ---

@app.post("/api/roast", response_model=RoastResult)
async def create_roast(
    file: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
    intensity: str = Form("medium"),
    target_job: Optional[str] = Form(None),
    user_payload: Optional[dict] = Depends(get_optional_current_user),
    guest_id: Optional[str] = Depends(get_guest_id)
):
    try:
        intensity_enum = RoastIntensity(intensity.lower())
    except ValueError:
        intensity_enum = RoastIntensity.MEDIUM

    file_name = "pasted_resume.txt"
    try:
        if file:
            file_name = file.filename or "uploaded_resume.pdf"
            file_bytes = await file.read()
            parsed_data = ResumeParser.parse_file(file_name, file_bytes)
        elif resume_text and len(resume_text.strip()) > 10:
            parsed_data = ResumeParser.parse_file("pasted_resume.txt", resume_text.encode("utf-8"))
        else:
            parsed_data = ResumeParser.parse_file(ResumeParser.SAMPLE_FILENAME, b"")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user_id = user_payload.get("sub") if user_payload else None

    # Generate the roast
    roast_result = await AIRoaster.generate_roast(
        parsed_resume=parsed_data,
        file_name=file_name,
        intensity=intensity_enum,
        target_job=target_job,
        user_id=user_id
    )

    # Save to persistent database
    db.save_roast(roast_result.model_dump(), guest_id=guest_id)

    return roast_result

@app.post("/api/score", response_model=ScoreResult)
def score_text(payload: ScoreRequest):
    """Re-score edited resume text with the same rubric as the report card.
    Read-only: nothing is saved, so the Live Tuner can be used freely."""
    text = payload.text.strip()
    if len(text) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough text to score. Paste at least a few lines."
        )
    parsed = ResumeParser.parse_file("pasted_resume.txt", text.encode("utf-8"))
    result = LocalRoaster.score(parsed)
    return ScoreResult(**result, improved_text=LocalRoaster.improve_text(text))

# --- HISTORY ENDPOINTS ---

@app.get("/api/history", response_model=List[HistoryItemSummary])
def get_roast_history(
    user_payload: Optional[dict] = Depends(get_optional_current_user),
    guest_id: Optional[str] = Depends(get_guest_id)
):
    user_id = user_payload.get("sub") if user_payload else None
    roasts = db.get_user_roasts(user_id, guest_id)
    return [
        HistoryItemSummary(
            id=r["id"],
            file_name=r["file_name"],
            created_at=r["created_at"],
            intensity=RoastIntensity(r["intensity"]),
            ats_score=r["ats_score"],
            overall_verdict=r["overall_verdict"]
        )
        for r in roasts
    ]

@app.get("/api/history/{roast_id}", response_model=RoastResult)
def get_single_roast(
    roast_id: str,
    user_payload: Optional[dict] = Depends(get_optional_current_user),
    guest_id: Optional[str] = Depends(get_guest_id)
):
    owner = db.get_roast_owner(roast_id)
    user_id = user_payload.get("sub") if user_payload else None
    # 404 in both cases so an id cannot be probed for existence.
    if not owner or not _can_access(owner, user_id, guest_id):
        raise HTTPException(status_code=404, detail="Roast not found.")
    return db.get_roast_by_id(roast_id)

@app.delete("/api/history/{roast_id}")
def delete_roast_item(
    roast_id: str,
    user_payload: Optional[dict] = Depends(get_optional_current_user),
    guest_id: Optional[str] = Depends(get_guest_id)
):
    user_id = user_payload.get("sub") if user_payload else None
    success = db.delete_roast(roast_id, user_id, guest_id)
    if not success:
        raise HTTPException(status_code=404, detail="Roast not found or could not be deleted.")
    return {"status": "deleted", "id": roast_id}
