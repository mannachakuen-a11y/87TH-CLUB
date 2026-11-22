import type { AppState, Project, ID, StepStatus } from "./types";

// ------------------------------------------------------------------
// A real, persisted data layer. It backs onto localStorage so state
// survives reloads and truly reflects what you did. It is deliberately
// isolated behind a tiny store so it can be swapped to Supabase/Postgres
// in production without touching the views.
// ------------------------------------------------------------------

const STORAGE_KEY = "eightyseventhclub_state_v1";
const schemaVersion = 1;

export function uid(prefix = "id"): ID {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyState(): AppState {
  return {
    schemaVersion,
    uid: uid("state"),
    createdAt: new Date().toISOString(),
    projects: [],
    assetsAll: [],
    templatesAll: defaultTemplates(),
    integrations: defaultIntegrations(),
    notifications: [],
    emailTemplates: defaultEmailTemplates(),
  };
}

const DEFAULT_EMAILS = [
  {
    id: "email_advancement_complete",
    name: "Brand Advancement Complete",
    subject: "Your Brand Advancement project is ready",
    body: "Hi {firstName},\n\nWe've taken {brandName} through all eight Brand Advancement outcomes. Here's what changed and where you can find everything:\n\n• Identity\n• Brand world\n• Customer experience & conversion\n• Content system\n• Campaign\n• Acquisition loop\n• Analytics\n\nOpen the Brand Advancement Book below to see it all, then we'll walk through next steps.\n\n— Mannas Dungeons",
    type: "client" as const,
  },
  {
    id: "email_materials_ready",
    name: "Materials Needed",
    subject: "A few materials to move {brandName} forward",
    body: "Hi {firstName},\n\nWe're partway through Outcome {outcome}. To keep going we need:\n\n{missingItems}\n\nDrop them here when ready and we'll continue.\n\n— Mannas Dungeons",
    type: "client" as const,
  },
];

function defaultEmailTemplates() {
  return DEFAULT_EMAILS;
}

let state: AppState = load();

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.projects) return emptyState();
    // merge in defaults for any newly added collections
    return {
      ...emptyState(),
      ...parsed,
      emailTemplates: parsed.emailTemplates?.length ? parsed.emailTemplates : defaultEmailTemplates(),
      integrations: parsed.integrations?.length ? parsed.integrations : defaultIntegrations(),
      templatesAll: parsed.templatesAll?.length ? parsed.templatesAll : defaultTemplates(),
    };
  } catch {
    return emptyState();
  }
}

const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function save() {
  state = { ...state };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full (large data URLs). Keep in-memory; warn once.
    console.warn("Mannas Dungeons: localStorage write failed (possibly full).");
  }
  listeners.forEach((l) => l());
  // Best-effort backend sync (debounced); no-op without a session/API.
  if (typeof window !== "undefined") {
    // Lazy import to avoid a hard dependency cycle in db.ts.
    import("./store").then((m) => m.scheduleSync()).catch(() => {});
  }
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface Actions {
  addProject(p: Project): void;
  updateProject(id: ID, patch: Partial<Project>): void;
  deleteProject(id: ID): void;
  setActiveProject(id: ID | null): void;
  setStep(projectId: ID, outcomeId: number, stepKey: string, status: StepStatus, result?: string): void;
  addNotification(n: { title: string; body: string; tone?: "info" | "success" | "warning" | "action" }): void;
  markNotificationsRead(): void;
  reset(): void;
}

let activeProjectId: ID | null = null;
const LIST_KEY = "eightyseventhclub_active_project";
try {
  activeProjectId = localStorage.getItem(LIST_KEY);
} catch {
  activeProjectId = null;
}

export function getActiveProjectId(): ID | null {
  return activeProjectId;
}

