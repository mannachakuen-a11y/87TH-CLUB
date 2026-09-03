// ------------------------------------------------------------------
// MANNAS DUNGEONS — Brand Advancement OS · Domain types
// ------------------------------------------------------------------

export type ID = string;

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface AppState {
  schemaVersion: number;
  uid: string;
  createdAt: string;
  projects: Project[];
  assetsAll: Asset[];
  templatesAll: Template[];
  integrations: Integration[];
  notifications: Notification[];
  emailTemplates: EmailTemplate[];
}

export interface Project {
  id: ID;
  brandName: string;
  industry: string;
  market: string;
  description: string;
  websiteUrl: string;
  socialUrls: string[];
  context: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "complete" | "archived";
  // framework progression
  currentOutcomeId: number; // 1..8
  steps: Record<string, StepStatus>; // stepKey -> status
  stepRuns: StepRun[];
  analysis: Analysis | null;
  findings: Finding[];
  recommendations: Recommendation[];
  decisions: Decision[];
  brainItems: BrainItem[];
  references: Reference[];
  assets: ID[]; // project-scoped asset ids
  campaigns: Campaign[];
  cinemaProjects: CinemaProject[];
  designDocuments: DesignDocument[];
  contentConcepts: ContentConcept[];
  calendarEvents: CalendarEvent[];
  emailDrafts: EmailDraft[];
  experiments: Experiment[];
  analyticsMetrics: AnalyticMetric[];
  projectLog: Activity[]; // chat-like history
  pendingQuestions: string[];
}

export interface StepRun {
  id: ID;
  stepKey: string;
  startedAt: string;
  completedAt?: string;
  result?: string;
  status: StepStatus;
}

export interface Finding {
  id: ID;
  problem: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
  whyItMatters: string;
  confidence: number; // 0..1
  recommendation: string;
  alternatives: string[];
  visualSolution: string;
  test: string;
  category: "CONFIRMED" | "USER_PROVIDED" | "OBSERVED" | "INFERRED" | "RECOMMENDED" | "UNCERTAIN" | "MISSING";
  outcomeId?: number;
}

export interface Recommendation {
  id: ID;
  title: string;
  detail: string;
  outcomeId: number;
  status: "pending" | "approved" | "rejected" | "edited" | "regenerated";
}

export interface Decision {
  id: ID;
  title: string;
  why: string;
  rejected?: string;
  changed?: string;
  createdAt: string;
  outcomeId: number;
}

export interface BrainItem {
  id: ID;
  kind: string;
  source: string;
  confidence: number;
  date: string;
  data: Record<string, unknown>;
  projectId: ID;
  approvalState?: "approved" | "rejected" | "pending";
  version: number;
}

export interface Reference {
  id: ID;
  name: string;
  type: string; // "photo" | "website" | "campaign" | "video"
  url?: string;
  analysis: string;
  principles: string[];
}

export interface Asset {
  id: ID;
  name: string;
  kind: "image" | "video" | "document" | "audio" | "data";
  tags: string[];
  favorite: boolean;
  approved: boolean;
  url?: string; // data url for images in localStorage
  scope: "global" | "project" | "campaign" | "template" | "reference";
  createdAt: string;
}

export interface Template {
  id: ID;
  name: string;
  category: string;
  style: string;
  variables: string[]; // brand name, logo, colors...
  designType: string;
}

export interface Integration {
  id: ID;
  name: string;
  state: "connected" | "available" | "planned" | "error";
  permissions: string[];
  lastSync?: string;
  error?: string;
  capabilities: string[];
  provider: string;
}

export interface Notification {
  id: ID;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  tone: "info" | "success" | "warning" | "action";
}

export interface EmailTemplate {
  id: ID;
  name: string;
  subject: string;
  body: string;
  type: "client";
}

// --- Cinema Studio ---
export interface CinemaProject {
  id: ID;
  title: string;
  format: "SOCIAL" | "CONTENT" | "CAMPAIGN" | "BRAND";
  assetType?: string; // Stories, Highlights, Reels, TikTok, Post, Carousel, Ad, UGC...
  outcome?: number;   // 1..8 the framework outcome this serves
  phase: string;
  treatment: string;
  script: string;
  storyboard: StoryboardCard[];
  shotList: Shot[];
  aspectRatios: string[];
  exportNote: string;
}

export interface StoryboardCard {
  id: ID;
  frame: number;
  description: string;
  camera: string;
  note: string;
}

export interface Shot {
  id: ID;
  n: string;
  duration: string;
  description: string;
  cameraMovement: string;
  location: string;
  cast: string;
  wardrobe: string;
  lighting: string;
  sound: string;
}

// --- Design Studio ---
export interface DesignElement {
  id: ID;
  type: "text" | "rect" | "circle" | "image" | "line";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  fill?: string;
  text?: string;
  fontWeight?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  borderRadius?: number;
  opacity: number;
  imageUrl?: string;
  letterSpacing?: number;
}

export interface DesignDocument {
  id: ID;
  title: string;
  canvas: { id: string; width: number; height: number; name: string };
  elements: DesignElement[];
  updatedAt: string;
  variables: Record<string, string>;
}

// --- Content / Campaigns ---
export interface ContentConcept {
  id: ID;
  title: string;
  objective: string;
  audience: string;
  pillar: string;
  platform: string;
  format: string;
  hook: string;
  concept: string;
  visualDirection: string;
  script: string;
  caption: string;
  cta: string;
  funnelStage: string;
  production: string;
  repurposing: string;
  measurement: string;
}

export interface Campaign {
  id: ID;
  name: string;
  objective: string;
  audience: string;
  insight: string;
  bigIdea: string;
  world: string;
  message: string;
  creativeDirection: string;
  references: string;
  launchSequence: string;
  cta: string;
  assetList: string;
  measurementPlan: string;
  status: "draft" | "approved" | "live";
}

export interface Experiment {
  id: ID;
  hypothesis: string;
  control: string;
  variant: string;
  metric: string;
  startDate: string;
  endDate?: string;
  result?: string;
  learning?: string;
  nextAction?: string;
  status: "planned" | "running" | "complete";
}

export interface AnalyticMetric {
  id: ID;
  name: string;
  value: number;
  unit: string;
  period: string;
  source: string;
  trend?: number;
  organic: boolean;
}

export interface Activity {
  id: ID;
  actor: "user" | "system" | "mannas-ai";
  type: string;
  text: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: ID;
  date: string; // YYYY-MM-DD
  title: string;
  platform: string;
  format: string;
  status: "scheduled" | "posted" | "idea";
  notes: string;
}

export interface EmailDraft {
  id: ID;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "edited" | "approved" | "sent";
  createdAt: string;
}

// --- Analysis
export interface Analysis {
  id: ID;
  ranAt: string;
  sourceCounts: Record<string, number>;
  websiteHealth: WebsiteHealth;
  summary: string;
}

export interface WebsiteHealth {
  reachable: boolean;
  url: string;
  hasH1: boolean;
  hasCta: boolean;
  hasReviews: boolean;
  hasSizeGuide: boolean;
  hasShippingReturns: boolean;
  hasFaq: boolean;
  hasNewsletter: boolean;
  wordCount: number;
  title: string;
  notes: string[];
}

export interface FrameworkStep {
  key: string;
  title: string;
  detail: string;
  deliverable: string; // what gets produced
}

export interface FrameworkOutcome {
  id: number;
  number: string;
  title: string;
  short: string;
  promise: string;
  steps: FrameworkStep[];
}
