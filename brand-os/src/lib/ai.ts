import type { Project, StepStatus } from "./types";
import { FRAMEWORK, getOutcome } from "./framework";
import { uid } from "./db";

// ------------------------------------------------------------------
// Mannas AI is a project-aware assistant. It reasons over the real
// project/state objects (brand brain, findings, decisions, pending
// work) — it is not a disconnected chat box. When a command requires a
// model we can't reach without a key, it says so plainly and proposes
// the concrete next action rather than pretending to "think".
// ------------------------------------------------------------------

export interface AiReply {
  text: string;
  tone: "info" | "success" | "warning" | "action";
  action?: string;
}

function stepStatus(project: Project, outcomeId: number, stepKey: string): StepStatus {
  return project.steps[`${outcomeId}.${stepKey}`] ?? "pending";
}

function outcomeProgress(p: Project, outcomeId: number) {
  const o = getOutcome(outcomeId);
  const done = o.steps.filter((s) => stepStatus(p, outcomeId, s.key.split(".")[1]) !== "pending").length;
  return `${done}/${o.steps.length}`;
}

export function overallProgress(p: Project): number {
  let done = 0;
  let total = 0;
  for (const o of FRAMEWORK) {
    total += o.steps.length;
    done += o.steps.filter((s) => stepStatus(p, o.id, s.key.split(".")[1]) !== "pending").length;
  }
  return Math.round((done / total) * 100);
}

export function pendingSteps(p: Project) {
  const keys: string[] = [];
  for (const o of FRAMEWORK) {
    for (const s of o.steps) {
      if (stepStatus(p, o.id, s.key.split(".")[1]) === "pending") keys.push(`${o.id}.${s.key.split(".")[1]}`);
    }
  }
  return keys;
}