export function setActiveProjectId(id: ID | null) {
  activeProjectId = id;
  try {
    if (id) localStorage.setItem(LIST_KEY, id);
    else localStorage.removeItem(LIST_KEY);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------
// Default templates (real, usable catalog data)
// ------------------------------------------------------------------
export function defaultTemplates() {
  const cat = (designType: string, category: string, style: string, name: string, variables: string[]) => ({
    id: uid("tpl"),
    name,
    category,
    style,
    variables,
    designType,
  });
  return [
    cat("identity", "Brand Identity", "Streetwear", "Identity System — 01", ["brand name", "logo", "colors", "fonts"]),
    cat("identity", "Brand Identity", "Luxury", "Monogram Identity", ["brand name", "monogram", "colors"]),
    cat("social", "Social", "Streetwear", "Drop Announcement Post", ["brand name", "product image", "drop date", "cta"]),
    cat("social", "Social", "Streetwear", "Reel Cover — 9:16", ["brand name", "thumb", "title"]),
    cat("social", "Social", "Premium", "Editorial Feed Post", ["brand name", "photography", "caption"]),
    cat("social", "Social", "Luxury", "Carousel — Lookbook", ["lookbook images", "brand name"]),
    cat("campaign", "Campaigns", "Streetwear", "Launch Key Visual", ["brand name", "tagline", "date", "hero"]),
    cat("campaign", "Campaigns", "Cultural", "Seasonal Campaign Board", ["season", "hero", "message"]),
    cat("website", "Website", "Streetwear", "Homepage Concept", ["logo", "hero", "products", "cta"]),
    cat("website", "Website", "Minimalist", "Product Page Concept", ["product", "price", "cta", "sizes"]),
    cat("content", "Content", "Athleisure", "Brand Film Treatment", ["concept", "duration", "references"]),
    cat("presentation", "Presentation", "Streetwear", "Brand Book", ["brand name", "sections", "visuals"]),
    cat("analytics", "Analytics", "Growth", "Brand Advancement Report", ["metrics", "insights", "next actions"]),
    cat("social", "Social", "Y2K", "UGC Prompt Story", ["brand name", "prompt", "cta"]),
    cat("campaign", "Campaigns", "Luxury", "Hero Film Frame", ["brand name", "frame", "caption"]),
  ];
}

function defaultIntegrations() {
  const mk = (name: string, provider: string, state: "connected" | "available" | "planned" | "error", capabilities: string[], permissions: string[]) => ({
    id: uid("int"), name, provider, state, capabilities, permissions,
  });
  return [
    mk("OpenAI", "openai", "available", ["GPT-4o strategy", "vision analysis", "structured extraction"], ["model access"]),
    mk("Anthropic Claude", "anthropic", "available", ["long-context reasoning", "writing", "critique"], ["model access"]),
    mk("Google Gemini", "gemini", "available", ["multimodal analysis", "video understanding"], ["model access"]),
    mk("Arena AI", "arena", "available", ["agentic tool use", "orchestration"], ["agent access"]),
    mk("Shopify", "shopify", "available", ["orders", "products", "analytics"], ["store.read"]),
    mk("Stripe", "stripe", "available", ["payments", "revenue analytics"], ["charges.read"]),
    mk("Gmail", "gmail", "available", ["read/send drafts", "client communication"], ["gmail.send", "gmail.drafts"]),
    mk("Google Drive", "drive", "available", ["asset sync"], ["drive.read"]),
    mk("Google Analytics", "ga", "available", ["traffic", "acquisition", "behavior"], ["analytics.read"]),
    mk("Figma", "figma", "planned", ["web/design handoff"], ["files.read"]),
    mk("Canva", "canva", "planned", ["social + presentation assets"], ["content.write"]),
    mk("Adobe Creative Cloud", "adobe", "planned", ["creative processing"], ["assets.read"]),
    mk("Higgsfield", "higgsfield", "planned", ["video generation"], ["video.create"]),
    mk("DaVinci Resolve", "resolve", "planned", ["professional editing/color"], ["project.write"]),
    mk("Jitter", "jitter", "planned", ["motion graphics"], ["video.create"]),
    mk("Vercel", "vercel", "planned", ["deploy", "preview"], ["deploy.write"]),
    mk("Netlify", "netlify", "planned", ["deploy", "forms"], ["deploy.write"]),
    mk("Claude MCP / Browser (Playwright)", "local", "planned", ["website intelligence", "browser automation"], ["browser"]),
  ];
}

export { defaultTemplates as getDefaultTemplates, defaultIntegrations as getDefaultIntegrations, defaultEmailTemplates as getDefaultEmailTemplates };
