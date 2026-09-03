import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log, setStepStatus, addDesignDoc, pushNotification } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, toast, Modal } from "../components/ui";
import { Ic } from "../lib/icons";
import { FRAMEWORK, getOutcome } from "../lib/framework";
import { overallProgress } from "../lib/ai";
import { generateForOutcome } from "../lib/produce";
import type { Project, StepStatus } from "../lib/types";

export default function Framework() {
  const state = useApp();
  const { go, activeOutcome, openOutcome } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [confirm, setConfirm] = useState<null | { stepKey: string; title: string; doIt: () => void }>(null);

  if (!p) return <PageHead title="Framework" sub="Open or create a project first." />;

  const outcome = getOutcome(activeOutcome);
  const stepStatusOf = (stepKey: string): StepStatus => p.steps[`${outcome.id}.${stepKey}`] ?? "pending";

  const setStatus = (stepKey: string, status: StepStatus, result?: string) => {
    setStepStatus(p.id, outcome.id, stepKey, status, result);
    const step = outcome.steps.find((s) => s.key.split(".")[1] === stepKey);
    log(p.id, "user", "step", `${status === "completed" ? "Completed" : status === "skipped" ? "Skipped" : "Reopened"} step ${outcome.number}.${stepKey}: ${step?.title}`);
  };

  const produce = (o = outcome) => {
    const pr = generateForOutcome(p, o.id);
    if (pr.brainItem) updateProject({ id: p.id, brainItems: [...(p.brainItems ?? []), pr.brainItem] });
    if (pr.designDoc) addDesignDoc(pr.designDoc, p.id);
    const keyStep = o.steps[Math.min(1, o.steps.length - 1)].key.split(".")[1];
    setStepStatus(p.id, o.id, keyStep, "completed", pr.note);
    if (o.id === p.currentOutcomeId && o.id < 8) updateProject({ id: p.id, currentOutcomeId: o.id + 1 });
    log(p.id, "mannas-ai", "produce", `Deliverable generated for Outcome ${o.number}: ${pr.note}`);
    pushNotification(`Outcome ${o.number} deliverable ready`, pr.note, "success");
    toast(`Outcome ${o.number} deliverable generated`, "Approve, edit or regenerate it.", "success");
    go("design");
  };

  const doneSteps = outcome.steps.filter((s) => stepStatusOf(s.key.split(".")[1]) !== "pending").length;
  const outcomePct = Math.round((doneSteps / outcome.steps.length) * 100);

  const stepRow = (stepKey: string) => {
    const st = outcome.steps.find((s) => s.key.split(".")[1] === stepKey)!;
    const status = stepStatusOf(stepKey);
    return (
      <div key={stepKey} className={`step glass ${status}`} style={{ marginBottom: 10 }}>
        <div className="spread">
          <div className="row" style={{ gap: 18, minWidth: 0 }}>
            <div className="num">{stepKey.split(".")[1]}</div>
            <div>
              <div className="t">{st.title}</div>
              <div className="d">{st.detail}</div>
              <div className="kicker" style={{ marginTop: 8, color: "var(--faint)" }}>Deliverable · {st.deliverable}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 190 }}>
            <div className="state" style={{ color: status === "completed" ? "#15803d" : "var(--muted)" }}>
              {status === "completed" ? "Complete" : status === "skipped" ? "Skipped" : status === "in_progress" ? "In progress" : "Pending"}
            </div>
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end", gap: 6 }}>
              {status === "completed" ? (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatus(stepKey, "pending")}>Reopen</button>
                  <button className="btn btn-soft btn-sm" onClick={() => setConfirm({ stepKey, title: `Override "${st.title}"?`, doIt: () => { setStatus(stepKey, "pending"); toast("Step reopened for override.", "", "info"); } })}>Override</button>
                </>
              ) : (
                <>
                  {status === "skipped" && <button className="btn btn-primary btn-sm" onClick={() => setStatus(stepKey, "completed")}>Complete</button>}
                  {status !== "skipped" && (<>
                    <button className="btn btn-primary btn-sm" onClick={() => setStatus(stepKey, "completed")}>Complete</button>
                    <button className="btn btn-soft btn-sm" onClick={() => setStatus(stepKey, "in_progress")}>Start</button>
                  </>)}
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ stepKey, title: `Skip "${st.title}"?`, doIt: () => setStatus(stepKey, "skipped") })}>Skip</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHead
        eyebrow="Brand Advancement"
        title={outcome.title}
        sub={outcome.promise}
        actions={<span className="kicker" style={{ color: "var(--muted)" }}>{overallProgress(p)}% advanced</span>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", gap: 48, alignItems: "start" }}>
        {/* Outcome index */}
        <nav style={{ position: "sticky", top: 96 }}>
          <div className="kicker" style={{ color: "var(--muted)", marginBottom: 6 }}>The Eight Outcomes</div>
          <div className="stack" style={{ gap: 4 }}>
            {FRAMEWORK.map((o) => {
              const done = o.steps.filter((s) => p.steps[o.id + "." + s.key.split(".")[1]] && p.steps[o.id + "." + s.key.split(".")[1]] !== "pending").length;
              const isSel = activeOutcome === o.id;
              const isNext = o.id === p.currentOutcomeId;
              return (
                <button key={o.id} onClick={() => openOutcome(o.id)}
                  style={{ textAlign: "left", padding: "9px 10px", borderRadius: "var(--radius-sm)", background: isSel ? "var(--ink)" : "transparent", color: isSel ? "var(--bg)" : "var(--ink-soft)", border: 0, width: "100%", display: "flex", flexDirection: "column", gap: 4, transition: "background .2s var(--ease)", cursor: "pointer" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                    <span><span style={{ fontFamily: "var(--display)", marginRight: 8, fontWeight: 900, color: "var(--brand)" }}>{o.number}</span>{o.title}</span>
                    {isNext && !isSel && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />}
                  </span>
                  <div className="progress-track progress-thin" style={{ background: isSel ? "rgba(255,255,255,.28)" : "rgba(11,11,13,.1)" }}><div style={{ width: `${Math.round((done / o.steps.length) * 100)}%`, background: isSel ? "var(--brand)" : "var(--ink)" }} /></div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Outcome detail */}
        <div>
          <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 28, marginBottom: 28 }}>
            <div className="spread" style={{ alignItems: "flex-end" }}>
              <div>
                <div className="kicker" style={{ color: "var(--muted)" }}>Outcome {outcome.number} of 08</div>
                <div style={{ fontSize: 60, fontFamily: "var(--display)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {String(doneSteps).padStart(2, "0")}<span style={{ color: "var(--muted)", fontSize: 28 }}> / {outcome.steps.length}</span>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-accent" onClick={() => produce(outcome)}><Ic.spark size={16} /> Generate deliverable</button>
                <button className="btn btn-soft" onClick={() => go("design")}><Ic.pen size={16} /> Design Studio</button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-track" style={{ height: 2 }}><div style={{ width: `${outcomePct}%` }} /></div>
            </div>
          </div>

          {outcome.steps.map((s) => stepRow(s.key.split(".")[1]))}

          <div className="row" style={{ marginTop: 20 }}>
            {outcome.id < 8 && <button className="btn btn-primary" onClick={() => openOutcome(outcome.id + 1)}><Ic.chevR size={15} /> Next outcome</button>}
            <button className="btn btn-soft" onClick={() => go("dashboard")}>Back to project</button>
          </div>
        </div>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ""} footer={<>
        <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
        <button className="btn btn-accent" onClick={() => { confirm?.doIt(); setConfirm(null); }}>Confirm</button>
      </>}>
        <div className="muted" style={{ lineHeight: 1.55 }}>This changes the state of a step in the framework. It's tracked in the decision log.</div>
      </Modal>
    </div>
  );
}
