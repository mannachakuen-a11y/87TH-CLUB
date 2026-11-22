import type { Project, FrameworkOutcome } from "./types";
import { FRAMEWORK } from "./framework";
import { overallProgress, pendingSteps } from "./ai";

// ------------------------------------------------------------------
// Export Center. Produces real deliverables: strategy JSON, analytics
// CSV, the Brand Advancement Book (self-contained HTML), a case study,
// and a client-facing summary. Nothing here is decorative — each file
// is generated from actual project state.
// ------------------------------------------------------------------

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function exportJson(project: Project) {
  const payload = {
    meta: { exportedAt: new Date().toISOString(), brand: project.brandName, progress: overallProgress(project) },
    framework: FRAMEWORK,
    brand: {
      name: project.brandName,
      industry: project.industry,
      market: project.market,
      website: project.websiteUrl,
      description: project.description,
    },
    findings: project.findings,
    recommendations: project.recommendations,
    decisions: project.decisions,
    brain: project.brainItems,
    campaigns: project.campaigns,
    cinema: project.cinemaProjects,
    experiments: project.experiments,
    analytics: project.analyticsMetrics,
    pending: pendingSteps(project),
  };
  download(`mannas-dungeons_${slug(project.brandName)}_advancement.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportAnalyticsCsv(project: Project) {
  const rows = [
    ["metric", "value", "unit", "period", "source", "trend"].join(","),
    ...(project.analyticsMetrics ?? []).map((m) =>
      [csv(m.name), m.value, csv(m.unit), csv(m.period), csv(m.source), m.trend ?? ""].join(","),
    ),
  ];
  download(`mannas-dungeons_${slug(project.brandName)}_analytics.csv`, rows.join("\n"), "text/csv");
}

export function exportFindingsCsv(project: Project) {
  const rows = [
    ["category", "severity", "problem", "evidence", "confidence", "recommendation"].join(","),
    ...(project.findings ?? []).map((f) =>
      [csv(f.category), f.severity, csv(f.problem), csv(f.evidence), f.confidence, csv(f.recommendation)].join(","),
    ),
  ];
  download(`mannas-dungeons_${slug(project.brandName)}_findings.csv`, rows.join("\n"), "text/csv");
}

function csv(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
}

// ---- Brand Advancement Book (string, so can be previewed in a tab) ----
export function buildBrandBook(project: Project): { html: string; title: string } {
  const o = (id: number): FrameworkOutcome => FRAMEWORK.find((x) => x.id === id)!;
  const approvedRecs = (project.recommendations ?? []).filter((r) => r.status === "approved");
  const findingsCount = (project.findings ?? []).length;
  const completedSteps = FRAMEWORK.flatMap((out) => out.steps).filter((st) => {
    const status = project.steps[st.key];
    return !!status && status !== "pending";
  }).length;
  const totalSteps = FRAMEWORK.reduce((a, b) => a + b.steps.length, 0);

  const outcomeRows = FRAMEWORK.map((out) => {
    const done = out.steps.filter((st) => {
      const status = project.steps[st.key];
      return !!status && status !== "pending";
    }).length;
    const metas: string[] = [];
    (project.brainItems ?? []).filter((b) => b.kind === `outcome-${out.id}`).forEach((b) => metas.push(`<li>${escapeHtml(String(b.data?.title ?? b.data ?? ""))}</li>`));
    return `<tr><td>${out.number}</td><td>${escapeHtml(out.title)}</td><td>${done}/${out.steps.length}</td><td>${
      metas.length ? `<ul>${metas.join("")}</ul>` : `<span class="dim">—</span>`
    }</td></tr>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.brandName)} — Brand Advancement Book</title>
