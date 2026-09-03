import type { Finding, Analysis, WebsiteHealth, Project } from "./types";
import { uid } from "./db";

// ------------------------------------------------------------------
// First-pass analysis. This is REAL: it processes the evidence you gave
// it (uploaded text assets + a reachable website) and reasons over that
// evidence. It never fabricates private analytics or pretends an
// integration succeeded. Anything it couldn't verify is labelled
// MISSING / UNCERTAIN and surfaced as a high-value follow-up question.
// ------------------------------------------------------------------

export interface TextAsset {
  name: string;
  content: string;
}

async function fetchText(url: string, ms = 6000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length < 40) return null;
    return text;
  } catch {
    return null;
  }
}

function assocWord(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function has(html: string, needles: string[]): boolean {
  const low = html.toLowerCase();
  return needles.some((n) => low.includes(n));
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function analyzeWebsite(url: string): Promise<{ health: WebsiteHealth; }> {
  const base: WebsiteHealth = {
    reachable: false,
    url,
    hasH1: false,
    hasCta: false,
    hasReviews: false,
    hasSizeGuide: false,
    hasShippingReturns: false,
    hasFaq: false,
    hasNewsletter: false,
    wordCount: 0,
    title: "",
    notes: [],
  };
  let html = await fetchText(url);
  // if bare domain fails, prepend https:// and www
  if (!html) {
    const candidates = [`https://${url}`, `https://www.${url}`];
    for (const c of candidates) {
      html = await fetchText(c);
      if (html) {
        base.url = c;
        break;
      }
    }
  }
  if (!html) {
    base.notes.push("The site could not be reached from here (network/public access). Provide a screenshot or exported HTML and it will be analysed the same way.");
    return { health: base };
  }
  base.reachable = true;
  base.title = assocWord(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "";
  base.hasH1 = /<h1[\s>]/i.test(html);
  base.hasCta = has(html, ["add to cart", "buy now", "shop now", "get yours", "pre-order", "view collection", "contact us"]);
  base.hasReviews = has(html, ["review", "rating", "☆", "star rating", "testimonials", "as seen in"]);
  base.hasSizeGuide = has(html, ["size guide", "size chart", "find my size", "sizing"]);
  base.hasShippingReturns = has(html, ["shipping", "returns", "delivery", "free shipping", "exchange"]);
  base.hasFaq = has(html, ["faq", "help center", "support", "how do i"]);
  base.hasNewsletter = has(html, ["newsletter", "sign up", "subscribe", "join the club", "email address"]);
  base.wordCount = stripTags(html).split(/\s+/).length;
  return { health: base };
}

const severityFrom = (v: number): Finding["severity"] => (v >= 0.75 ? "critical" : v >= 0.5 ? "high" : v >= 0.25 ? "medium" : "low");

export function buildFindings(project: Project, health: WebsiteHealth, textAssets: TextAsset[], answers: Record<string, string>): Finding[] {
  const findings: Finding[] = [];
  const combined = textAssets.map((a) => a.content).join("\n---\n");
  const low = combined.toLowerCase();

  const note = (f: Omit<Finding, "id">) => findings.push({ id: uid("find"), ...f });

  // Brand core / positioning (from description + context + answers)
  const hasPositioning = project.description.length > 60 || answers.audience?.length;
  if (!hasPositioning) {
    note({
      problem: "There is no clear statement of who the brand is for and why it matters.",
      evidence: `Brand description is ${project.description.length} characters and no audience was specified.`,
      severity: "high",
      whyItMatters: "Without positioning, creative and messaging drift, and the brand becomes interchangeable with every competitor.",
      confidence: 0.7,
      recommendation: "Define positioning (category, differentiation, target), then a promise and message hierarchy in Outcome 01.",
      alternatives: ["Start from a customer interview set", "Reverse-engineer from the strongest competitor", "Anchor on a founder story"],
      visualSolution: "Positioning statement + message house in Design Studio.",
      test: "Show three strangers the positioning and ask them to describe the brand back. Clarity is a pass.",
      category: "MISSING",
    });
  }

  // Identity consistency—find obvious contradictions in uploaded materials
  const mentionsColor = (combined.match(/(black|white|cream|red|blue|green|orange|beige|grey|gray|burgundy|olive|purple|pink|yellow)/gi) ?? []).length;
  if (textAssets.length > 1 && mentionsColor > 8) {
    note({
      problem: "Multiple colour references across materials suggest the palette is not yet locked.",
      evidence: `Counted ${mentionsColor} colour mentions across ${textAssets.length} uploaded documents.`,
      severity: "medium",
      whyItMatters: "An evolving palette dilutes recognition and weakens the brand world.",
      confidence: 0.55,
      recommendation: "Lock a primary 2–3 colour palette and a supporting neutral, then encode it in the brand book.",
      alternatives: ["Treat colour as a season-by-season decision", "Anchor the palette to a single hero reference image"],
      visualSolution: "Palette board + asset tags in the Asset Library.",
      test: "Match-test: would a follower recognize the palette from a crop with no logo?",
      category: "OBSERVED",
    });
  }

  // Website findings
  if (health.reachable) {
    const issues: Array<Partial<Finding> & { problem: string; evidence: string; severity: Finding["severity"]; confidence: number; whyItMatters: string; recommendation: string }> = [];
    if (!health.hasH1)
      issues.push({
        problem: "No clear H1 hero headline detected.",
        evidence: "The rendered page has no top-level H1 heading, so the value proposition isn't stated up top.",
        severity: "high", confidence: 0.8,
        whyItMatters: "The first thing a visitor reads must state what the brand is and the one action to take.",
        recommendation: "Add a single H1 that states category + differentiation + the primary CTA below it.",
      });
    if (!health.hasCta)
      issues.push({
        problem: "No obvious primary call-to-action detected.",
        evidence: `Common CTAs (add to cart / shop now / join) were not present on the homepage.`,
        severity: "critical", confidence: 0.8,
        whyItMatters: "Without a visible next step, discovery never becomes interest or purchase.",
        recommendation: "Build a one-action CTA hierarchy per screen and test the primary CTA above the fold.",
      });
    if (!health.hasReviews)
      issues.push({
        problem: "No visible social proof or reviews.",
        evidence: "No review/rating language detected on the analysed page.",
        severity: "high", confidence: 0.75,
        whyItMatters: "Fashion purchase decisions are de-risked by proof; without it, trust has to be earned from scratch each time.",
        recommendation: "Surface a reviews block, press strip, or UGC near the point of decision.",
      });
    if (!health.hasShippingReturns)
      issues.push({
        problem: "Shipping and returns are not clearly surfaced.",
        evidence: "No shipping/returns/delivery language detected.",
        severity: "medium", confidence: 0.7,
        whyItMatters: "Payments and returns are common reasons for cart abandonment in apparel.",
        recommendation: "Add a prominent shipping + returns line near the buy button and on the product page.",
      });

    if (health.wordCount > 0 && health.wordCount < 120)
      issues.push({
        problem: "Very little on-page copy was detected.",
        evidence: `Homepage contains about ${health.wordCount} words of text.`,
        severity: "high", confidence: 0.85,
        whyItMatters: "Sparse copy often means the brand story, product benefit and CTA all collapse into one paragraph.",
        recommendation: "Expand the value proposition, product storytelling and trust copy, then A/B the density.",
      });

    for (const i of issues) {
      note({
        problem: i.problem,
        evidence: i.evidence,
        severity: i.severity,
        whyItMatters: i.whyItMatters,
        confidence: i.confidence,
        recommendation: i.recommendation,
        alternatives: ["A/B test the recommended change", "Test two headline framings", "Ask 5 customers to describe the page in one word"],
        visualSolution: "Redesign the relevant section in Design Studio (via 'REDESIGN THIS').",
        test: "Record the current conversion baseline, ship the change, compare the primary action rate.",
        category: "OBSERVED",
        outcomeId: 3,
      });
    }
  } else {
    note({
      problem: "The live website could not be reached for analysis.",
      evidence: `Attempted ${health.url}. The site may need auth, be slow, or block automated access.`,
      severity: "medium",
      whyItMatters: "Website friction is where most abandonment happens, so it matters for Outcomes 03 and 04.",
      confidence: 0.6,
      recommendation: "Upload homepage/product/checkout screenshots or exported HTML so the same analysis can run.",
      alternatives: ["Provide screenshots", "Provide a screenshot of mobile + desktop", "Paste the key copy"],
      visualSolution: "Analyse and redesign the captured screenshots.",
      test: "Once reachable, run the full website health scan.",
      category: "MISSING",
      outcomeId: 3,
    });
  }

  // Content engine observations
  const hookWords = /(hook|storytelling|behind|how to|tips|process|lookbook|fit check|unboxing)/.test(low);
  const pillarWords = /(pillar|series|episode|weekly|every friday|drop).{0,40}(drop|series|episode|friday)/i.test(low);
  if (!hookWords && !pillarWords) {
    note({
      problem: "No content system is evident — posts appear ad-hoc.",
      evidence: `Uploaded materials (${textAssets.length}) contain no recurring pillars, formats, or hooks.`,
      severity: "medium", confidence: 0.6,
      whyItMatters: "Ad-hoc content burns time and never compounds into a recognizable feed.",
      recommendation: "Define pillars and a repeating format system in Outcome 05.",
      alternatives: ["Start with 3 pillars", "Start with one signature format", "Batch two weeks in one shoot"],
      visualSolution: "Content pillars board + repeatable templates.",
      test: "Post 6 on-system posts and measure saves/engagement consistency.",
      category: "MISSING",
      outcomeId: 5,
    });
  }

  // If essentially nothing was provided
  if (textAssets.length === 0 && !health.reachable) {
    note({
      problem: "Very little evidence has been provided yet.",
      evidence: "No text materials uploaded and no reachable website. A full analysis needs real input.",
      severity: "low", confidence: 0.5,
      whyItMatters: "Accurate analysis requires evidence; the OS will not invent findings.",
      recommendation: "Upload brand guidelines, a lookbook, or marketing copy — or add a website URL — then re-run.",
      alternatives: ["Upload a pitch deck", "Paste key copy", "Add a website"],
      visualSolution: "—",
      test: "Re-run the first-pass analysis after adding evidence.",
      category: "MISSING",
    });
  }

  return findings;
}

export function buildQuestions(project: Project, findings: Finding[]): string[] {
  const q: string[] = [];
  const hasPositioning = project.description.length > 60;
  if (!hasPositioning && !project.industry) q.push("Who is the brand for, and what decision are you helping them make?");
  if (!project.market) q.push("Which market/region is this launching in first?");
  if (!findings.some((f) => f.category === "OBSERVED" || f.category === "CONFIRMED")) q.push("Can you share your strongest competitor or a brand you admire in this space?");
  if (!project.socialUrls.length) q.push("What are your social handles / channels?");
  q.push("What's the single most important action a customer should take from the website?");
  return q.slice(0, 4);
}

export function buildAnalysis(project: Project, health: WebsiteHealth, findings: Finding[]): Analysis {
  const confirmed = findings.filter((f) => f.category === "CONFIRMED" || f.category === "OBSERVED").length;
  const missing = findings.filter((f) => f.category === "MISSING" || f.category === "UNCERTAIN").length;
  return {
    id: uid("an"),
    ranAt: new Date().toISOString(),
    sourceCounts: {
      textFiles: health.reachable ? 1 : 0,
      website: health.reachable ? 1 : 0,
      userInput: project.description ? 1 : 0,
    },
    websiteHealth: health,
    summary:
      confirmed >= missing
        ? `First pass based on real evidence is complete. ${confirmed} findings observed from what we can verify; the remaining ${missing} need material you can supply.`
        : `First pass is partially evidence-limited: ${confirmed} findings observed, ${missing} can't be verified yet and are listed for you to supply rather than guessed.`,
  };
}
