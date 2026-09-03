// ==================================================================
// Database layer. Two drivers behind one repository interface:
//   DRIVER=sqlite  (default) — real on-disk SQL, zero external deps.
//   DRIVER=supabase          — PostgreSQL via @supabase/supabase-js,
//                              activated when SUPABASE_URL + keys exist.
// The app is Supabase-ready: the same repo methods are used either
// way, and supabase/schema.sql contains the full DDL.
// ==================================================================
import betterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_FILE = process.env.DB_FILE || "data/87th.sqlite";

function now() {
  return new Date().toISOString();
}

// ------------------------------------------------------------------
// LOCAL (better-sqlite3) driver
// ------------------------------------------------------------------
function sqliteDriver(file) {
  // Ensure the containing directory exists (autocreated on fresh hosts).
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch { /* ignore */ }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT, email TEXT, role TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT, created_at TEXT, expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, user_id TEXT, brand_name TEXT, industry TEXT,
      market TEXT, status TEXT, current_outcome INTEGER, progress INTEGER,
      docs TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY, provider TEXT, name TEXT, state TEXT,
      capabilities TEXT, permissions TEXT, error TEXT, last_sync TEXT
    );
    CREATE TABLE IF NOT EXISTS integration_tokens (
      id TEXT PRIMARY KEY, provider TEXT, encrypted_token TEXT, scopes TEXT,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_runs (
      id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, provider TEXT,
      model TEXT, task TEXT, tokens INTEGER, cost REAL, ok INTEGER,
      detail TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, actor TEXT,
      type TEXT, text TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, name TEXT,
      kind TEXT, scope TEXT, tags TEXT, favorite INTEGER, approved INTEGER,
      path TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, kind TEXT,
      format TEXT, path TEXT, created_at TEXT
    );
  `);

  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);

  const parse = (o) => (o && o.docs ? JSON.parse(o.docs) : o);

  return {
    name: "sqlite",
    async init() {},
    async createUser(u) { run("INSERT OR REPLACE INTO users VALUES (?,?,?,?,?)", u.id, u.name, u.email, u.role, now()); },
    async getUser(email) { return get("SELECT * FROM users WHERE email = ?", email); },
    async getUserById(id) { return get("SELECT * FROM users WHERE id = ?", id); },
    async createSession(token, userId, expires) { run("INSERT INTO sessions VALUES (?,?,?,?)", token, userId, now(), expires); },
    async getUserBySession(token) { const s = get("SELECT * FROM sessions WHERE token = ? AND expires_at > ?", token, now()); if (!s) return null; return get("SELECT * FROM users WHERE id = ?", s.user_id); },
    async deleteSession(token) { run("DELETE FROM sessions WHERE token = ?", token); },
    async saveProject(p) {
      run("INSERT OR REPLACE INTO projects (id,user_id,brand_name,industry,market,status,current_outcome,progress,docs,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        p.id, p.userId, p.brandName, p.industry, p.market, p.status, p.currentOutcomeId, p.progress || 0, JSON.stringify(p), p.createdAt, p.updatedAt);
    },
    async getProject(id) { return parse(get("SELECT * FROM projects WHERE id = ?", id)); },
    async listProjects(userId) { return all("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC", userId).map(parse); },
    async deleteProject(id) { run("DELETE FROM projects WHERE id = ?", id); },
    async listIntegrations() { return all("SELECT * FROM integrations"); },
    async saveIntegration(i) { run("INSERT OR REPLACE INTO integrations (id,provider,name,state,capabilities,permissions,error,last_sync) VALUES (?,?,?,?,?,?,?,?)", i.id, i.provider, i.name, i.state, JSON.stringify(i.capabilities), JSON.stringify(i.permissions), i.error || null, i.lastSync || null); },
    async setIntegrationState(id, state, error) { run("UPDATE integrations SET state = ?, error = ?, last_sync = ? WHERE id = ?", state, error || null, now(), id); },
    async saveToken(t) { run("INSERT OR REPLACE INTO integration_tokens VALUES (?,?,?,?,?,?)", t.id, t.provider, t.encrypted_token, JSON.stringify(t.scopes || []), now(), now()); },
    async getToken(provider) { return get("SELECT * FROM integration_tokens WHERE provider = ?", provider); },
    async logAiRun(r) { run("INSERT INTO ai_runs (id,user_id,project_id,provider,model,task,tokens,cost,ok,detail,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", r.id, r.userId, r.projectId, r.provider, r.model, r.task, r.tokens || 0, r.cost || 0, r.ok ? 1 : 0, JSON.stringify(r.detail || {}), now()); },
    async logActivity(a) { run("INSERT INTO activity_logs (id,user_id,project_id,actor,type,text,created_at) VALUES (?,?,?,?,?,?,?)", a.id, a.userId, a.projectId, a.actor, a.type, a.text, now()); },
    async listActivity(projectId) { return all("SELECT * FROM activity_logs WHERE project_id = ? ORDER BY created_at DESC", projectId); },
    async saveAsset(a) { run("INSERT OR REPLACE INTO assets (id,user_id,project_id,name,kind,scope,tags,favorite,approved,path,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", a.id, a.userId, a.projectId || null, a.name, a.kind, a.scope, JSON.stringify(a.tags || []), a.favorite ? 1 : 0, a.approved ? 1 : 0, a.path || null, now()); },
    async listAssets() { return all("SELECT * FROM assets ORDER BY created_at DESC"); },
    async saveExport(e) { run("INSERT INTO exports (id,user_id,project_id,kind,format,path,created_at) VALUES (?,?,?,?,?,?,?)", e.id, e.userId, e.projectId, e.kind, e.format, e.path, now()); },
  };
}

// ------------------------------------------------------------------
// SUPABASE (Postgres via @supabase/supabase-js) driver
// ------------------------------------------------------------------
function supabaseDriver() {
  let client;
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || serviceKey;
  client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  // Use service role for writes when available (server-side only).
  const admin = serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : client;

  const table = (name) => admin.from(name);
  return {
    name: "supabase",
    async init() {},
    async createUser(u) { await table("users").upsert({ id: u.id, name: u.name, email: u.email, role: u.role }); },
    async getUser(email) { const { data } = await table("users").select("*").eq("email", email).maybeSingle(); return data || null; },
    async getUserById(id) { const { data } = await table("users").select("*").eq("id", id).maybeSingle(); return data || null; },
    async createSession(token, userId, expires) { await table("sessions").insert({ token, user_id: userId, expires_at: expires }); },
    async getUserBySession(token) { const { data } = await table("sessions").select("*, users(*)").eq("token", token).gte("expires_at", now()).maybeSingle(); return data?.users || null; },
    async deleteSession(token) { await table("sessions").delete().eq("token", token); },
    async saveProject(p) { await table("projects").upsert({ id: p.id, user_id: p.userId, brand_name: p.brandName, industry: p.industry, market: p.market, status: p.status, current_outcome: p.currentOutcomeId, progress: p.progress || 0, docs: p, updated_at: now() }); },
    async getProject(id) { const { data } = await table("projects").select("*").eq("id", id).maybeSingle(); return data?.docs || data || null; },
    async listProjects(userId) { const { data } = await table("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }); return (data || []).map((r) => r.docs || r); },
    async deleteProject(id) { await table("projects").delete().eq("id", id); },
    async listIntegrations() { const { data } = await table("integrations").select("*"); return data || []; },
    async saveIntegration(i) { await table("integrations").upsert({ id: i.id, provider: i.provider, name: i.name, state: i.state, capabilities: i.capabilities, permissions: i.permissions, error: i.error, last_sync: i.lastSync }); },
    async setIntegrationState(id, state, error) { await table("integrations").update({ state, error, last_sync: now() }).eq("id", id); },
    async saveToken(t) { await table("integration_tokens").upsert({ id: t.id, provider: t.provider, encrypted_token: t.encrypted_token, scopes: t.scopes || [] }); },
    async getToken(provider) { const { data } = await table("integration_tokens").select("*").eq("provider", provider).maybeSingle(); return data || null; },
    async logAiRun(r) { await table("ai_runs").insert({ id: r.id, user_id: r.userId, project_id: r.projectId, provider: r.provider, model: r.model, task: r.task, tokens: r.tokens || 0, cost: r.cost || 0, ok: r.ok, detail: r.detail || {} }); },
    async logActivity(a) { await table("activity_logs").insert({ id: a.id, user_id: a.userId, project_id: a.projectId, actor: a.actor, type: a.type, text: a.text }); },
    async listActivity(projectId) { const { data } = await table("activity_logs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }); return data || []; },
    async saveAsset(a) { await table("assets").upsert({ id: a.id, user_id: a.userId, project_id: a.projectId, name: a.name, kind: a.kind, scope: a.scope, tags: a.tags || [], favorite: a.favorite, approved: a.approved, path: a.path }); },
    async listAssets() { const { data } = await table("assets").select("*").order("created_at", { ascending: false }); return data || []; },
    async saveExport(e) { await table("exports").insert({ id: e.id, user_id: e.userId, project_id: e.projectId, kind: e.kind, format: e.format, path: e.path }); },
  };
}

let repo;
export async function getRepo() {
  if (repo) return repo;
  const driver = (process.env.DRIVER || process.env.DB_DRIVER || "sqlite").toLowerCase();
  if (driver === "supabase") {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error("DRIVER=supabase requires SUPABASE_URL and SUPABASE_ANON_KEY (+ optionally SUPABASE_SERVICE_ROLE_KEY).");
    }
    repo = supabaseDriver();
  } else {
    repo = sqliteDriver(DB_FILE);
  }
  await repo.init();
  return repo;
}
