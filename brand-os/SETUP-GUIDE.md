# Mannas Dungeons — Setup & Deploy Guide (simple, step by step)

This guide takes you from **nothing** to a **working, deployed app**. It's written
for one person. Follow the steps in order and you can't go wrong.

---

## Quick answer: does it already have everything you asked for?

Here's an honest checklist of what's **built** vs. **what still needs you** (it needs
your accounts/keys, not more code).

| What you asked for | Status |
|--------------------|--------|
| Backend + real database | ✅ built (Node + SQLite, works now) |
| JWT login (private, name/email) | ✅ built |
| Google auth | 🚫 removed from the UI as you asked (old code is dormant, harmless) |
| AI router (OpenAI/Claude/Gemini) | ✅ code built — ⚠️ needs **your** API key to actually talk to them |
| Website analysis | ✅ built (real fetch + findings) |
| Uploads | ✅ built |
| Export downloads (JSON/CSV) | ✅ built |
| Client email send (Gmail) | ⚠️ code built — needs Google OAuth key, but you said forget Google, so leave off |
| Integrations Hub (Shopify, Stripe, etc.) | ✅ 18 seeded — each needs **your** key to be "real" |
| 8-outcome Framework | ✅ built |
| Cinema Studio / Design Studio / Templates / Assets / Brand Brain / AI chat / Analytics / Campaigns / Calendar / Email / Export / Book / Settings | ✅ all built |
| Sidebar navigation + big buttons + zine look | ✅ built |
| Deployment | ✅ ready (single process, below) |

**So: the app is complete and runnable.** The only things that *light up* extra
features are **API keys** (for real AI calls and real shop integrations). Without a
key it still runs — it just honestly says "not configured" instead of faking it.

---

# PART 1 — Run it on your own computer (10 min)

You need **Node.js 20+** installed. Check with `node -v`.

Open a terminal in this folder and run, one line at a time:

```bash
# 1) install dependencies (one time)
npm install

# 2) create the database & seed the 18 integrations (one time)
npm run seed

# 3) start the backend API (this builds nothing; it also serves the app)
npm run server
```

Now open a **second** terminal, same folder, and run:

```bash
npm run dev
```

Open your browser to **http://localhost:5173**, type a name, click **Enter the club**.
You're in. 🔥

- Backend + full app: **http://localhost:5173** (dev)
- API alone: **http://localhost:8787/api/health**
- The backend also serves the finished app at **http://localhost:8787** if you prefer.

> **Why two commands in dev?** `npm run dev` = the fast Vite dev server (hot reload).
> `npm run server` = the real Node backend the app talks to. Vite proxies `/api`
> requests to the backend automatically, so everything works together.

---

# PART 2 — Turn on the features you want (add keys)

All settings live in a file called **`server/.env`**. Make it first:

```bash
cp server/.env.example server/.env
```

