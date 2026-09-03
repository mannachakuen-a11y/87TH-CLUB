import type { FrameworkOutcome } from "./types";

// ------------------------------------------------------------------
// The framework is stored as configurable data so steps can be
// edited later. Changing a step here changes the whole system.
// ------------------------------------------------------------------

export const FRAMEWORK: FrameworkOutcome[] = [
  {
    id: 1,
    number: "01",
    title: "Clear Brand Identity",
    short: "Identity",
    promise: "Define who the brand is and why it exists.",
    steps: [
      { key: "1.1", title: "Brand Core", detail: "Purpose, mission, values, promise.", deliverable: "Brand core statement" },
      { key: "1.2", title: "Audience", detail: "Who you serve, their world, their tension.", deliverable: "Audience map" },
      { key: "1.3", title: "Positioning", detail: "Category, differentiation, competitive white space.", deliverable: "Positioning statement" },
      { key: "1.4", title: "Personality", detail: "Tone, voice, character, manner of speaking.", deliverable: "Personality + voice guide" },
      { key: "1.5", title: "Messaging", detail: "Elevator pitch, value prop, message hierarchy.", deliverable: "Message house" },
      { key: "1.6", title: "Test", detail: "Is the brand clear and recognizable without the logo?", deliverable: "Identity test result" },
    ],
  },
  {
    id: 2,
    number: "02",
    title: "Distinctive Brand World",
    short: "Brand World",
    promise: "Build a world only this brand could live in.",
    steps: [
      { key: "2.1", title: "Culture & People", detail: "The people, the streets, the scenes of the brand.", deliverable: "Culture + people board" },
      { key: "2.2", title: "Moodboard", detail: "Environment, texture, light, feeling.", deliverable: "Moodboard" },
      { key: "2.3", title: "Photography Direction", detail: "Art direction, styling, casting, grade.", deliverable: "Photography direction" },
      { key: "2.4", title: "Film Treatment", detail: "Cinematic language, motion, sound.", deliverable: "Film treatment" },
      { key: "2.5", title: "Visual Signatures", detail: "Recurring codes, typography, color, graphics.", deliverable: "Signature system" },
      { key: "2.6", title: "Test", detail: "Does the brand feel different from competitors?", deliverable: "Distinctiveness test" },
    ],
  },
  {
    id: 3,
    number: "03",
    title: "Stronger Customer Experience",
    short: "Customer Experience",
    promise: "Take friction out of discovering and buying.",
    steps: [
      { key: "3.1", title: "Journey Map", detail: "Discovery → interest → consider → trust → buy → post-purchase.", deliverable: "Journey map" },
      { key: "3.2", title: "Website Diagnosis", detail: "Homepage, nav, product, trust, checkout friction.", deliverable: "Website findings" },
      { key: "3.3", title: "CTA Hierarchy", detail: "One clear action per screen, in priority order.", deliverable: "CTA map" },
      { key: "3.4", title: "Trust System", detail: "Reviews, guarantees, social proof, objection handling.", deliverable: "Trust system" },
      { key: "3.5", title: "Product & Offer Story", detail: "How the product is presented and sold.", deliverable: "Product storytelling" },
      { key: "3.6", title: "Retention", detail: "Post-purchase, re-order, loyalty, care.", deliverable: "Retention plan" },
    ],
  },
  {
    id: 4,
    number: "04",
    title: "Conversion-Ready Sales System",
    short: "Sales System",
    promise: "Turn interest into orders, predictably.",
    steps: [
      { key: "4.1", title: "Offer Architecture", detail: "Core offer, bundles, tiers, guarantees.", deliverable: "Offer architecture" },
      { key: "4.2", title: "Landing Page", detail: "Hero → proof → offer → CTA page.", deliverable: "Landing concept" },
      { key: "4.3", title: "Checkout Concept", detail: "Reduce steps, reduce doubt, reduce risk.", deliverable: "Checkout concept" },
      { key: "4.4", title: "Objection Handling", detail: "Answer the reasons people don't buy.", deliverable: "Objection map" },
      { key: "4.5", title: "Conversion Test", detail: "Quantitative + qualitative conversion audit.", deliverable: "Conversion baseline" },
    ],
  },
  {
    id: 5,
    number: "05",
    title: "Repeatable Content Engine",
    short: "Content Engine",
    promise: "Never run out of on-brand content again.",
    steps: [
      { key: "5.1", title: "Content Pillars", detail: "The 4–6 themes that define the feed.", deliverable: "Pillar map" },
      { key: "5.2", title: "Formats & Hooks", detail: "Reels, TikToks, stories, posts, carousels.", deliverable: "Format + hook library" },
      { key: "5.3", title: "Visual Pattern", detail: "Recurring templates and sign-offs.", deliverable: "Content system" },
      { key: "5.4", title: "Production System", detail: "Batching, templates, roles, cadence.", deliverable: "Content calendar system" },
      { key: "5.5", title: "Distribution", detail: "Platform-by-platform posting and repurposing.", deliverable: "Distribution plan" },
      { key: "5.6", title: "Measurement", detail: "Content-level goals + how to read them.", deliverable: "Content dashboards" },
    ],
  },
  {
    id: 6,
    number: "06",
    title: "Campaign System",
    short: "Campaigns",
    promise: "Launch big ideas on a system, not a one-off.",
    steps: [
      { key: "6.1", title: "Insight & Big Idea", detail: "The single idea the campaign hangs on.", deliverable: "Campaign idea" },
      { key: "6.2", title: "Campaign World", detail: "The creative environment of the launch.", deliverable: "Campaign world board" },
      { key: "6.3", title: "Hero Creative", detail: "The key visual + hero film idea.", deliverable: "Hero creative concept" },
      { key: "6.4", title: "Rollout Plan", detail: "Social, UGC, creators, email/SMS, ads, website.", deliverable: "Rollout plan" },
      { key: "6.5", title: "Asset List", detail: "Every piece the campaign needs.", deliverable: "Production asset list" },
    ],
  },
  {
    id: 7,
    number: "07",
    title: "Customer Acquisition Loop",
    short: "Acquisition",
    promise: "Turn buyers into the next campaign.",
    steps: [
      { key: "7.1", title: "Funnel Map", detail: "Attention → interest → trust → purchase → UGC → referral.", deliverable: "Acquisition loop map" },
      { key: "7.2", title: "Organic Engine", detail: "Social, search, community, partnership.", deliverable: "Organic plan" },
      { key: "7.3", title: "Paid & Creator", detail: "Ads, creators, UGC briefs.", deliverable: "Paid + creator briefs" },
      { key: "7.4", title: "Retention & Referral", detail: "Email, SMS, WhatsApp, referrals, community.", deliverable: "Retention + referral plan" },
      { key: "7.5", title: "Test", detail: "Is the loop closing on its own?", deliverable: "Loop test" },
    ],
  },
  {
    id: 8,
    number: "08",
    title: "Measurable Growth System",
    short: "Growth",
    promise: "Know what's working and why.",
    steps: [
      { key: "8.1", title: "KPI Frame", detail: "Revenue, orders, AOV, CAC, LTV, repeat, reach.", deliverable: "KPI framework" },
      { key: "8.2", title: "Connect Sources", detail: "Where real data lives and how to access it.", deliverable: "Data sources" },
      { key: "8.3", title: "Experiment Engine", detail: "Hypothesis → test → result → learning.", deliverable: "Experiment backlog" },
      { key: "8.4", title: "Dashboards", detail: "The numbers a brand should watch weekly.", deliverable: "Analytics dashboard" },
      { key: "8.5", title: "Final Review", detail: "Measure the advancement across all outcomes.", deliverable: "Advancement review" },
    ],
  },
];

export function getOutcome(id: number): FrameworkOutcome {
  return FRAMEWORK.find((o) => o.id === id) ?? FRAMEWORK[0];
}

export function outcomeTotalSteps(id: number): number {
  return getOutcome(id).steps.length;
}

export function allStepKeys(): string[] {
  return FRAMEWORK.flatMap((o) => o.steps.map((s) => `${o.id}.${s.key.split(".")[1]}`));
}
