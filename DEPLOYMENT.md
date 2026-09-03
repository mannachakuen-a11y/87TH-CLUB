# Deploying Mannas Dungeons

This app is **one process in production** — a Node/Express server that serves both
the REST API (`/api`), uploads (`/files`), and the compiled frontend as a single-page
app on the same origin. No separate static host or reverse proxy is required.

The two ways to run it:

| Mode | Command | What it serves | Use for |
|------|---------|----------------|---------|
| Dev | `npm run dev` + `npm run server` | Vite on `:5173` (proxies `/api`→`:8787`), API on `:8787` | local development |
| **Prod** | `npm run build` then `node server/index.js` | everything on `:8787` | deployment |

---

## 1. Preflight: what you need before you deploy

- **A Node 20+ host** (VPS, Render, Fly.io, Railway, etc.).
- **A `JWT_SECRET`** — a long random string (you generate it). Keep it secret.
- **A database** — either
  - the built-in **SQLite** (default, zero setup; a single `data/87th.sqlite` file), or
  - **Supabase Postgres** (recommended for production; you create the project and
    `supabase/schema.sql` is applied there).
- **Optionally**, keys to enable real third-party integration:
  - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `MISTRAL_API_KEY`
    → turn on the AI router.
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` →
    "Continue with Google" login + Gmail client-message sending.
  - Shopify / Stripe / GA4 / etc. keys for those integrations.

Nothing else is required — the API runs on SQLite with zero infrastructure and
honestly reports any integration that isn't configured (it never fakes it).

---

## 2. Build + run (any host)

```bash
cd 87th-club
npm install
npm run seed          # populate the integration catalog (idempotent)
npm run build         # production bundle → dist/

# Environment (set these, then run the single server)
export PORT=8787
export JWT_SECRET="$(openssl rand -hex 32)"
export DRIVER=sqlite        # or "supabase"

node server/index.js
```

`node server/index.js` now serves:
- the API under `/api`,
- uploaded files under `/files`,
- and the compiled app at `/` (with SPA fallback for deep routes like `/framework`).

Point your reverse proxy / platform at **port 8787**. That's it.

> **Uptime:** run it under a process manager so it restarts on crash and on deploy.
> With `pm2`:
> ```bash
> pm2 start server/index.js --name mannas-dungeons
> pm2 save
> ```
> Or on Render/Fly/Railway, set the **Start Command** to `node server/index.js` and the
> **Port** to `8787`.

---

## 3. Environment variables

Copy `server/.env.example` → `server/.env` (or set env vars on the host). Production
basics:

| Var | Required | Notes |
|-----|----------|-------|
| `PORT` | yes | `8787` |
| `JWT_SECRET` | **yes** | long random string; used to sign auth tokens & OAuth `state`. Change the default. |
| `DRIVER` | no | `sqlite` (default) or `supabase`. |
| `APP_ORIGIN` | no | the public origin the browser returns to after Google sign-in (e.g. `https://yourdomain.com`). |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` | no | enable the real AI router (won't be called without one). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | no | Google login + Gmail send. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | if `DRIVER=supabase` | `SUPABASE_SERVICE_ROLE_KEY` is server-only — it must never reach the browser. |

---

## 4. Using Supabase Postgres (recommended for production)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor — it creates `users`, `projects`
   (JSONB `docs`), `integrations`, `integration_tokens`, `ai_runs`, `activity_logs`,
   `assets`, `exports`, Row-Level-Security policies, a storage bucket for assets,
   and the `vector` extension.
3. Set:
   ```bash
   export DRIVER=supabase
   export SUPABASE_URL=...
   export SUPABASE_ANON_KEY=...          # public/anonymous
   export SUPABASE_SERVICE_ROLE_KEY=...  # server-only — never in the browser
   ```
4. Restart. The same repo interface backs both drivers, so nothing else changes.

---

## 5. Google OAuth (login + Gmail sending)

The app requests a real Google login flow and (once connected) can genuinely send
client emails with the stored Gmail refresh token.

1. In **Google Cloud Console**, create an **OAuth 2.0 Client ID** (Web application).
2. Add **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/google/callback`
3. Set:
   ```bash
   export GOOGLE_CLIENT_ID=...
   export GOOGLE_CLIENT_SECRET=...
   export GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   export APP_ORIGIN=https://yourdomain.com
   ```
4. Restart. The login button now completes a real Google sign-in, and Client Comms
   can send via Gmail. Without these vars it honestly reports that OAuth isn't
   configured (nothing is faked).

---

## 6. Deployment recipes

### A. Single Node process (simplest, everything on one origin)
Use a VPS / Render / Fly / Railway with the start command `node server/index.js`.
Because the frontend and API share one origin, there are no CORS or cookie/origin
problems, and `/files` (uploads) work out of the box.

### B. Split: static frontend + API host
If you prefer serving `dist/` on Vercel/Netlify and the API elsewhere, you must
**proxy `/api` and `/files` to the API host** so the browser never calls a different
origin for those paths. Create a `vercel.json`/`netlify.toml` rewrite:

```json
{ "rewrites": [
  { "source": "/api/(.*)", "destination": "https://API_HOST/api/$1" },
  { "source": "/files/(.*)", "destination": "https://API_HOST/files/$1" },
  { "source": "/(.*)", "destination": "/index.html" }
] }
```

and run `npm run server` on the API host. This is more moving parts than Option A,
which is why A is the recommended default.

---

## 7. Production checklist

- [ ] `JWT_SECRET` set to a long random value (not the dev default).
- [ ] `npm run seed` run once.
- [ ] `npm run build` run before each deploy.
- [ ] `DRIVER` chosen; Supabase schema applied if using `DRIVER=supabase`.
- [ ] API keys/OAuth only injected as **server env vars** — never committed, never in the browser.
- [ ] HTTPS via your host/reverse proxy.
- [ ] Node process supervised (`pm2`, a platform, or a systemd unit) so it restarts.
- [ ] `data/` backed up if using SQLite (or rely on Supabase if Postgres).
- [ ] Set `APP_ORIGIN` + register the callback URI if using Google login.

---

## 8. URLs (self-test after deploy)

| Check | URL |
|-------|-----|
| App loads | `https://yourdomain.com/` |
| API health | `https://yourdomain.com/api/health` → `{"ok":true,"name":"sqlite"}` |
| Sign in | in the app, or `POST /api/auth/signin` with `{name, email}` |
