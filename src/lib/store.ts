import { useSyncExternalStore } from "react";
import { getState, subscribe, save, getActiveProjectId, setActiveProjectId, uid } from "./db";
import type { AppState, Project, ID, StepStatus, Activity } from "./types";
import { getToken, apiSaveProject, apiBootstrap, isOnline } from "./api";

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ----- reactive helper for the active project id -----
let activeListeners = new Set<() => void>();
function notifyActive() {
  activeListeners.forEach((l) => l());
}
export function useActiveProjectId(): ID | null {
  return useSyncExternalStore(
    (cb) => {
      activeListeners.add(cb);
      return () => activeListeners.delete(cb);
    },
    () => getActiveProjectId(),
    () => getActiveProjectId(),
  );
}

export function selectProject(state: AppState, id: ID): Project | undefined {
  return state.projects.find((p) => p.id === id);
}

// ---- mutations that persist ----
export function setActive(id: ID | null) {
  setActiveProjectId(id);
  notifyActive();
}

export function log(projectId: ID, actor: Activity["actor"], type: string, text: string) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.projectLog.unshift({ id: uid("log"), actor, type, text, createdAt: new Date().toISOString() });
  p.updatedAt = new Date().toISOString();
  save();
}

export function updateProject(patch: Partial<Project>) {
  const s = getState();
  const p = s.projects.find((x) => x.id === patch.id);
  if (!p) return;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  save();
}

export function refresh(s: AppState) {
  save();
}

export function addProject(p: Project) {
  const s = getState();
  s.projects.push(p);
  save();
}

export function deleteProject(id: ID) {
  const s = getState();
  s.projects = s.projects.filter((p) => p.id !== id);
  if (getActiveProjectId() === id) setActive(null);
  save();
}

export function addFindingToProject(projectId: ID, f: import("./types").Finding) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.findings = p.findings ?? [];
  p.findings.push(f);
  save();
}

export function setStepStatus(projectId: ID, outcomeId: number, stepKey: string, status: StepStatus, result?: string) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.steps[`${outcomeId}.${stepKey}`] = status;
  const existing = p.stepRuns.find((r) => r.stepKey === `${outcomeId}.${stepKey}`);
  const run: import("./types").StepRun = existing ?? { id: uid("run"), stepKey: `${outcomeId}.${stepKey}`, startedAt: new Date().toISOString(), status };
  if (!existing) p.stepRuns.push(run);
  run.status = status;
  if (status === "completed" || status === "skipped") run.completedAt = new Date().toISOString();
  if (result) run.result = result;
  p.updatedAt = new Date().toISOString();
  save();
}

export function addDesignDoc(doc: import("./types").DesignDocument, projectId: ID) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.designDocuments.push(doc);
  save();
}

export function addAsset(a: import("./types").Asset, projectId?: ID) {
  const s = getState();
  s.assetsAll.push(a);
  if (projectId) {
    const p = s.projects.find((x) => x.id === projectId);
    if (p) { p.assets = p.assets ?? []; if (!p.assets.includes(a.id)) p.assets.push(a.id); }
  }
  save();
}

export function updateAsset(id: ID, patch: Partial<import("./types").Asset>) {
  const s = getState();
  const a = s.assetsAll.find((x) => x.id === id);
  if (a) Object.assign(a, patch);
  save();
}

export function addMetric(projectId: ID, m: import("./types").AnalyticMetric) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.analyticsMetrics.push(m);
  save();
}

export function addCalendarEvent(projectId: ID, ev: import("./types").CalendarEvent) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.calendarEvents.push(ev);
  save();
}

export function addExperiment(projectId: ID, e: import("./types").Experiment) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.experiments.push(e);
  save();
}

export function updateExperiment(projectId: ID, id: string, patch: Partial<import("./types").Experiment>) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  p.experiments = p.experiments.map((e) => (e.id === id ? { ...e, ...patch } : e));
  save();
}

export function addTemplate(t: import("./types").Template) {
  const s = getState();
  s.templatesAll.push(t);
  save();
}

export function saveDesignDoc(doc: import("./types").DesignDocument, projectId: ID) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return;
  const idx = p.designDocuments.findIndex((d) => d.id === doc.id);
  if (idx >= 0) p.designDocuments[idx] = doc;
  else p.designDocuments.push(doc);
  p.updatedAt = new Date().toISOString();
  save();
}

export function pushNotification(title: string, body: string, tone: "info" | "success" | "warning" | "action" = "info") {
  const s = getState();
  s.notifications.unshift({ id: uid("n"), title, body, read: false, createdAt: new Date().toISOString(), tone });
  save();
}

export function markNotificationsRead() {
  const s = getState();
  s.notifications.forEach((n) => (n.read = true));
  save();
}

// ==================================================================
// Server sync. When a real backend session exists (token present) and
// the API is reachable, every save also pushes the project snapshots to
// the server (debounced + fire-and-forget so it never blocks the UI).
// On boot we pull the server copy and merge by updatedAt, so the brand
// brain, findings, decisions and progress survive across devices.
// ==================================================================
let syncTimer: any = null;
let syncing = false;

export function syncNow() {
  if (!getToken()) return;
  const s = getState();
  const projects = s.projects;
  if (!projects.length) return;
  (async () => {
    if (syncing) return;
    syncing = true;
    try {
      // Push all projects (personal, small set). Await in sequence to be gentle.
      for (const p of projects) {
        try { await apiSaveProject(p); } catch { /* offline; keep local */ }
      }
    } finally {
      syncing = false;
    }
  })();
}

export function scheduleSync() {
  if (!getToken()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 400);
}

export async function initFromServer() {
  if (!getToken()) return;
  try {
    const d = await apiBootstrap();
    if (!d?.projects?.length) return;
    const s = getState();
    const local = s.projects;
    const map = new Map(local.map((p) => [p.id, p]));
    for (const sp of d.projects) {
      const lp = map.get(sp.id);
      if (!lp || (sp.updatedAt || "") >= (lp.updatedAt || "")) map.set(sp.id, sp as Project);
    }
    s.projects = Array.from(map.values());
    if (d.integrations?.length) {
      s.integrations = d.integrations as any;
    }
    save();
  } catch {
    /* offline; ignore */
  }
}
