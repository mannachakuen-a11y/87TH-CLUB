// ==================================================================
// API client for MANNAS DUNGEONS backend. Talks to the server over the
// Vite proxy (/api). Holds the Bearer token from sign-in. Every call
// is a real fetch; a short timeout keeps the UI responsive, and a
// central "online" flag lets the app fall back to local storage when
// the server isn't reachable (e.g. the in-app no-network file preview).
// ==================================================================
import type { Project } from "./types";

const BASE = "/api";
const TOKEN_KEY = "eightyseventhclub_api_token";
const TIMEOUT = 5000;

let online: boolean | null = null; // null = unknown, not yet probed

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function request(path: string, opts: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...((opts.headers as any) || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw Object.assign(new Error((data?.error) || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

export async function probe(): Promise<boolean> {
  try { const d = await withTimeout(request("/health")); online = !!d?.ok; } catch { online = false; }
  return online;
}
export function isOnline() { return online; }

// ---------- auth ----------
export async function apiSignIn(name: string, email: string): Promise<{ token: string; user: any }> {
  const d = await withTimeout(request("/auth/signin", { method: "POST", body: JSON.stringify({ name, email }) }));
  setToken(d.token);
  online = true;
  return d;
}
export async function apiBootstrap(): Promise<{ projects: Project[]; integrations: any[] }> {
  const d = await withTimeout(request("/bootstrap"), 7000);
  online = true;
  return d;
}
export async function apiSignOut() { try { await request("/auth/signout", { method: "POST" }); } catch {} setToken(null); }

// ---------- projects ----------
export async function apiSaveProject(p: Project) { return request(`/projects/${p.id}/state`, { method: "PUT", body: JSON.stringify(p) }); }
export async function apiAnalyze(id: string, body: any) { return withTimeout(request(`/projects/${id}/analyze`, { method: "POST", body: JSON.stringify(body) }), 20000); }

// ---------- AI ----------
export async function apiAsk(command: string, projectId: string) { return request("/ai/ask", { method: "POST", body: JSON.stringify({ projectId, command }) }); }

// ---------- integrations ----------
export async function apiConnect(providerId: string) { return request(`/integrations/${providerId}/connect`, { method: "POST" }); }
export async function apiTest(providerId: string) { return request(`/integrations/${providerId}/test`, { method: "POST" }); }

// ---------- email ----------
export async function apiSendEmail(payload: { to?: string; subject: string; body: string }) { return request("/email/send", { method: "POST", body: JSON.stringify(payload) }); }

// ---------- uploads ----------
export async function apiUpload(file: File): Promise<{ url: string; path: string }> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(BASE + "/upload", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
  if (!res.ok) throw new Error("upload failed");
  return res.json();
}

export { request };
