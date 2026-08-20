# InterviewIQ — AI Technical Interview Agent

> Upload your resume, pick a company persona, and get interviewed by an AI that adapts its next question to how you're actually doing.

**Live demo:** https://interviewiq-yb5d.onrender.com
*(hosted on Render's free tier — the backend sleeps after ~15 min idle, so the first request after a while can take 30–50s to wake up)*

InterviewIQ isn't a static question bank. It reads your resume, deep-dives one of your real projects, adjusts difficulty question-by-question based on your answers, and — at the end — cross-checks what you *claimed* on your resume against what you actually *demonstrated*, producing a per-skill confidence report with a prioritized improvement roadmap.

## Features

- **Resume parsing** — upload a PDF; an LLM extracts skills, projects, and experience (with a deterministic keyword-match fallback if no AI provider is available).
- **Company personas** — Google (algorithms/Big-O), Amazon (Leadership Principles + system design), Startup (pragmatic, project-heavy), or General (balanced full-stack).
- **Resume deep-dive** — the interview opens by picking one of your resume projects and probing its architecture and trade-offs, not a generic warm-up question.
- **Adaptive difficulty** — each answer is scored, and the next question escalates or backs off accordingly.
- **Resume truthfulness checker** — at the end of the session, claimed skills are cross-checked against what you actually demonstrated in your answers and rated 1–5.
- **Final report** — overall score, per-skill confidence with evidence, strengths, weaknesses, and a prioritized (High/Medium/Low) improvement roadmap.
- **Voice mode** — optional speech-to-text answers and text-to-speech questions via the browser's native Web Speech API.
- **Session history & score trends** — past sessions and a score-over-time chart on the dashboard.
- **Light/dark theme** with a persisted user preference.

## Tech Stack

| Layer     | Technology                                                    |
|-----------|-----------------------------------------------------------------|
| Frontend  | React 19 + Vite, React Router                                  |
| Backend   | Node.js + Express 5                                             |
| Database  | MongoDB via Mongoose, with an in-memory fallback store for local dev when Mongo isn't running |
| Auth      | JWT + bcrypt                                                    |
| AI        | Groq (primary) with Gemini as automatic fallback; model IDs are env-configurable |
| Resume parsing | `pdf-parse` + Multer for uploads                            |
| Voice     | Browser Web Speech API (SpeechRecognition / speechSynthesis)   |

## Project Structure

```
InterviewIQ/
├── client/               React + Vite frontend
│   └── src/
│       ├── pages/         Login, Register, Dashboard, ResumeUpload, InterviewSession, FinalReport
│       ├── components/    Logo, ThemeToggle, ScoreTrendChart, SessionHistoryList, PrivateRoute
│       ├── context/       AuthContext, ThemeContext
│       └── hooks/         useSpeech (STT/TTS)
├── server/               Express backend
│   └── src/
│       ├── routes/        auth, resume, session
│       ├── models/        User, Resume, Session
│       ├── services/      aiProvider (Groq/Gemini routing), gemini (resume parsing),
│       │                   adaptiveEngine (persona + question generation), report (truthfulness + final report)
│       └── db.js          Mongo connection + in-memory fallback store
└── scripts/dev.js        Launches client + server together
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm (workspaces are used — install once from the repo root)
- A MongoDB instance (optional for local dev — the app falls back to an in-memory store if Mongo isn't reachable, but data won't persist across restarts)
- At least one AI provider API key (Groq and/or Gemini) — without one, resume parsing and interview questions fall back to simpler heuristic logic

### Install

```bash
git clone https://github.com/AdityaKrishnamurthy/InterviewIQ.git
cd InterviewIQ
npm install
```

### Configure environment

Create a `.env.local` file in the repo root:

```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/interviewiq
JWT_SECRET=replace-with-a-long-random-string
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key

# Optional overrides if a provider's default model is retired/unavailable on your account
# GROQ_MODEL=openai/gpt-oss-120b
# GEMINI_MODEL=gemini-2.0-flash
```

### Run

```bash
npm run dev
```

This starts both the backend and frontend together:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000 (or whatever `PORT` is set to)

Run them individually with `npm run server` or `npm run client` if needed.

## Tests

```bash
npm test              # both suites
npm run test:server   # server only
npm run test:client   # client only
```

- **Server** (Vitest + Supertest): unit tests for the adaptive difficulty ladder, the fallback resume parser, and the fallback report scoring; integration tests hitting the real Express app against an in-memory MongoDB.
- **Client** (Vitest + Testing Library): Login form behavior and the AuthContext token lifecycle.

The first server run downloads a MongoDB binary for `mongodb-memory-server`, so it takes noticeably longer than subsequent runs. CI runs both suites and the client build on every push and PR to `main`.

## API Overview

| Method | Route                     | Description                                   |
|--------|----------------------------|------------------------------------------------|
| POST   | `/api/auth/register`       | Create an account                              |
| POST   | `/api/auth/login`          | Log in, receive a JWT                          |
| GET    | `/api/auth/me`             | Current user (auth required)                   |
| POST   | `/api/resume/upload`       | Upload and parse a resume PDF (auth required)  |
| GET    | `/api/resume/latest`       | Get the current user's latest parsed resume    |
| GET    | `/api/session/personas`    | List available company personas                |
| POST   | `/api/session/start`       | Start an interview session                      |
| POST   | `/api/session/answer`      | Submit an answer, receive the next question     |
| POST   | `/api/session/:id/complete`| End a session and trigger report generation     |
| GET    | `/api/session/:id/report`  | Fetch the final report for a session            |
| GET    | `/api/session/history`     | List the user's past sessions                   |
| GET    | `/api/session/:id`         | Fetch a single session                          |

All routes above marked "auth required" expect `Authorization: Bearer <token>`.

## Notes

- If neither `GROQ_API_KEY` nor `GEMINI_API_KEY` is set (or a configured model becomes unavailable), the app degrades gracefully to keyword-based resume parsing and a simpler scoring heuristic rather than failing outright.
- MongoDB is optional for local development but recommended for anything beyond a quick trial — the in-memory fallback does not persist across server restarts.
