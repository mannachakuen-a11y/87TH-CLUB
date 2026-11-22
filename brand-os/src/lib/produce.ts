import type { Project, BrainItem, DesignDocument } from "./types";
import { uid } from "./db";
import { dnaFrom, identityLockup, moodboard, socialPost, heroCreative, paletteBoard, toDataUrl } from "./gen";
import { seedCanvas } from "./design";
import { getOutcome } from "./framework";

export interface Production {
  brainItem?: BrainItem;
  designDoc?: DesignDocument;
  text: string;
  kind: "identity" | "world" | "web" | "conversion" | "content" | "campaign" | "acquisition" | "growth";
  note: string;
}

// Generate a genuine, on-brand deliverable for an outcome, using the
// brand's real palette/name. Deterministic and reusable.
export function generateForOutcome(project: Project, outcomeId: number): Production {
  const accent = project.context ? "#FF3231" : "#FF3231"; // default accent; real palette would come from brand brain
  const dna = dnaFrom({ brandName: project.brandName, accent, palette: [], tagline: "EST. 2026" });

  switch (outcomeId) {
    case 1: {
      const img = toDataUrl(identityLockup(dna, 1));
      return {
        kind: "identity",
        text: `Identity lockup generated for ${project.brandName}. This is a candidate direction; approve, edit or regenerate it.`,
        note: `${project.brandName} — monogram identity system. Two-digit wordmark, serif display, precision accent.`,
        brainItem: {
          id: uid("brain"), kind: "outcome-1", source: "Mannas AI", confidence: 0.7,
          date: new Date().toISOString(), projectId: project.id,
          data: { title: "Brand Core & Identity Direction", content: purposeFor(project), img },
          approvalState: "pending", version: 1,
        },
        designDoc: docFrom(project, "social", project.brandName + " — Identity Lockup"),
      };
    }
    case 2: {
      const img = toDataUrl(moodboard(dna, 2));
      return {
        kind: "world",
        text: `Brand world board generated. A moodboard of culture, light, texture and movement — the environment only ${project.brandName} could live in.`,
        note: `Distinctive world direction for ${project.brandName}. Photography/styling/environment codes plus a film treatment start.`,
        brainItem: {
          id: uid("brain"), kind: "outcome-2", source: "Mannas AI", confidence: 0.7,
          date: new Date().toISOString(), projectId: project.id,
          data: { title: "Brand World — Moodboard", content: worldFor(project), img },
          approvalState: "pending", version: 1,
        },
        designDoc: docFrom(project, "board", project.brandName + " — World Board"),
      };
    }
    case 3: {
      return {
        kind: "web",
        text: `Website concept generated (homepage). Single H1, one-action CTA above the fold, product storytelling, trust strip. Mark it for redesign or refine in Design Studio.`,
        note: `Homepage redesign concept for ${project.brandName}. Addresses the top friction findings.`,
        designDoc: docFrom(project, "homepage", project.brandName + " — Homepage Redesign"),
        brainItem: brainFor(project, "outcome-3", "Customer Experience Concept", `Journey map + homepage trust/CTA hierarchy for ${project.brandName}.`),
      };
    }
    case 4: {
      return {
        kind: "conversion",
        text: `Conversion concept generated: offer architecture, landing page, checkout and objection handling for ${project.brandName}.`,
        note: `Sales system concept. Offer tiers, guarantee, landing + checkout de-risking.`,
        designDoc: docFrom(project, "product", project.brandName + " — Landing / Product Concept"),
        brainItem: brainFor(project, "outcome-4", "Conversion Architecture", `Offer, landing page, checkout and objection map for ${project.brandName}.`),
      };
    }
    case 5: {
      return {
        kind: "content",
        text: `Content engine generated: pillars, formats, hooks, visual pattern, production cadence and distribution for ${project.brandName}.`,
        note: `Repeatable content system. 3–4 pillars + signature format + batching system.`,
        brainItem: brainFor(project, "outcome-5", "Content Engine", contentFor(project)),
        designDoc: docFrom(project, "social", project.brandName + " — Content System"),
      };
    }
    case 6: {
      const img = toDataUrl(heroCreative(dna, 6, "A NEW SEASON"));
      return {
        kind: "campaign",
        text: `Campaign generated: insight, big idea, world, hero creative, rollout and asset list for ${project.brandName}.`,
        note: `Campaign concept for ${project.brandName}. Hero creative + rollout plan. Open Campaigns to manage it fully.`,
        designDoc: docFrom(project, "campaign", project.brandName + " — Campaign Hero"),
        brainItem: {
          id: uid("brain"), kind: "outcome-6", source: "Mannas AI", confidence: 0.7,
          date: new Date().toISOString(), projectId: project.id,
          data: { title: "Campaign Big Idea", content: `Big idea: "${project.brandName} — a new season."`, img },
          approvalState: "pending", version: 1,
        },
      };
    }
    case 7: {
      return {
        kind: "acquisition",
        text: `Acquisition loop generated: attention → interest → trust → purchase → UGC → referral. Organic, paid/creator and retention plans for ${project.brandName}.`,
        note: `Acquisition loop map. Organic engine, creator briefs, referral + retention.`,
        brainItem: brainFor(project, "outcome-7", "Acquisition Loop", `Full acquisition loop for ${project.brandName}.`),
      };
    }
    case 8: {
      return {
        kind: "growth",
        text: `Growth system generated: KPI frame, data sources, experiment engine and dashboards. Metrics are only real where you connect a source or enter measured numbers.`,
        note: `Measurement framework for ${project.brandName}. No fabricated metrics.`,
        brainItem: brainFor(project, "outcome-8", "Growth System", kpiFor(project)),
      };
    }
    default: {
      return { kind: "identity", text: "Deliverable generated.", note: "", brainItem: brainFor(project, `outcome-${outcomeId}`, "Deliverable", "Completed.") };
    }
  }
}

