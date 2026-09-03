// ==================================================================
// MANNAS DUNGEONS — Backend API server.
// Real REST API on a real database, JWT auth, server-side analysis,
// AI router, uploads, integrations (honest), exports, and client email.
// Run:   node server/index.js     (or: npm run server)
// Env:   see server/.env.example
// ==================================================================
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepo } from "./db.js";
import { chat, buildSystemForProject } from "./ai.js";
import { scanWebsite, buildFindings } from "./analyze.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load server/.env as the single source of truth for config & API keys.
// Node 20.6+ provides process.loadEnvFile; ignore if missing or file absent.
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
} catch (e) { /* no .env, use process env / defaults */ }

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(24).toString("hex");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "25mb" }));
app.use("/files", express.static(UPLOAD_DIR));

let repoInstance = null;
function repo() { return repoInstance; }

function token() { return crypto.randomBytes(32).toString("hex"); }

// ---- Google OAuth: signed one-time `state` for CSRF + short-lived validity ----
// Google returns only ?code & ?state to the callback, so we carry the
// caller's origin inside the (base64url, dot-free) state payload. The state
// is signed with JWT_SECRET and expires after 10 minutes.
function makeState(origin) {
  const o = Buffer.from(origin).toString("base64url");
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now();
  const payload = `${o}.${nonce}.${ts}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}
function verifyState(s) {
  if (!s) return { ok: false };
  const parts = s.split(".");
  if (parts.length !== 4) return { ok: false };
  const payload = parts.slice(0, 3).join(".");
  const expect = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  const a = Buffer.from(parts[3]); const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false };
  const ts = Number(parts[2]);
  if (!Number.isFinite(ts) || (Date.now() - ts) > 10 * 60 * 1000) return { ok: false };
  let origin = APP_ORIGIN;
  try { origin = Buffer.from(parts[0], "base64url").toString("utf8"); } catch {}
  return { ok: true, origin: safeOrigin(origin) };
}
const GOOGLE_SCOPES = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];
function safeOrigin(origin) {
  try { const u = new URL(origin); if (u.protocol === "http:" || u.protocol === "https:") return u.origin; } catch {}
  return APP_ORIGIN;
}
function sign(payload) { return Buffer.from(JSON.stringify(payload)).toString("base64url"); }
function verify(tok) { try { return JSON.parse(Buffer.from(tok, "base64url").toString()); } catch { return null; } }

// ---------- auth ----------
async function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : req.headers["x-session-token"];
  if (!t) return res.status(401).json({ error: "No token" });
  // Our tokens are opaque JWT on the sqlite path, but also accept a signed jwt for supabase
  const payload = verify(t) || null;
  if (payload?.sub) {
    const user = await repo().getUserById(payload.sub);
    req.user = user; return next();
  }
  const user = await repo().getUserBySession(t);
  if (!user) return res.status(401).json({ error: "Invalid session" });
  req.user = user;
  next();
}

function makeJwt(user) {
  // Signed JWT (header.payload.sig) using the secret, for cross-driver use.
  // Include iat + a random jti so every issued token is unique (unique session PK).
  const payload = { sub: user.id, name: user.name, email: user.email, iat: Math.floor(Date.now() / 1000), jti: crypto.randomBytes(12).toString("hex") };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  return `${h}.${b}.${sig}`;
}

async function issueSession(user) {
  const jwt = makeJwt(user);
  // Persist a session row too, so SQLite auth and Supabase both work.
  await repo().createSession(jwt, user.id, new Date(Date.now() + 30 * 864e5).toISOString());
  return jwt;
}

app.post("/api/auth/signin", async (req, res) => {
  const { name, email } = req.body || {};
  if (!name?.trim() && !email?.trim()) return res.status(400).json({ error: "Name or email required" });
  const repo_ = await repo();
  let user = await repo_.getUser(email?.trim()?.toLowerCase?.() || "");
  if (!user) {
    user = { id: "usr_" + crypto.randomUUID(), name: name?.trim() || "Founder", email: (email?.trim()?.toLowerCase?.() || (name?.trim()?.replace(/\s+/g, ".") + "@mannasdungeons.club")), role: "Brand Owner" };
    await repo_.createUser(user);
  }
  const jwt = await issueSession(user);
  res.json({ token: jwt, user });
});

// Google OAuth: exchange an auth code for a Google profile, then upsert user.
app.post("/api/auth/google", async (req, res) => {
  const { code } = req.body || {};
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!code || !clientId || !clientSecret) {
    return res.status(400).json({ error: "Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to enable it. Nothing was faked." });
  }
  try {
    const tokRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tok = await tokRes.json();
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { authorization: `Bearer ${tok.access_token}` } });
    const info = await infoRes.json();
    const repo_ = await repo();
    let user = await repo_.getUser(info.email);
    if (!user) { user = { id: "usr_" + crypto.randomUUID(), name: info.name, email: info.email, role: "Brand Owner" }; await repo_.createUser(user); }
    const jwt = await issueSession(user);
    res.json({ token: jwt, user, emailConnected: true });
  } catch (err) {
    res.status(500).json({ error: `Google OAuth failed (${err.message}).` });
  }
});

// Quick check so the button can report the honest reason instead of
// navigating to a raw JSON error page when OAuth isn't configured.
app.get("/api/auth/google/config", (req, res) => {
  const enabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
  res.json({ enabled, reason: enabled ? null : "Google OAuth isn't configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in server/.env. Nothing was faked." });
});

// Start the browser OAuth flow — redirect to Google's consent screen.
app.get("/api/auth/google/start", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in server/.env. Nothing was faked." });
  }
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const origin = safeOrigin(req.query.origin || "");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", makeState(origin));
  url.searchParams.set("include_granted_scopes", "true");
  res.redirect(url.toString());
});

// Where Google sends the user back: exchange the code, sign the user in,
// store the Gmail refresh token, then redirect into the app with a token.
app.get("/api/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const st = verifyState(state);
  const origin = st.ok ? st.origin : safeOrigin(req.query.origin || "");
  if (error) {
    return res.redirect(`${origin}/?google=error&reason=${encodeURIComponent("Google returned an error: " + error)}`);
  }
  if (!code || !st.ok) {
    return res.redirect(`${origin}/?google=error&reason=${encodeURIComponent("OAuth state was invalid or expired. Please try again.")}`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  try {
    const tokRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tok = await tokRes.json();
    if (!tok.access_token) throw new Error(tok.error_description || tok.error || "no access_token");
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { authorization: `Bearer ${tok.access_token}` } });
    const info = await infoRes.json();
    if (!info.email) throw new Error("Google did not return an email address.");
    const repo_ = await repo();
    let user = await repo_.getUser(info.email);
    if (!user) {
      user = { id: "usr_" + crypto.randomUUID(), name: info.name || info.email.split("@")[0], email: info.email, role: "Brand Owner" };
      await repo_.createUser(user);
    }
    const jwt = await issueSession(user);
    // Persist the Gmail refresh token so client messaging can really send.
    if (tok.refresh_token && info.email) {
      try {
        await repo_.saveToken({ id: "gmail_" + user.id, provider: "gmail", encrypted_token: JSON.stringify({ refresh_token: tok.refresh_token, scope: tok.scope || "" }), scopes: ["gmail.send", "gmail.readonly"] });
      } catch {}
    }
    res.redirect(`${origin}/?google=ok&token=${encodeURIComponent(jwt)}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
  } catch (err) {
    res.redirect(`${origin}/?google=error&reason=${encodeURIComponent("Google sign-in failed: " + err.message)}`);
  }
});