<style>
  :root{--ink:#0b0b0c;--red:#FF3231;--line:rgba(11,11,12,.12)}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;color:var(--ink);background:#fff;line-height:1.6}
  .wrap{max-width:880px;margin:0 auto;padding:64px 40px}
  .eyebrow{font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:.35em;text-transform:uppercase;font-size:11px;color:var(--red);font-weight:700}
  h1{font-family:Impact,'Arial Black','Franklin Gothic Heavy',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;font-size:64px;line-height:1.0;margin:14px 0 8px}
  .sub{font-size:18px;color:#555;max-width:640px}
  .rule{height:3px;background:var(--ink);margin:40px 0}
  h2{font-family:Impact,'Arial Black','Franklin Gothic Heavy',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;font-size:30px;margin:0 0 8px}
  h3{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:.2em;color:#999;margin:28px 0 8px}
  p{color:#333;margin-bottom:12px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:12px}
  .stat{border:1px solid var(--line);border-radius:6px;padding:18px}
  .num{font-family:Impact,'Arial Black',sans-serif;font-weight:900;font-size:40px;letter-spacing:-.02em}
  .lbl{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#999;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{font-family:'Helvetica Neue',Arial,sans-serif;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#999;border-bottom:1px solid var(--line);padding:8px}
  td{padding:12px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  ul{margin:4px 0 0 16px}
  .card{border:1px solid var(--line);border-radius:16px;padding:22px;margin:14px 0}
  .tag{display:inline-block;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:3px 9px;border-radius:999px;background:#0b0b0c;color:#fff;margin-bottom:8px}
  .tag.red{background:var(--red)}
  .foot{margin-top:56px;border-top:1px solid var(--line);padding-top:20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999}
  .dim{color:#bbb}
</style></head><body><div class="wrap">
  <div class="eyebrow">Mannas Dungeons</div>
  <h1>${escapeHtml(project.brandName)}<br>Brand Advancement Book</h1>
  <p class="sub">${escapeHtml(project.description || "A private brand advancement.")} — prepared by Mannas Dungeons Brand Advancement OS.</p>
  <div class="rule"></div>
  <div class="grid">
    <div class="stat"><div class="num">${overallProgress(project)}%</div><div class="lbl">Advanced</div></div>
    <div class="stat"><div class="num">${completedSteps}/${totalSteps}</div><div class="lbl">Steps complete</div></div>
    <div class="stat"><div class="num">${findingsCount}</div><div class="lbl">Findings</div></div>
    <div class="stat"><div class="num">${approvedRecs.length}</div><div class="lbl">Approved</div></div>
  </div>

  <h3>01 · Summary</h3>
  <p>${escapeHtml(project.analysis?.summary || "First-pass analysis summary to be generated once evidence is provided.")}</p>

  <h3>02 · The Framework</h3>
  <table><thead><tr><th>#</th><th>Outcome</th><th>Progress</th><th>Key approved output</th></tr></thead><tbody>${outcomeRows}</tbody></table>

  <h3>03 · Identity (Outcome 01)</h3>
  ${identityBlock(project, o(1))}

  <h3>04 · Brand World (Outcome 02)</h3>
  ${worldBlock(project, o(2))}

  <h3>05 · Customer Experience & Conversion</h3>
  <p>Website health: ${project.analysis?.websiteHealth ? `${project.analysis.websiteHealth.reachable ? `reachable (${project.analysis.websiteHealth.wordCount} words)` : "not reachable"}` : "not yet analysed"}. Friction findings: ${(project.findings ?? []).filter((f) => (f.outcomeId ?? 3) === 3).length}.</p>
  ${findingsList(project)}

  <h3>06 · Campaign & Content System</h3>
  ${campaignBlock(project)}

  <h3>07 · Acquisition Loop</h3>
  <p>Recommended loop: Attention → Interest → Consideration → Trust → Purchase → Experience → UGC → Review → Referral → New Attention.</p>

  <h3>08 · Analytics & Experiments</h3>
  ${analyticsBlock(project)}

  <h3>09 · Before / After</h3>
  ${beforeAfter(project)}

  <div class="foot">Generated ${new Date().toLocaleString()} by Mannas Dungeons. Business impact claims are only made where real measured data exists.</div>
</div></body></html>`;
  return { html, title: "Brand Advancement Book" };
}

function identityBlock(p: Project, o: FrameworkOutcome) {
  const items = (p.brainItems ?? []).filter((b) => b.kind === `outcome-${o.id}`);
  if (!items.length) return `<p class="dim">The outcome has not produced a locked identity yet. Complete Outcome 01 and approve the direction.</p>`;
  return items.map((b) => `<div class="card"><span class="tag red">${escapeHtml(String(b.data?.title ?? "Identity"))}</span><p>${escapeHtml(String(b.data?.content ?? ""))}</p></div>`).join("");
}

function worldBlock(p: Project, o: FrameworkOutcome) {
  const items = (p.brainItems ?? []).filter((b) => b.kind === `outcome-${o.id}`);
  if (!items.length) return `<p class="dim">The brand world hasn't been approved yet.</p>`;
  return items.map((b) => `<div class="card"><span class="tag">${escapeHtml(String(b.data?.title ?? "World"))}</span><p>${escapeHtml(String(b.data?.content ?? ""))}</p></div>`).join("");
}

function findingsList(p: Project) {
  const fs = (p.findings ?? []).slice(0, 6);
  if (!fs.length) return `<p class="dim">No findings recorded.</p>`;
  return fs.map((f) => `<div class="card"><span class="tag ${f.severity === "critical" ? "red" : ""}">${f.severity}</span><p><strong>${escapeHtml(f.problem)}</strong> — ${escapeHtml(f.recommendation)}</p></div>`).join("");
}

function campaignBlock(p: Project) {
  const cs = (p.campaigns ?? []).slice(0, 3);
  if (!cs.length) return `<p class="dim">No campaign created yet.</p>`;
  return cs.map((c) => `<div class="card"><span class="tag red">${escapeHtml(c.name)}</span><h3 style="margin:2px 0 6px">${escapeHtml(c.bigIdea)}</h3><p>${escapeHtml(c.objective)}</p></div>`).join("");
}

function analyticsBlock(p: Project) {
  const ms = (p.analyticsMetrics ?? []).slice(0, 8);
  if (!ms.length) return `<p class="dim">No real metrics connected. Analytics only report metrics you actually connect — connect a source or enter measured numbers, nothing is inferred.</p>`;
  return `<table><thead><tr><th>Metric</th><th>Value</th><th>Period</th><th>Source</th></tr></thead><tbody>${ms.map((m) => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(String(m.value))} ${escapeHtml(m.unit)}</td><td>${escapeHtml(m.period)}</td><td>${escapeHtml(m.source)}</td></tr>`).join("")}</tbody></table>`;
}

function beforeAfter(p: Project) {
  const antes = (p.decisions ?? []).filter((d) => d.changed || d.rejected).length;
  return `<p>${antes ? `The brand was advanced through ${antes} recorded decision(s) (changes made and directions rejected). Approved directions are now the authoritative context.` : "Record decisions in the Decision Log to build the before/after account."}</p>`;
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportBrandBook(project: Project) {
  const { html, title } = buildBrandBook(project);
  download(`mannas-dungeons_${slug(project.brandName)}_${slug(title)}.html`, html, "text/html");
}

export function exportCaseStudy(project: Project): string {
  const cs = (project.campaigns ?? [])[0];
  const findings = (project.findings ?? []).slice(0, 4);
  return `# ${project.brandName} — Case Study

**Problem** — ${findings[0]?.problem ?? "Brand truth and web friction not yet diagnosed."}

**Findings** — ${findings.map((f) => `\n- ${f.problem} (${f.severity}, ${Math.round(f.confidence * 100)}%)`).join("") || "No findings yet."}

**Changes** — ${(project.decisions ?? []).map((d) => `\n- ${d.title}: ${d.why}`).join("") || "Approve directions to record the changes."}

**Why** — The framework advances the brand through identity, world, experience, conversion, content, campaign, acquisition and measurement. Every change is tied to a reason.

**Creative System** — ${cs?.bigIdea ?? "Not yet built."}

**Campaign** — ${cs?.name ?? "None yet."} ${cs?.launchSequence ?? ""}

**Website** — ${project.analysis?.websiteHealth?.reachable ? `Reachable; ${project.analysis.websiteHealth.wordCount} words; CTA ${project.analysis.websiteHealth.hasCta ? "present" : "missing"}.` : "Not yet analysed."}

**Results** — Measured metrics will only be reported where real data is connected (connect a source or log measured numbers).
`;
}

export function exportCaseStudyFile(project: Project) {
  download(`mannas-dungeons_${slug(project.brandName)}_case-study.md`, exportCaseStudy(project), "text/markdown");
}

export function downloadHTML(filename: string, html: string) {
  download(filename, html, "text/html");
}
