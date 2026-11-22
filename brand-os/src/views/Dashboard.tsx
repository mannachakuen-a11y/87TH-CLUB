import { useApp, useActiveProjectId, setActive, addProject } from "../lib/store";
import { useAppCtx } from "../app-context";
import { Ic } from "../lib/icons";
import { PageHead, Empty } from "../components/ui";
import { FRAMEWORK } from "../lib/framework";
import { overallProgress, pendingSteps } from "../lib/ai";
import { newProject } from "../lib/projects";

export default function Dashboard() {
  const state = useApp();
  const { go, openProject, openOutcome } = useAppCtx();
  const activeId = useActiveProjectId();
  const active = state.projects.find((p) => p.id === activeId);
  const recent = [...state.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const create = () => {
    const p = newProject();
    addProject(p);
    openProject(p.id);
    go("onboarding");
  };

  return (
    <div>
      <PageHead
        eyebrow={active ? "Current project" : "Brand Advancement OS"}
        title={active ? active.brandName : "Your advancement work."}
        sub={active ? undefined : "Sign in, add a brand, and take it through eight outcomes."}

        actions={!active ? <button className="btn btn-accent" onClick={create}><Ic.plus size={16} /> New brand project</button> : undefined}
      />

      {active && (
        <>
          {/* Hero statement */}
          <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "44px 0", marginBottom: 48 }}>
            <div className="spread" style={{ alignItems: "flex-end" }}>
              <div>
                <div className="kicker" style={{ marginBottom: 18 }}>Current project</div>
                <div style={{ fontSize: 54, lineHeight: 1.0, fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{active.brandName}</div>
                <div className="row" style={{ marginTop: 18 }}>
                  <span className="kicker" style={{ color: "var(--ink-soft)" }}>{active.industry || "Fashion"}</span>
                  {active.market && <span style={{ color: "var(--line-strong)", padding: "0 12px" }}>·</span>}
                  <span className="kicker" style={{ color: "var(--ink-soft)" }}>{active.market}</span>
                  {active.websiteUrl && <><span style={{ color: "var(--line-strong)", padding: "0 12px" }}>·</span><a className="kicker" href={active.websiteUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{active.websiteUrl.replace(/^https?:\/\//, "")}</a></>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="progress-label" style={{ fontSize: 72 }}>{overallProgress(active)}<span style={{ fontSize: 24, color: "var(--muted)" }}>%</span></div>
                <div className="kicker" style={{ marginTop: 8 }}>advanced</div>
              </div>
            </div>

            <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
              <div className="progress-track" style={{ height: 2 }}><div style={{ width: `${overallProgress(active)}%` }} /></div>
              <div style={{ display: "flex", gap: 22 }}>
                <Meta k="Pending" v={String(pendingSteps(active).length)} />
                <Meta k="Findings" v={String(active.findings?.length ?? 0)} />
                <Meta k="Approved" v={String(active.recommendations?.filter((r) => r.status === "approved").length ?? 0)} />
              </div>
            </div>

            <div className="row" style={{ marginTop: 30 }}>
              <button className="btn btn-accent" onClick={() => openOutcome(active.currentOutcomeId)}><Ic.layers size={15} /> Continue Outcome {String(active.currentOutcomeId).padStart(2, "0")}</button>
              <button className="btn btn-primary" onClick={() => openOutcome(Math.min(active.currentOutcomeId + 1, 8))}><Ic.chevR size={15} /> Next</button>
              <button className="btn btn-soft" onClick={() => go("analysis")}><Ic.search size={15} /> Findings</button>
            </div>
          </section>

          {/* The Eight Outcomes */}
          <div className="spread" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 26 }}>The Eight Outcomes</h3>
            <span className="kicker" style={{ color: "var(--muted)" }}>Everything exists to complete these.</span>
          </div>

          <div className="hairline-grid hairline-grid-4">
            {FRAMEWORK.map((o) => {
              const done = o.steps.filter((s) => active.steps[o.id + "." + s.key.split(".")[1]] && active.steps[o.id + "." + s.key.split(".")[1]] !== "pending").length;
              const pct = Math.round((done / o.steps.length) * 100);
              const current = o.id === active.currentOutcomeId;
              const complete = done === o.steps.length;
              return (
              <button key={o.id} onClick={() => openOutcome(o.id)}
                   style={{ textAlign: "left", background: current ? "var(--brand)" : "var(--panel)", border: current ? "1px solid var(--brand)" : 0, padding: 26, cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, transition: "background .2s var(--ease)", color: current ? "var(--white)" : "inherit" }}
                 >
                  <div className="spread" style={{ marginBottom: 42 }}>
                    <span style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, color: complete ? "var(--faint)" : current ? "var(--white)" : "var(--brand)" }}>{o.number}</span>
                    {current && <span style={{ width: 6, height: 6, borderRadius: "50%", background: current ? "var(--white)" : "var(--brand)", boxShadow: current ? "0 0 0 3px rgba(255,255,255,.25)" : "0 0 0 3px rgba(255,50,49,.22)" }} />}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.2, textTransform: "uppercase" }}>{o.title}</div>
                  <div className="small" style={{ color: current ? "rgba(255,255,255,.82)" : "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>{o.promise}</div>
                  <div style={{ marginTop: "auto" }}>
                    <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="small" style={{ color: current ? "rgba(255,255,255,.7)" : "var(--faint)" }}>{done}/{o.steps.length} steps</span>
                      <span className="mono" style={{ fontSize: 11, color: current ? "var(--white)" : "var(--muted)" }}>{pct}%</span>
                    </div>
                    <div className="progress-track progress-thin" style={{ marginTop: 8, background: current ? "rgba(255,255,255,.3)" : undefined }}><div style={{ width: `${pct}%`, background: current ? "var(--ink)" : undefined }} /></div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!active && (
        <div className="glass">
          <Empty
            icon={<Ic.box size={36} />}
            title="No brand project yet"
            sub="Create a project, add your materials, and the OS will run a real first-pass analysis then walk you through all eight outcomes."
            action={<button className="btn btn-accent" onClick={create}><Ic.plus size={16} /> Create your first brand project</button>}
          />
        </div>
      )}

      {recent.length > 1 && (
        <section style={{ marginTop: 48 }}>
          <h3 style={{ margin: "0 0 20px", fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 26, letterSpacing: "-0.01em" }}>All projects</h3>
          <div className="grid grid-3">
            {recent.map((pp) => (
              <button key={pp.id} className="glass card hover-lift" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => { openProject(pp.id); go("framework"); }}>
                <div className="spread">
                  <span style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 26, color: "var(--brand)" }}>{pp.brandName.slice(0, 2).toUpperCase()}</span>
                  <span className="chip">{pp.status}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 18, marginTop: 16 }}>{pp.brandName}</div>
                <div className="small muted">{pp.industry || "Fashion"} · {pp.market || "—"}</div>
                <div style={{ marginTop: 18 }}>
                  <div className="progress-track progress-thin"><div style={{ width: `${overallProgress(pp)}%` }} /></div>
                  <div className="small muted" style={{ marginTop: 8 }}>{overallProgress(pp)}% · Outcome {String(pp.currentOutcomeId).padStart(2, "0")}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, letterSpacing: "-0.01em" }}>{v}</div>
      <div className="kicker" style={{ color: "var(--muted)", marginTop: 2 }}>{k}</div>
    </div>
  );
}
