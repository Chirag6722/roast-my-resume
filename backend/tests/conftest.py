"""Shared fixtures. Every test runs against a throwaway database so the suite
never touches the real roast_app.db."""
import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Must be set before app.config is imported, since it reads the path at import time.
os.environ.setdefault("SQLITE_DB_PATH", str(Path(tempfile.mkdtemp()) / "test.db"))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.parser import ResumeParser  # noqa: E402

WEAK_RESUME = """JOHNATHAN DOE
Software Engineer | john.doe@email.com

OBJECTIVE
To obtain a challenging position where I can use my skills!

SKILLS
Microsoft Word, Communication, HTML, Python, Git, React, Docker, AWS

EXPERIENCE
Software Intern - TechCorp Solutions
- Responsible for writing code and attending daily standup meetings.
- Helped maintain documentation in Google Docs, etc.
- Participated in brainstorming sessions and demonstrated great attitude!

EDUCATION
B.S. in Computer Science - State University
GPA: 3.1/4.0

References available upon request."""

STRONG_RESUME = """PRIYA RAO
Senior Backend Engineer | priya@rao.dev | github.com/priyarao

SUMMARY
Backend engineer with 7 years building payment systems at scale.

SKILLS
Python, Go, PostgreSQL, Redis, Kubernetes

EXPERIENCE
Senior Backend Engineer - Ledger Systems (2021 - Present)
- Rebuilt the settlement pipeline in Go, cutting end-of-day close from 90 minutes to 7.
- Reduced p99 latency by 62% for 2.4 million daily requests in PostgreSQL and Redis.
- Led 5 engineers through a zero-downtime Kubernetes migration of 400 million rows.

EDUCATION
B.Tech Computer Science - IIT Bombay (2014 - 2018)"""

SHORT_RESUME = (
    "SUMMARY\nHardworking team player.\n\n"
    "EXPERIENCE\nIntern - Corp\n- Responsible for stuff, reduced costs 20%\n\n"
    "SKILLS\nPython, Git"
)

# A legacy Word document is an OLE compound file, not a zip.
OLE_HEADER = bytes([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) + bytes(400)
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def guest() -> dict:
    """Headers for one anonymous browser. Unique per test so histories stay isolated."""
    import uuid
    return {"X-Guest-Id": "guest_" + uuid.uuid4().hex[:16]}


@pytest.fixture
def other_guest() -> dict:
    import uuid
    return {"X-Guest-Id": "guest_" + uuid.uuid4().hex[:16]}


@pytest.fixture
def account(client) -> dict:
    """A registered user's auth headers, plus their token and profile."""
    import uuid
    email = f"user_{uuid.uuid4().hex[:12]}@example.com"
    res = client.post("/api/auth/register",
                      json={"name": "Test User", "email": email, "password": "hunter22"})
    assert res.status_code == 200, res.text
    body = res.json()
    return {
        "email": email,
        "password": "hunter22",
        "token": body["access_token"],
        "user": body["user"],
        "headers": {"Authorization": f"Bearer {body['access_token']}"},
    }


def parse(text: str, name: str = "resume.txt"):
    return ResumeParser.parse_file(name, text.encode("utf-8"))