export function ask87th(p: Project, command: string): AiReply {
  const c = command.toLowerCase().trim();
  const re = /outcome\s*(\d{1,2})/i;

  const topFindings = [...(p.findings ?? [])].sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
    return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
  });

  // Analyze this brand
  if (/analy(z|se) this brand/.test(c) || /analy(z|se) the brand/.test(c) || /first[- ]?pass/.test(c)) {
    const hasFindings = (p.findings ?? []).length;
    if (!hasFindings) {
      return { tone: "warning", text: "I don't have enough real evidence to analyse yet, so I won't invent findings. Add a website URL or upload materials (guidelines, lookbook, copy, screenshots), then I'll run a genuine first-pass analysis.", action: "open:onboarding" };
    }
    const groups: Record<string, number> = {};
    p.findings.forEach((f) => (groups[f.category] = (groups[f.category] ?? 0) + 1));
    const groupStr = Object.entries(groups).map(([k, v]) => `${k} ${v}`).join(", ");
    return {
      tone: "success",
      text: `First pass complete for ${p.brandName}. I verified ${groups["OBSERVED"] ?? 0} observable problem(s) from evidence and flagged ${groups["MISSING"] ?? groups["UNCERTAIN"] ?? 0} as things I can't confirm yet. Breakdown: ${groupStr}. Highest priority: ${topFindings[0]?.problem ?? "none"} — ${topFindings[0]?.whyItMatters ?? ""}`,
      action: "open:dashboard",
    };
  }

  // Continue outcome
  if (re.test(c) && /(continue|resume|start|go to)/.test(c)) {
    const num = parseInt(c.match(re)![1], 10);
    const o = getOutcome(num);
    const done = o.steps.filter((s) => stepStatus(p, num, s.key.split(".")[1]) !== "pending").length;
    const next = o.steps.find((s) => stepStatus(p, num, s.key.split(".")[1]) === "pending");
    return {
      tone: "info",
      text: `Outcome ${o.number} — ${o.title}. You've completed ${done}/${o.steps.length} steps. ${next ? `Next is "${next.title}": ${next.detail}. Deliverable: ${next.deliverable}.` : "All steps for this outcome are done — move to the next outcome."}`,
      action: `outcome:${num}`,
    };
  }

  // What's wrong with the website
  if (/wrong with the website|website.*(wrong|problem|issue|bad)/.test(c)) {
    if (!p.analysis?.websiteHealth?.reachable) {
      return { tone: "warning", text: "I couldn't reach the live site, so I'm not going to guess. Supply homepage + product + checkout screenshots or an exported HTML file and I'll run the same friction analysis on them.", action: "open:onboarding" };
    }
    const issues = (p.findings ?? []).filter((f) => f.outcomeId === 3 || /website|cta|review|shipping|copy/i.test(f.recommendation));
    return {
      tone: "info",
      text: `Site health: reachable, ${p.analysis.websiteHealth.wordCount ?? 0} words of copy. H1: ${p.analysis.websiteHealth.hasH1 ? "yes" : "MISSING"}, CTA: ${p.analysis.websiteHealth.hasCta ? "yes" : "MISSING"}, reviews: ${p.analysis.websiteHealth.hasReviews ? "yes" : "MISSING"}, shipping/returns: ${p.analysis.websiteHealth.hasShippingReturns ? "yes" : "MISSING"}. The main friction points: ${issues.map((i) => i.problem).join("; ") || "open the full findings list."}`,
      action: "open:findings",
    };
  }

  // Show highest-priority problem
  if (/highest[- ]priority|most important problem|top problem/.test(c)) {
    const top = topFindings[0];
    if (!top) return { tone: "info", text: "No findings yet — run the first pass first." };
    return { tone: "action", text: `Highest priority (${top.severity}): ${top.problem}. Evidence: ${top.evidence} — Why it matters: ${top.whyItMatters} — I'd change: ${top.recommendation}. Confidence ${Math.round(top.confidence * 100)}%.`, action: "open:findings" };
  }

  // Create three solutions
  if (/create three solutions|three alternative/.test(c) || /alternatives/.test(c)) {
    const top = topFindings[0];
    if (!top) return { tone: "info", text: "No finding to solve yet." };
    return {
      tone: "info",
      text: `For "${top.problem}", three directions:\n\n1. ${top.recommendation}\n2. ${top.alternatives[0] ?? "Reframe the problem from the customer's angle."}\n3. ${top.alternatives[1] ?? "A bolder, riskier expression — test the polar opposite."}\n\nI'll generate these as concepts in Design Studio. You can approve, edit, regenerate or reject each.`,
      action: "open:design",
    };
  }

  // Build the homepage redesign
  if (/build the homepage|homepage redesign|redesign this/.test(c)) {
    return { tone: "action", text: "Generating a homepage concept in Design Studio: a single clear H1, a one-action CTA above the fold, product storytelling, and a trust strip (reviews + shipping). You can drag elements, swap text, and export. When you're happy, approve it so it goes into the brand brain.", action: "open:design" };
  }

  // Compare to brand world
  if (/compare.*brand world|approved brand world|on brand|brand world/.test(c)) {
    const approved = (p.decisions ?? []).filter((d) => d.title).length;
    return {
      tone: "info",
      text: approved ? `Comparing against your approved brand world. Your brand brain holds ${(p.brainItems ?? []).length} remembered items and ${approved} approved decision(s). Here's the principle check: does the creative use the locked palette, type, and world codes? If not, I'll flag it as off-world.` : "You haven't approved a brand world yet. Complete Outcome 02 and approve a direction, then I can hold you to it on every new piece of creative.",
      action: "open:outcome",
    };
  }

  // Create a campaign
  if (/create a campaign|make a campaign|new campaign/.test(c)) {
    return { tone: "action", text: "Starting a campaign in Outcome 06: Insight → Big Idea → Campaign World → Hero Creative → Rollout → Asset List. I'll draft the idea and you approve or redirect. Want me to name it after your current drop?", action: "open:campaign" };
  }

  // Turn into template
  if (/turn this into a template|save as template/.test(c)) {
    return { tone: "success", text: "Assigning variables (brand name, logo, colors, fonts, product image, campaign title, CTA) so this work becomes a reusable, on-system template. It'll appear in the Template Library under its category and style.", action: "open:templates" };
  }

  // What is pending
  if (/what is pending|what'?s pending|pending work|what'?s left/.test(c)) {
    const pends = pendingSteps(p);
    if (!pends.length) return { tone: "success", text: "Nothing pending — the framework is complete on every outcome. Ready to generate the Brand Advancement Book and case study." };
    const pc = pends.map((k) => {
      const [oi, s] = k.split(".");
      const step = getOutcome(parseInt(oi, 10)).steps.find((st) => st.key.split(".")[1] === s);
      return `${k} — ${step?.title}`;
    });
    return { tone: "info", text: `${pends.length} pending across the framework:\n${pc.join("\n")}\n\nStart with the earliest outcome to keep dependencies intact.`, action: "open:outcome" };
  }

  // What did we decide
  if (/what did we decide|what decision|decision log|what did (we|i) (decide|reject)/.test(c)) {
    const ds = p.decisions ?? [];
    if (!ds.length) return { tone: "info", text: "Nothing decided yet, so there's no authoritative context to hold. Approve a direction as you go and it becomes the current truth I build on." };
    return { tone: "info", text: `Decisions so far (${ds.length}):\n${ds.map((d) => `• ${d.title} — because ${d.why}${d.rejected ? ` (rejected: ${d.rejected})` : ""}`).join("\n")}` };
  }

  // Production brief
  if (/production brief|shot list|treatment|storyboard|produce/.test(c)) {
    return { tone: "info", text: "Building a production brief in Cinema Studio: treatment → script → storyboard → shot list → generation/edit/export. Give me the film's single idea and I'll draft the treatment and a shot list with camera, location, lighting and sound notes.", action: "open:cinema" };
  }

  // Client presentation
  if (/client presentation|build a presentation|brand advancement book/.test(c)) {
    return { tone: "action", text: "Compiling the Brand Advancement Book: summary, diagnosis, identity, world, customer experience, conversion system, content engine, campaign, acquisition loop, analytics, before/after, experiments, and future recommendations. Generate it and it can be viewed, edited and exported.", action: "open:book" };
  }

  // What should we test next
  if (/test next|what should we test|next experiment/.test(c)) {
    return { tone: "action", text: "Next experiment: pick the highest-impact finding with unknown baseline. I'd propose: (control) current page vs (variant) the recommended change, on the primary action metric over 2–3 weeks. Log hypothesis, control, variant, metric, and dates in the Experiment Engine, then read the result and turn it into a learning.", action: "open:analytics" };
  }

  if (/pending questions|missing|what do you need/.test(c)) {
    const q = p.pendingQuestions ?? [];
    return { tone: "info", text: q.length ? `High-value things I still need from you:\n${q.map((x) => `• ${x}`).join("\n")}` : "I don't have any open questions — I have enough evidence to work with." };
  }

  if (/help|what can you do/.test(c)) {
    return {
      tone: "info",
      text: "I'm tied to this project, not a generic chatbot. Try:\n• Analyze this brand\n• Continue Outcome 02\n• What is wrong with the website?\n• Show the highest-priority problem\n• Create three solutions\n• Build the homepage redesign\n• Compare this to the approved brand world\n• Create a campaign\n• Turn this into a template\n• What is pending?\n• What did we decide?\n• Create a production brief\n• Build a client presentation\n• What should we test next?",
    };
  }

  // Contextual fallback
  return {
    tone: "info",
    text: `I can act on ${p.brandName} directly. Ask me one of the commands above (e.g. "Analyze this brand", "What is pending?", "Create a campaign"). I'll use your real project data, and if something needs a live model or an API key, I'll tell you plainly rather than fake it.`,
  };
}

export function makeReplyFromAction(project: Project, action: string): AiReply {
  // For UI navigation actions
  return ask87th(project, action);
}

export function newActivityFromReply(project: Project, command: string, reply: AiReply) {
  return {
    id: uid("log"),
    actor: "mannas-ai" as const,
    type: "ai",
    text: `You: ${command}\nMannas AI: ${reply.text}`,
    createdAt: new Date().toISOString(),
  };
}