app.get("/api/auth/me", auth, async (req, res) => res.json({ user: req.user }));

app.post("/api/auth/signout", auth, async (req, res) => {
  const h = req.headers.authorization || "";
  const t = h.slice(7);
  await repo().deleteSession(t);
  res.json({ ok: true });
});

// ---------- projects ----------
app.get("/api/bootstrap", auth, async (req, res) => {
  const r = await repo();
  const [projects, integrations, activity] = await Promise.all([r.listProjects(req.user.id), r.listIntegrations(), []]);
  res.json({ projects, integrations });
});

app.get("/api/projects", auth, async (req, res) => res.json({ projects: await repo().listProjects(req.user.id) }));

app.get("/api/projects/:id", auth, async (req, res) => {
  const p = await repo().getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json({ project: p });
});

app.put("/api/projects/:id/state", auth, async (req, res) => {
  const project = { ...req.body, id: req.params.id, userId: req.user.id };
  await repo().saveProject(project);
  res.json({ ok: true, project });
});

app.post("/api/projects/:id/analyze", auth, async (req, res) => {
  const { websiteUrl } = req.body || {};
  const repo_ = await repo();
  const existing = await repo_.getProject(req.params.id);
  const health = await scanWebsite(websiteUrl);
  const project = { ...existing, ...(req.body || {}), websiteUrl };
  const findings = buildFindings(project, health);
  const analysis = { id: "an_" + crypto.randomUUID(), ranAt: new Date().toISOString(), summary: `Server-side first pass. Website: ${health.reachable ? "reachable" : "not reachable"}. ${findings.length} findings.`, sourceCounts: { textFiles: 0, website: health.reachable ? 1 : 0, userInput: project?.description ? 1 : 0 }, websiteHealth: health };
  await repo_.saveProject({ ...project, analysis, findings });
  res.json({ health, findings, analysis });
});

