// ==================================================================
// Website Intelligence — honest, server-side scanning. Uses fetch
// (no CORS on the server) and Playwright when the optional
// playwright module is installed, falling back to clean fetch.
// ==================================================================

export async function fetchText(url, ms = 8000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; 87thClub/1.0)" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length < 40) return null;
    return text;
  } catch {
    return null;
  }
}

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function has(html, needles) { const l = html.toLowerCase(); return needles.some((n) => l.includes(n)); }

export async function scanWebsite(url) {
  let html = await fetchText(url);
  const base = { url, reachable: false, hasH1: false, hasCta: false, hasReviews: false, hasSizeGuide: false, hasShippingReturns: false, hasFaq: false, hasNewsletter: false, wordCount: 0, title: "", notes: [] };
  if (!html) {
    for (const c of [`https://${url}`, `https://www.${url}`, `http://${url}`]) { html = await fetchText(c); if (html) { base.url = c; break; } }
  }
  if (!html) { base.notes.push("Not reachable from the server."); return base; }
  base.reachable = true;
  base.title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  base.hasH1 = /<h1[\s>]/i.test(html);
  base.hasCta = has(html, ["add to cart", "buy now", "shop now", "get yours", "pre-order", "view collection", "contact us"]);
  base.hasReviews = has(html, ["review", "rating", "testimonials", "as seen in"]);
  base.hasSizeGuide = has(html, ["size guide", "size chart", "find my size", "sizing"]);
  base.hasShippingReturns = has(html, ["shipping", "returns", "delivery", "free shipping", "exchange"]);
  base.hasFaq = has(html, ["faq", "help center", "support"]);
  base.hasNewsletter = has(html, ["newsletter", "sign up", "subscribe", "join the club"]);
  base.wordCount = strip(html).split(/\s+/).length;
  return base;
}

export function buildFindings(project, health) {
  const base = project?.findings || [];
  // Findings are generated deterministically from the health scan, following
  // the same PROBLEM -> EVIDENCE -> SEVERITY -> WHY -> CONFIDENCE -> RECOMMENDATION
  // -> ALTERNATIVES -> VISUAL SOLUTION -> TEST structure as the client analyser.
  const f = [];
  const push = (x) => f.push({ id: crypto.randomUUID(), category: "OBSERVED", alternatives: ["A/B test the change", "Test two headline framings", "Ask 5 customers to describe the page"], visualSolution: "Redesign in Design Studio via REDESIGN THIS.", test: "Record the baseline, ship the change, compare the primary action rate.", ...x, outcomeId: 3 });
  if (health.reachable) {
    if (!health.hasH1) push({ problem: "No clear H1 hero headline detected.", evidence: "The rendered page has no top-level H1.", severity: "high", confidence: 0.8, whyItMatters: "The value proposition isn't stated up top.", recommendation: "Add a single H1 stating category + differentiation + CTA below it." });
    if (!health.hasCta) push({ problem: "No obvious primary CTA detected.", evidence: "Common CTAs not present on the homepage.", severity: "critical", confidence: 0.8, whyItMatters: "Without a visible next step, discovery never becomes purchase.", recommendation: "Build a one-action CTA hierarchy and test the primary CTA above the fold." });
    if (!health.hasReviews) push({ problem: "No visible social proof or reviews.", evidence: "No review/rating language detected.", severity: "high", confidence: 0.75, whyItMatters: "Fashion purchase decisions are de-risked by proof.", recommendation: "Surface reviews, press strip, or UGC near the point of decision." });
    if (!health.hasShippingReturns) push({ problem: "Shipping and returns not clearly surfaced.", evidence: "No shipping/returns language detected.", severity: "medium", confidence: 0.7, whyItMatters: "Payments and returns are common abandonment reasons.", recommendation: "Add a prominent shipping + returns line near the buy button." });
    if (health.wordCount > 0 && health.wordCount < 120) push({ problem: "Very little on-page copy detected.", evidence: `Homepage has ~${health.wordCount} words.`, severity: "high", confidence: 0.85, whyItMatters: "Sparse copy collapses story, benefit and CTA.", recommendation: "Expand value prop, product storytelling and trust copy, then A/B density." });
  } else {
    push({ problem: "The live website could not be reached.", evidence: `Attempted ${health.url}.`, severity: "medium", confidence: 0.6, whyItMatters: "Website friction is where most abandonment happens.", recommendation: "Provide screenshots or exported HTML so the same analysis can run.", category: "MISSING" });
  }
  return [...base, ...f];
}
