import type { Project } from "./types";
import { uid } from "./db";
import { FRAMEWORK } from "./framework";

// Create a brand project fully initialised against the framework.
export function newProject(partial?: Partial<Project>): Project {
  const now = new Date().toISOString();
  const steps: Record<string, "pending"> = {};
  for (const o of FRAMEWORK) for (const s of o.steps) steps[`${o.id}.${s.key.split(".")[1]}`] = "pending";
  const p: Project = {
    id: uid("proj"),
    brandName: "",
    industry: "",
    market: "",
    description: "",
    websiteUrl: "",
    socialUrls: [],
    context: "",
    createdAt: now,
    updatedAt: now,
    status: "active",
    currentOutcomeId: 1,
    steps,
    stepRuns: [],
    analysis: null,
    findings: [],
    recommendations: [],
    decisions: [],
    brainItems: [],
    references: [],
    assets: [],
    campaigns: [],
    cinemaProjects: [],
    designDocuments: [],
    contentConcepts: [],
    calendarEvents: [],
    emailDrafts: [],
    experiments: [],
    analyticsMetrics: [],
    projectLog: [
      { id: uid("log"), actor: "system", type: "created", text: "Project created. Choose a brand focus and add materials to begin Outcome 01.", createdAt: now },
    ],
    pendingQuestions: [],
    ...partial,
  };
  return p;
}