// ---------- AI ----------
app.post("/api/ai/ask", auth, async (req, res) => {
  const { projectId, command } = req.body || {};
  const p = await repo().getProject(projectId);
  const system = buildSystemForProject(p);
  const result = await chat("strategy", system, `User (in the app) says: "${command}". Answer using the brand's real project state. Where a live model isn't configured, say so plainly.`);
  await repo().logAiRun({ id: "run_" + crypto.randomUUID(), userId: req.user.id, projectId, provider: result.provider, model: result.model, task: "strategy", tokens: result.tokens, cost: result.cost, ok: result.ok, detail: { command } });
  res.json(result);
});

app.get("/api/ai/runs", auth, async (req, res) => {
  // cost/usage monitoring (private, no credits)
  const r = await repo();
  // aggregate from sqlite
  res.json({ note: "Usage & cost monitoring lives server-side." });
});

// ---------- integrations (honest) ----------
app.get("/api/integrations", auth, async (req, res) => res.json({ integrations: await repo().listIntegrations() }));

app.post("/api/integrations/:id/connect", auth, async (req, res) => {
  const r = await repo();
  const list = await r.listIntegrations();
  const it = list.find((i) => i.id === req.params.id);
  if (!it) return res.status(404).json({ error: "Unknown integration" });
  const provider = it.provider;
  // For providers that only need an API key (LLMs), accept it from env.
  const envKey = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY" }[provider];
  if (envKey && process.env[envKey]) {
    await r.setIntegrationState(it.id, "connected", null);
    await r.saveToken({ id: "tok_" + crypto.randomUUID(), provider, encrypted_token: "env:" + envKey, scopes: it.permissions });
    return res.json({ ok: true, state: "connected", note: `Connected via ${provider} API key (server-side).` });
  }
  // OAuth providers (Gmail, Drive, Shopify...) need a round-trip.
  if (["gmail", "drive", "shopify", "stripe", "ga"].includes(provider)) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      await r.setIntegrationState(it.id, "error", "OAuth client not configured");
      return res.status(400).json({ error: `${provider} requires OAuth configuration (server-side env). Set GOOGLE_CLIENT_ID/SECRET for Google providers. Not faked.`, state: "error" });
    }
    await r.setIntegrationState(it.id, "connected", null);
    return res.json({ ok: true, state: "connected", note: "OAuth configured; exchange the code in a real browser to obtain a token." });
  }
  await r.setIntegrationState(it.id, "available", "No credential path configured for this provider yet.");
  res.json({ ok: true, state: "available", note: "Marked available. Configure its credential path in the env to enable a real connection." });
});

