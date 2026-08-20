# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and job candidates preparing for technical interviews, initially focused on campus placements. They want practice that reacts to their actual resume and actual answers, not a generic, fixed question bank.

## Product Purpose

InterviewIQ simulates a real technical interview end-to-end: upload a resume, the AI extracts projects/skills/experience from it, the candidate picks a target company persona, the AI conducts an adaptive interview, and produces a final report (per-skill confidence, strengths/weaknesses, improvement roadmap).

## Positioning

Not "an AI interview platform" but an **AI Technical Interview Agent** — the differentiator is memory, reasoning, and adaptive decision-making rather than a static question list. Concretely: a good answer escalates to a harder follow-up, a weak answer drops to fundamentals, one resume project gets a 10-15 minute deep dive (architecture, trade-offs, scaling), earlier weak points get revisited later in the same session, and resume claims get cross-checked against demonstrated knowledge.

## Operating Context

A candidate works through one continuous session per sitting: resume upload → persona/role selection → a multi-turn Q&A interview (text or voice) → a final report. Voice mode is a real, shipped feature (browser speech recognition with a server-side transcription fallback for browsers that block it) — candidates may do a full session by speaking answers aloud rather than typing.

## Capabilities and Constraints

- Resume upload (PDF) with AI-driven extraction of skills/projects/experience.
- Four company personas (Google, Amazon, Startup, General), each with a distinct interview style (algorithms-heavy, leadership/behavioral, systems/velocity, balanced full-stack).
- Adaptive difficulty (easy/medium/hard) driven by answer quality.
- Resume Truthfulness Checker producing a per-skill confidence rating.
- Interview Memory: recalls a candidate's earlier weak points later in the same session.
- Voice mode: browser-native speech-to-text/text-to-speech, with automatic server-side (Groq Whisper) fallback transcription when the browser's native engine is blocked or unsupported.
- Dual dark/light theme, persisted per user.
- JWT auth (register/login), MongoDB-backed with an in-memory fallback store for local dev.
- Deployed on Render (free tier) — the backend cold-starts after ~15 min idle.
- Candidate-facing only; no recruiter/team dashboard, no payments/subscriptions.

## Brand Commitments

- Name: **InterviewIQ** — locked, not open for change.
- Tagline: "Adaptive AI Technical Interview Agent" — an accurate positioning statement, may be restated but the underlying claim stays true.
- Logo mark: open to redesign as part of this visual overhaul.
- Palette, typography, tone of voice, and overall visual system: fully open for reconsideration.

## Evidence on Hand

No real user testimonials, case studies, usage metrics, or press exist yet. Any redesign work must not fabricate social proof, user counts, or quotes.

## Product Principles

1. Adaptivity is the product — every interaction should read as responsive to the specific candidate, not templated.
2. Honesty over flattery — the truthfulness checker and final report exist to give candidates an accurate signal, not just encouragement; the visual design should support that credibility (data-forward, not gamified/fluffy).
3. Interview-day mood, not marketing-site mood — this is a tool used under real pressure (practicing for a real interview); clarity and low cognitive load outrank decorative flourish, especially inside an active session.
4. Works under real constraints — a free-tier backend that cold-starts, and a candidate who may be on a phone; the design must hold up on a slow first load and a small screen, not just a fast desktop demo.

## Accessibility & Inclusion

WCAG 2.1 AA is an existing, documented commitment (from the current DESIGN.md) and should carry forward as a hard requirement, not a stretch goal — including keyboard navigation, sufficient contrast in both themes, accessible names for icon-only controls, and a `prefers-reduced-motion` alternative for the app's several animated states (mic listening/transcribing, waveform, score ring, theme toggle).

## Redesign Scope (recorded per user decision)

This is a **redesign of an already-shipped, in-use product** (live at the Render URL in the README), not a greenfield build. The user has explicitly authorized going beyond a re-skin: restructuring flows or copy is in scope wherever it clearly improves the result, not just visual polish. All current product capabilities above must be preserved — nothing here is being cut.
