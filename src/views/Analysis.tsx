import { useApp, useActiveProjectId, updateProject, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, Tag, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import type { Finding, Recommendation } from "../lib/types";
import { uid } from "../lib/db";

const severityTone: Record<string, string> = { critical: "critical", high: "high", medium: "medium", low: "low" };

export default function Analysis() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);

  if (!p) return <Empty title="No project" sub="Open or create a project first." action={<button className="btn btn-accent" onClick={() => go("dashboard")}>Dashboard</button>} />;

  const findings = [...(p.findings ?? [])].sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
    return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
  });

  const approve = (f: Finding) => {
    const rec: Recommendation = { id: uid("rec"), title: f.problem, detail: f.recommendation, outcomeId: 3, status: "approved" };
    updateProject({ id: p.id, recommendations: [...(p.recommendations ?? []), rec] });
    log(p.id, "user", "recommendation", `Approved recommendation: ${f.problem}`);
    toast("Recommendation approved", "It's now part of the brand brain and feeds Outcome 01–04.", "success");
  };

  const persist = (f: Finding, status: Recommendation["status"]) => {
    const rec: Recommendation = { id: uid("rec"), title: f.problem, detail: f.recommendation, outcomeId: 3, status };
    updateProject({ id: p.id, recommendations: [...(p.recommendations ?? []), rec] });
    log(p.id, "user", "recommendation", `${status} recommendation: ${f.problem}`);
    toast(status === "rejected" ? "Dismissed" : "Saved", "", status === "rejected" ? "info" : "success");
  };

  const hasAnalysis = !!p.analysis;

  return (
    <div>
      <PageHead
        eyebrow="AI first-pass analysis"
        title="Here's what I found."
        sub="Every finding is evidence-backed and labelled CONFIRMED, USER PROVIDED, OBSERVED, INFERRED, RECOMMENDED, UNCERTAIN or MISSING. I never invent private analytics."
        actions={<button className="btn btn-accent" onClick={() => go("framework")}><Ic.arrowR size={16} /> Start Outcome 01</button>}
      />

      {!hasAnalysis ? (
        <div className="glass">
          <Empty icon={<Ic.search size={38} />} title="First pass not run yet" sub="Add a website URL or upload materials and run the analysis from intake." action={<button className="btn btn-primary" onClick={() => go("onboarding")}>Run analysis</button>} />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 300px", alignItems: "start" }}>
          <div>
            {/* Health summary */}
            <div className="glass card-lg" style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Website intelligence</div>
              <div className="spread">
                <div>
                  <h3 style={{ margin: 0 }}>{p.analysis?.websiteHealth?.reachable ? p.analysis.websiteHealth.url : "Site not reachable"}</h3>
                  <div className="small muted">{p.analysis?.websiteHealth?.wordCount ?? 0} words · {p.analysis?.websiteHealth?.hasH1 ? "H1 ✓" : "H1 missing"}</div>
                </div>
                <span className={`chip ${p.analysis?.websiteHealth?.reachable ? "green" : "amber"}`}>{p.analysis?.websiteHealth?.reachable ? "reachable" : "unreachable"}</span>
              </div>
              {p.analysis?.websiteHealth?.hasH1 === false && <div className="divider" />}
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--line)" }}>
                {[
                  ["CTA", p.analysis?.websiteHealth?.hasCta],
                  ["Reviews", p.analysis?.websiteHealth?.hasReviews],
                  ["Size guide", p.analysis?.websiteHealth?.hasSizeGuide],
                  ["Shipping", p.analysis?.websiteHealth?.hasShippingReturns],
                  ["FAQ", p.analysis?.websiteHealth?.hasFaq],
                  ["Newsletter", p.analysis?.websiteHealth?.hasNewsletter],
                ].map(([label, ok]) => (
                  <div key={label as string} style={{ background: "var(--panel)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="small" style={{ color: "var(--muted)" }}>{label}</span>
                    <span className="mono" style={{ fontSize: 12, color: ok ? "#15803d" : "var(--faint)", fontWeight: 600 }}>{ok ? "YES" : "NO"}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="muted small">{p.analysis?.summary}</p>

            {findings.length === 0 ? (
              <div className="glass"><Empty title="No findings" sub="Nothing surfaced yet — add more evidence and re-run." /></div>
            ) : (
              findings.map((f) => (
                <div className="finding" key={f.id}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="chip"><span className={`sev ${f.severity}`} /> {f.severity}</span>
                    <span className="cat-chip" style={{ background: catBg(f.category), color: "#0b0b0c" }}>{f.category}</span>
                  </div>
                  <h4>{f.problem}</h4>
                  <div className="small muted" style={{ marginBottom: 10 }}>Confidence {Math.round(f.confidence * 100)}%</div>
                  <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                    <Meta label="Evidence" v={f.evidence} />
                    <Meta label="Why it matters" v={f.whyItMatters} />
                    <Meta label="Recommendation" v={f.recommendation} tone="accent" />
                    <Meta label="Alternatives" v={f.alternatives.join(" · ")} />
                    <Meta label="Visual solution" v={f.visualSolution} />
                    <Meta label="Test" v={f.test} />
                  </div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => approve(f)}><Ic.check size={15} /> Approve</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => persist(f, "rejected")}>Reject</button>
                    <button className="btn btn-soft btn-sm" onClick={() => { log(p.id, "user", "redesign", `Opened redesign for: ${f.problem}`); go("design"); }}><Ic.pen size={15} /> REDESIGN THIS</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right rail */}
          <div className="stack">
            <div className="glass card-lg">
              <h3 style={{ marginTop: 0 }}>Source breakdown</h3>
              <table className="tbl">
                <tbody>
                  {Object.entries(p.analysis?.sourceCounts ?? {}).map(([k, v]) => (
                    <tr key={k}><td className="small">{k}</td><td style={{ textAlign: "right" }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="glass card-lg">
              <h3 style={{ marginTop: 0 }}>High-value questions</h3>
              {p.pendingQuestions?.length ? (
                <ol style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5 }}>
                  {p.pendingQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              ) : (
                <span className="small muted">No open questions — enough evidence to proceed.</span>
              )}
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
              <div className="kicker" style={{ color: "var(--accent)", marginBottom: 12 }}>Next</div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 22, lineHeight: 1.1, marginBottom: 8 }}>Advance the identity</div>
              <p className="small muted" style={{ lineHeight: 1.6 }}>Outcome 01 defines positioning, audience, promise and message. Approve the direction and it becomes the authoritative brand core.</p>
              <button className="btn btn-primary btn-sm" onClick={() => go("framework")}>Begin Outcome 01</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, v, tone }: { label: string; v: string; tone?: "accent" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10 }}>
      <span className="small" style={{ fontWeight: 700, color: tone === "accent" ? "var(--accent)" : "var(--muted)" }}>{label}</span>
      <span style={{ color: tone === "accent" ? "var(--ink)" : "var(--ink-soft)" }}>{v || "—"}</span>
    </div>
  );
}

function catBg(c: string) {
  const m: Record<string, string> = { CONFIRMED: "#cfe9d8", "USER_PROVIDED": "#cfe9d8", OBSERVED: "#f5e3c8", INFERRED: "#d9e6f5", RECOMMENDED: "#f5d3d3", UNCERTAIN: "#eee", MISSING: "#f0f0f0" };
  return m[c] ?? "#eee";
}