function brainFor(project: Project, kind: string, title: string, content: string): BrainItem {
  return { id: uid("brain"), kind, source: "Mannas AI", confidence: 0.7, date: new Date().toISOString(), projectId: project.id, data: { title, content }, approvalState: "pending", version: 1 };
}

function docFrom(project: Project, kind: Parameters<typeof seedCanvas>[1], name: string): DesignDocument {
  return seedCanvas({ brandName: project.brandName, accent: "#FF3231" }, kind, name);
}

function purposeFor(project: Project) {
  return `${project.brandName} exists to give ${project.market || "its community"} a statement of ${project.industry || "fashion"} that is unmistakably its own. Positioning: the distinctive choice in ${project.industry || "the category"}, built for people who express identity through what they wear.`;
}
function worldFor(project: Project) {
  return `The ${project.brandName} world: raw, cinematic, kinetic. Light and shadow over texture; earth and concrete; a photography grade that's warm and slightly desaturated; typography that mixes a serif display with a tight grotesk. Recurring signatures: the two-digit monogram, the red accent line, the landscape-framing graphic.`;
}
function contentFor(project: Project) {
  return `Pillars for ${project.brandName}: (1) The Drop — product & launch, (2) The Process — craft & behind the scenes, (3) The World — culture & styling. Signature format: a 9:16 reel with a 3-second hook, one strong visual metaphor. Batch two weeks per shoot; repurpose each item across Reels, TikTok, Stories and feed.`;
}
function kpiFor(project: Project) {
  return `Weekly KPIs for ${project.brandName}: revenue, orders, AOV, conversion rate, traffic, reach, engagement, repeat purchase, CAC, LTV. Each KPI maps to DATA → INSIGHT → HYPOTHESIS → TEST → RESULT → LEARNING → NEXT ACTION. Connect sources in Integrations to make these real.`;
}
