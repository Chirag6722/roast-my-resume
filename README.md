# 🔥 ROAST MY RESUME

**Brutally honest resume feedback, ATS scoring, section-by-section improvements, polished rewrites, and viral shareable roast cards.**

---

## 🚀 Features

- **🔥 Savage Roast Engine**: Mild, Medium, and Nuclear intensity levels, generated locally from your resume's own content.
- **📊 ATS Robot Score (0–100)**: Quantitative breakdown across Formatting, Keyword Density, Measurable Impact, and Brevity.
- **🛠️ Section-by-Section Critiques**: Exact diagnosis, actionable fixes, and rewritten snippets for Summary, Experience, Skills, and Projects.
- **✨ Polished Rewrite**: Your resume rebuilt from its own content, with weak bullets turned into achievement lines. Copy it or download as `.txt` / `.md`.
- **📸 Viral Shareable Roast Cards**: Auto-generated high-res social card with your worst roast lines, ready for Twitter/X, LinkedIn, and Instagram.
- **📖 The Burn Book (History)**: Save past burns, track improvement over time, and revisit your rewrites.
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

## 🔐 Before deploying anywhere public

The backend signs login sessions with `SECRET_KEY`. If it is unset, the app falls back to a
development default that is **published in this repository**, which means anyone could forge a
session token. The server prints a warning on startup while that default is in use.

Copy `backend/.env.example` to `backend/.env` and set a real value:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Two other things to change before exposing this to the internet:

- **CORS** is set to `*` in `backend/app/config.py`. Restrict it to your own domain.
- **The API base URL** is hardcoded to `http://localhost:8000/api` in `frontend/src/services/api.ts`.

The SQLite database (`backend/roast_app.db`) holds account emails, password hashes, and the full
text of every resume roasted. It is gitignored and should never be committed.