Open `server/.env` in a text editor. Set these (leave blank anything you don't want):

### 2a. Required for a real deployment
```
JWT_SECRET=type-a-long-random-string-here
```
Any long random text is fine. This signs your login tokens — keep it secret.

### 2b. Real AI calls (OpenAI, Anthropic, Gemini)
Uncomment / fill any:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```
With one of these, the **Mannas AI** chat and the AI router actually call a model.
Without any, it returns an honest "no key configured" note (never a fake answer).

### 2c. Real integrations (Shopify, Stripe, GA4, …)
Each integration in the Hub has its own env var. Examples:
```
SHOPIFY_DOMAIN=yourstore.myshopify.com
SHOPIFY_ADMIN_TOKEN=...
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_ANALYTICS_JSON=...
```
Add what you need. Leave the rest blank — the Hub shows "available" until you add it.

### 2d. Gmail / client emails — (you said skip; only if you want it)
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```
> You chose to **forget Google auth**, so skip this unless you change your mind.

### 2e. Supabase Postgres (optional, for a "real" hosted database)
```
DRIVER=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
1. Create a free Supabase project.
2. Run the SQL from `supabase/schema.sql` in its SQL editor (a few clicks — it creates
   all tables + security).
3. Paste the three values above. Restart.

If you skip this, the app uses the built-in **SQLite** file, which is 100% fine for
a single brand/team.

---

# PART 3 — Deploy it (one process, ~5 min)

The backend **serves the whole app** in one process, so deployment is just: build
once, run the server, expose the port. No separate static host needed.

### Step 3.1 — Build the production frontend
```bash
npm run build
```
This creates a `dist/` folder with the compiled app.

### Step 3.2 — Run the single production server
```bash
node server/index.js
```
That's it. It serves:
- the API at `/api`,
- uploads at `/files`,
- the app at `/` (including deep links like `/framework`).

It listens on **port 8787** by default (change with `PORT=8080`).

> The `data/` folder (your database) is created automatically — you never need
> to `mkdir` it yourself. The config/keys live in **`server/.env`**.

> **Verify it's working:** open `http://yourserver:8787` — you'll see the app, and
> `http://yourserver:8787/api/health` returns `{"ok":true,...}`.

### Step 3.3 — Pick where to host it

**Option 0 — Render (easiest, near-one-click).** I added a **`render.yaml`** to the
repo. Push this folder to GitHub, then in Render: **New → Blueprint → connect this
repo**. It auto-builds, seeds, and runs `node server/index.js`. It reads your keys
from the Render dashboard (add `OPENAI_API_KEY`, `JWT_SECRET`, etc. there). The app
will be live at a `*.onrender.com` URL.

> ⚠️ **Free-tier note:** Render's free plan gives an ephemeral disk. If you use
> **SQLite**, your data is lost when the app redeploys/sleeps. For anything real,
> switch to **Supabase** (free) for the database — set `DRIVER=supabase` in Render
> and add the three Supabase keys. Same code, data persists.

**Option A — a VPS (simplest, full control)**
```bash
# copy this folder to your server, install Node 20+, then:
npm install
npm run seed
npm run build
JWT_SECRET="$(openssl rand -hex 32)" node server/index.js
```
Keep it running with **pm2** (auto-restart):
```bash
npm install -g pm2
pm2 start server/index.js --name mannas
pm2 save
pm2 startup          # follow the one-line command it prints
```
Then put it behind HTTPS (nginx/Caddy) and point your domain at port 8787.

**Option B — Render / Fly.io / Railway (no server to manage)**
1. Create an account, new Web Service, connect this repo.
2. **Build command:** `npm install && npm run seed && npm run build`
3. **Start command:** `node server/index.js`
4. **Environment:** add `JWT_SECRET` (and any API keys from Part 2).
5. Set the port to `8787`. Deploy. Done.

**Option C — Split frontend + API** (optional; more moving parts)
Only if you want `dist/` on Vercel/Netlify and the API elsewhere. You'd have to
rewrite `/api` and `/files` to the API host. **Recommend Option A or B instead** —
single origin means no CORS, no cookie problems, uploads just work.

---

# PART 4 — The 3-step "remember this"

```bash
npm install        # once
npm run seed       # once, sets up the database
npm run build      # before every deploy
node server/index.js   # run (or let pm2/host run it)
```
Everything else (settings, keys) lives in **`server/.env`**.

---

## Troubleshooting

- **"npm: command not found"** → install Node.js 20+ and open a new terminal.
- **Port already in use** → `PORT=8080 node server/index.js` and use that port.
- **Login says "offline mode"** → the backend isn't running. Start `npm run server`.
- **AI says "no key configured"** → add `OPENAI_API_KEY` (or others) to `server/.env`,
  restart `npm run server`.
- **Integrations show "available"** → they need their own key/env var (Part 2c).
- **After editing `server/.env`, restart the server** for changes to apply.
- **I see "MANNAS…" cut off in the sidebar** → that's intentional ellipsis on small
  screens; the wordmark is fine on desktop.

## Files you'll touch

| File | Purpose |
|------|---------|
| `server/.env` | **all your settings/keys** (never commit this) |
| `server/.env.example` | template showing every option |
| `supabase/schema.sql` | Supabase tables (only if using Supabase) |
| `README.md` | feature overview |
| `DEPLOYMENT.md` | earlier, more detailed deploy internals |
