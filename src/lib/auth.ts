// Private-first local authentication with a REAL backend session.
// On sign-in we also create a server session (JWT) so the app can sync
// project state to the API. If the API is unreachable we stay in local
// mode; everything still works, and state syncs out when it recovers.
import { apiSignIn, getToken, setToken, probe } from "./api";

const USER_KEY = "eightyseventhclub_user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function read(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

let user: User | null = read();
const listeners = new Set<() => void>();

export function getUser(): User | null {
  return user;
}
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeUser(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function signIn(name: string, email: string): Promise<{ backend: boolean }> {
  const email2 = email || name.toLowerCase().replace(/\s+/g, ".") + "@mannasdungeons.club";
  // Local session (always)
  user = {
    id: "usr_local",
    name,
    email: email2,
    role: "Founder / Brand Owner",
    createdAt: new Date().toISOString(),
  };
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  notify();

  // Best-effort real backend session.
  let backend = false;
  try {
    probe();
    const r = await apiSignIn(name, email2);
    if (r?.token) { setToken(r.token); backend = true; }
  } catch {
    backend = false;
  }
  return { backend };
}

export function signOut() {
  user = null;
  try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  setToken(null);
  notify();
}

export function useUser() {
  return { user, signIn, signOut, subscribeUser };
}
