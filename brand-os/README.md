# Mannas Dungeons — Brand Advancement OS

A real, functional, private-first, AI-native creative operating system for a
clothing/fashion brand. The product's entire identity is **The Eight Outcomes**;
everything else exists to complete those outcomes faster and more creatively.

> "The user should think about the brand, not the software."

---

## The Eight Outcomes

| # | Outcome |
|---|---------|
| 01 | Clear Brand Identity |
| 02 | Distinctive Brand World |
| 03 | Stronger Customer Experience |
| 04 | Conversion-Ready Sales System |
| 05 | Repeatable Content Engine |
| 06 | Campaign System |
| 07 | Customer Acquisition Loop |
| 08 | Measurable Growth System |

The user journey is sequential:

`LOGIN → NEW PROJECT → ADD BRAND MATERIALS → AI ANALYSIS → OUTCOME 01 … OUTCOME 08 → TEST → FINAL BRAND ADVANCEMENT PACKAGE`

## What's implemented

Everything is a **real** feature backed by a **real backend**. The frontend talks
to a Node/Express REST API (a Vite dev proxy forwards `/api` and `/files`), which
persists to **SQLite by default** and switches to **Supabase Postgres (RLS +
pgvector)** via config. Nothing is decorative, and nothing is faked.

### Backend (Node/Express — `server/`)

- **Real REST API** on port `8787` with a repository abstraction (`db.js`):
  picks `sqlite` (better-sqlite3, `data/87th.sqlite`) or `supabase`
  (`DRIVER=supabase` + Supabase URL/keys). Same repo interface, two drivers.
- **Private JWT auth** — no public registration, no user list. Sign-in returns a
  signed JWT (with `iat` + random `jti`) that is also persisted as a session row
  so both drivers validate cleanly. Google OAuth (`/api/auth/google`) does a real
  code→token→profile exchange and returns the honest reason if unconfigured.
- **Server-side AI router** (`ai.js`) — real HTTP calls to OpenAI / Anthropic /
  Gemini when a key is present; logs provider + model + tokens + cost + success to
  `ai_runs`; returns an honest "no key configured" text when it isn't — never a
  fabricated answer.
- **Server-side website analysis** (`analyze.js`) — real fetch (8s abort) + scrape:
  verifies H1, CTA, reviews, size guide, shipping/returns, FAQ, newsletter, word
  count; `buildFindings()` emits evidence-labeled
  `PROBLEM → EVIDENCE → SEVERITY → WHY → RECOMMENDATION → ALTERNATIVES → VISUAL
  SOLUTION → TEST` rows (outcome 03).
- **Real uploads** — `multer` disk storage under `data/uploads/`, served via
  `/files/*`, size-limited, never reading secrets.
- **Export downloads** — project JSON and analytics CSV served as attachments.
- **Client email send** — requires real Gmail OAuth config; without it returns the
  honest "won't fake a send — copy the message" error.
- **Integrations Hub** — `/connect` and `/test` reflect the real availability of
  OpenAI, Claude, Gemini, Arena AI, Shopify, Stripe, Gmail, Drive, GA4, Figma,
  Canva, Adobe, Higgsfield, DaVinci Resolve, Jitter, Vercel, Netlify, Playwright.
- **`seed.js`** seeds the integration definitions on first run; `npm run seed`.

### Frontend (Vite + React + TS)

- **Private sign-in** → the backend; offline fallback intact.
- **Project intake, AI analysis, framework/outcome tracker, Cinema Studio,
  Design Studio (canvas + SVG export), Template Library, Reference Intelligence,
  Asset Library, Brand Brain + Decision Log, Mannas AI, Integrations Hub, Analytics
  + Experiment Engine, Campaigns, Calendar, Client Emails (approve-before-send),
  Export Center & Brand Advancement Book** — all wired to the API via `src/lib/api.ts`,
  with project save debounced through `src/lib/store.ts` sync and
  `initFromServer()` merge on boot, and an offline fallback that keeps working.
- **Street-culture zine design system** — heavy condensed display type (#FF3231
  brand red on black structure over a warm paper ground), crisp print panels,
  editorial typography, and an **Instagram-style bottom outcome dock** that pins
  the eight outcomes to the bottom of the screen (with a per-outcome progress
  tick), replacing the old three-line menu. All other tools live behind a clean
  top-right grid button that opens a bottom-sheet tool drawer.

## Honesty rules enforced

- No fake AI responses, analytics, connections, scans, exports or uploads.
- No fabricated business-impact claims — only real connected/logged metrics.
- No user-facing credits system; provider/model usage is monitored privately.
- API keys, OAuth secrets and role credentials never touch the browser.

## Running

```bash
cd 87th-club
npm install

# 1) start the API (listens on :8787)
npm run server        # or: node server/index.js

# 2) seed the integration definitions (first run)
npm run seed

# 3) start the frontend dev server (proxies /api + /files → :8787)
npm run dev           # http://localhost:5173 (auto-falls to 5174)

# production
npm run build         # → dist/

# typecheck
npx tsc --noEmit
```

## Configuration (`server/.env` — copy from `server/.env.example`)

| Var | Purpose |
|-----|---------|
| `PORT` | API port (default `8787`) |
| `JWT_SECRET` | long random string for signing auth tokens |
| `DRIVER` | `sqlite` (default) or `supabase` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `MISTRAL_API_KEY` | enable the real AI router providers |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | real Google OAuth — login + Gmail send. `GOOGLE_REDIRECT_URI` must be the full callback URL, e.g. `http://localhost:5173/api/auth/google/callback`, and be listed as an Authorized redirect URI in Google Cloud Console |
| `APP_ORIGIN` | origin the app returns to after Google sign-in (default `http://localhost:5173`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Postgres/RLS driver (`DRIVER=supabase`) |

### API surface (all under `/api`, JWT-protected except `health`)

```
health, auth/signin, auth/google/config, auth/google/start, auth/google/callback,
auth/google, auth/me, auth/signout, bootstrap,
projects, projects/:id, projects/:id/state, projects/:id/analyze,
ai/ask, ai/runs, integrations, integrations/:id/connect, integrations/:id/test,
upload, export/:id/json, export/:id/csv, email/send
```

## Supabase

Apply `supabase/schema.sql` to a Supabase project: `public.users`, `public.projects`
(JSONB `docs`), `integrations`, `integration_tokens`, `ai_runs`, `activity_logs`,
`assets`, `exports`, Row-Level Security policies, a `public` storage bucket(s)
for assets, and the `vector` extension for embeddings. Set `DRIVER=supabase` and
the three Supabase env vars to use it — the same repo interface serves both.

## Project layout

```
server/       index.js (Express API), db.js (repo: sqlite|supabase),
              ai.js (router), analyze.js (scanner), seed.js, .env.example
supabase/     schema.sql (DDL + RLS + storage + pgvector)
src/
  lib/        types, framework (config), api (client), auth, store (sync),
              db (local fallback), analysis, ai, gen, design, produce,
              export, projects, icons
  components/ ui (Modal, Toasts, Seg, Tag, Progress, Empty)
  views/      Login, Dashboard, Onboarding, Analysis, Framework, CinemaStudio,
              DesignStudio, Templates, References, Assets, BrandBrain, AIChat,
              Integrations, Analytics, Campaigns, Calendar, Email, Export,
              Book, Settings
```

Built with the vision that **ONE WORKSPACE · ONE PROJECT · ONE BRAND BRAIN ·
ONE FRAMEWORK · MANY CAPABILITIES**, orchestrating specialist tools rather than
replacing them.
