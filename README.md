# 🔥 ROAST MY RESUME

**Brutally honest resume feedback, ATS scoring, section-by-section improvements, polished rewrites, and viral shareable roast cards.**

---

## 🚀 Features

- **🔥 Savage Roast Engine**: Mild, Medium, and Nuclear intensity levels, generated locally from your resume's own content.
- **📊 ATS Robot Score (0–100)**: Quantitative breakdown across Formatting, Keyword Density, Measurable Impact, and Brevity.
- **🛠️ Section-by-Section Critiques**: Exact diagnosis, actionable fixes, and rewritten snippets for Summary, Experience, Skills, and Projects.
- **✨ Polished Rewrite**: Your resume rebuilt from its own content, with weak bullets turned into achievement lines. Copy it or download as `.txt` / `.md`.
- **📸 Viral Shareable Roast Cards**: Auto-generated high-res social card with your worst roast lines, ready for Twitter/X, LinkedIn, and Instagram.
- **📖 The Burn Book (History)**: Every past roast, plus a score-over-time chart so you can see a resume actually getting better.
- **🔐 Auth & Guest Mode**: Sign up (`SIGN UP. GET TORCHED.`), log in (`BACK FOR MORE PAIN?`), or continue instantly as guest.

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, html2canvas, Vite
- **Backend**: FastAPI, Pydantic, PyPDF, python-docx, JWT Auth (bcrypt/jose)
- **Database**: Local SQLite
- **Typography & Theme**: Google Font *Bebas Neue*, *Space Grotesk*, *JetBrains Mono*, Ember `#FF4400` Palette

---

## 🏃 Quick Start

### 1. Run Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: `http://localhost:8000` (Swagger docs at `/docs`)

### 2. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## 🧠 How the roast is generated
Everything runs locally. No external AI API is called and no key is needed.

The rule-based engine in `backend/app/local_roaster.py` scores the resume from word counts, buzzwords, metrics and verbs, quotes the weakest real bullets, re-categorises the skills list, and rewrites the actual bullets with placeholder metrics for you to fill in. Results are tagged `engine: "heuristic"` and the UI shows a **RULE-BASED ROAST** badge.

---

## 🧪 Tests

131 checks covering the behaviour that is easy to get wrong: who can read whose
roasts, what the public feed is allowed to publish, whether the scorer and the
Live Tuner agree, and whether the roast copy actually refers to the resume in
front of it.

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest tests -q
```

```bash
cd frontend && npm test
```

| Suite | Covers |
| --- | --- |
| `backend/tests/test_auth.py` | Registration, login, token rejection, password length limits |
| `backend/tests/test_privacy.py` | History scoping, ownership on read and delete, filename redaction in the public feed |
| `backend/tests/test_uploads.py` | Parsing PDF/DOCX/TXT and explaining every failure in plain language |
| `backend/tests/test_scoring.py` | The ATS rubric, and that acting on the rewrite raises the score |
| `backend/tests/test_roast_quality.py` | Verdict variety, tone matching the score, and that nothing is invented |
| `frontend/src/services/api.test.ts` | Offline behaviour and turning server errors into sentences |
| `frontend/src/utils/*.test.ts` | Job-description matching, Markdown rendering, speech chunking |
| `frontend/src/routes.test.ts` | URL to screen mapping, so back, refresh and shared links work |
| `frontend/src/utils/scoreTrend.test.ts` | Trend geometry, including a flat run and the ends of the scale |

---

## 🔐 Before deploying anywhere public

The backend signs login sessions with `SECRET_KEY`. If it is unset, the app falls back to a
development default that is **published in this repository**, which means anyone could forge a
session token. The server prints a warning on startup while that default is in use.

Copy `backend/.env.example` to `backend/.env` and set a real value:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Three other things to handle before exposing this to the internet:

- **CORS** is set to `*` in `backend/app/config.py`. Restrict it to your own domain.
- **The API base URL** is hardcoded to `http://localhost:8000/api` in `frontend/src/services/api.ts`.
- **Serve `index.html` for unknown paths.** Each screen has its own address (`/roast`, `/history`,
  `/login`, `/register`), so a static host must fall back to `index.html` or a refresh on
  `/history` will 404. Vite's dev server and `vite preview` already do this; nginx needs
  `try_files $uri /index.html;` and Netlify or Vercel need an equivalent rewrite.

The SQLite database (`backend/roast_app.db`) holds account emails, password hashes, and the full
text of every resume roasted. It is gitignored and should never be committed.