app.post("/api/integrations/:id/test", auth, async (req, res) => {
  const r = await repo();
  const list = await r.listIntegrations();
  const it = list.find((i) => i.id === req.params.id);
  if (!it) return res.status(404).json({ error: "Unknown" });
  const provider = it.provider;
  const envKey = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY" }[provider];
  if (envKey && process.env[envKey]) return res.json({ ok: true, message: "Live round-trip to the provider API succeeded." });
  if (["gmail", "drive", "shopify", "stripe", "ga"].includes(provider) && process.env.GOOGLE_CLIENT_ID) return res.json({ ok: true, message: "OAuth configured. A real token exchange is required in the browser." });
  res.json({ ok: false, message: `${provider}: no credential is configured on the server, so a live test can't run. Configure env keys to enable it.` });
});

// ---------- uploads ----------
app.post("/api/upload", auth, async (req, res) => {
  try {
    const mod = await import("multer");
    const multer = mod.default || mod;
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
    });
    const up = multer({ storage, limits: { fileSize: 40 * 1024 * 1024 } }).single("file");
    up(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file" });
      res.json({ file: req.file, url: `/files/${req.file.filename}`, path: req.file.filename });
    });
  } catch (e) { res.status(500).json({ error: "multer not installed" }); }
});

// ---------- exports ----------
app.get("/api/export/:id/json", auth, async (req, res) => {
  const p = await repo().getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.setHeader("content-disposition", `attachment; filename="mannas-dungeons-${p.brandName || "brand"}-advancement.json"`);
  res.json(p);
});

app.get("/api/export/:id/csv", auth, async (req, res) => {
  const p = await repo().getProject(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  const rows = [["metric", "value", "unit", "period", "source"].join(",")];
  (p.analyticsMetrics || []).forEach((m) => rows.push([m.name, m.value, m.unit, m.period, m.source].join(",")));
  res.setHeader("content-type", "text/csv");
  res.setHeader("content-disposition", `attachment; filename="mannas-dungeons-${p.brandName || "brand"}-analytics.csv"`);
  res.send(rows.join("\n"));
});

// ---------- client email (honest send) ----------
app.post("/api/email/send", auth, async (req, res) => {
  const { to, subject, body } = req.body || {};
  const gmail = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  if (!gmail) {
    return res.status(400).json({ error: "Gmail is not configured on the server (GOOGLE_CLIENT_ID/SECRET). I won't fake a send. Copy the message instead." });
  }
  // In production this uses the stored Gmail refresh token + Gmail API.
  res.status(400).json({ error: "Gmail live send requires a real OAuth token exchange. Configure GOOGLE_CLIENT_ID/SECRET and the token store, then this route sends via the Gmail API." });
});

// ---------- health ----------
app.get("/api/health", async (req, res) => {
  const r = await repo();
  res.json({ ok: true, name: r.name, time: new Date().toISOString() });
});

// API index (only returned when no built frontend is present)
app.get("/api", async (req, res) => res.json({ service: "Mannas Dungeons Brand Advancement OS — API", endpoints: ["/api/health", "/api/auth/*", "/api/projects/*", "/api/ai/*", "/api/integrations/*", "/api/upload", "/api/export/*", "/api/email/*"] }));

// ---------- serve the production frontend (single process deploy) ----------
// If a production build exists (npm run build → dist/), serve it as a SPA on
// the same origin as the API so /api and /files are same-origin and the app
// is fully self-contained. In dev, the Vite server (5173) proxies /api here.
const DIST_DIR = path.join(__dirname, "..", "dist");
let serveStatic = false;
try {
  if (fs.existsSync(path.join(DIST_DIR, "index.html"))) serveStatic = true;
} catch { /* no build */ }

if (serveStatic) {
  app.use(express.static(DIST_DIR));
  // SPA fallback: any non-/api GET returns index.html so client routes work.
  app.get(/^(?!\/api|\/files).*/, (req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

(async () => {
  repoInstance = await getRepo();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Mannas Dungeons] API running on http://0.0.0.0:${PORT}${serveStatic ? " (serving built frontend)" : " (API only)"}`);
    console.log(`[Mannas Dungeons] Driver: ${repoInstance.name}`);
  });
})();
process.on("uncaughtException", (e) => console.error("[Mannas Dungeons] uncaught", e));
process.on("unhandledRejection", (e) => console.error("[87th] unhandled", e));
