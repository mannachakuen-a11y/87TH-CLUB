import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Seg, Empty } from "../components/ui";
import { Ic } from "../lib/icons";
import type { BrainItem } from "../lib/types";

export default function BrandBrain() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [tab, setTab] = useState("memory");

  if (!p) return <PageHead title="Brand Brain" sub="Open or create a project first." />;
  const items = p.brainItems ?? [];
  const decisions = p.decisions ?? [];

  const setApproval = (item: BrainItem, state2: "approved" | "rejected") => {
    updateProject({ id: p.id, brainItems: p.brainItems.map((b) => (b.id === item.id ? { ...b, approvalState: state2, version: b.version + 1 } : b)) });
    log(p.id, "user", "decision", `${state2 === "approved" ? "Approved" : "Rejected"} direction: ${item.data?.title}`);
  };

  const recordDecision = () => {
    const title = prompt("What did you decide?");
    if (!title) return;
    const why = prompt("Why?") || "";
    const changed = prompt("What changed (optional)?") || undefined;
    updateProject({ id: p.id, decisions: [...(p.decisions ?? []), { id: Math.random().toString(36), title, why, changed, createdAt: new Date().toISOString(), outcomeId: p.currentOutcomeId }] });
    log(p.id, "user", "decision", `Logged decision: ${title}`);
  };

  return (
    <div>
      <PageHead
        eyebrow="Brand Brain"
        title="Everything the brand remembers."
        sub="Persistent memory: facts, positioning, world, visual rules, findings, decisions, approved & rejected directions, assets, references, analytics, learnings. Each item carries source, confidence, date, approval state and version."
        actions={<button className="btn btn-soft" onClick={recordDecision}><Ic.plus size={16} /> Log decision</button>}
      />

      <Seg options={[{ id: "memory", label: "Memory" }, { id: "decisions", label: "Decision Log" }]} value={tab} onChange={setTab} />

      {tab === "memory" ? (
        items.length === 0 ? (
          <div className="glass" style={{ marginTop: 16 }}><Empty icon={<Ic.book size={38} />} title="Brand brain is empty" sub="As you complete outcomes and approve directions, they land here." action={<button className="btn btn-accent" onClick={() => go("framework")}>Advance a framework outcome</button>} /></div>
        ) : (
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            {items.map((b) => (
              <div key={b.id} className="glass card">
                <div className="spread">
                  <span className="chip accent">{b.kind.replace("outcome-", "Outcome ")}</span>
                  <span className={`chip ${b.approvalState === "approved" ? "green" : b.approvalState === "rejected" ? "amber" : "outline"}`}>{b.approvalState ?? "pending"}</span>
                </div>
                <h3 style={{ margin: "10px 0 6px", fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{String(b.data?.title ?? b.kind)}</h3>
                <p className="small" style={{ lineHeight: 1.6 }}>{String(b.data?.content ?? "")}</p>
                {(b.data as any)?.img && <img src={(b.data as any).img} alt="" style={{ width: "100%", borderRadius: 12, margin: "10px 0", border: "1px solid var(--line)" }} />}
                <div className="small muted">source: {b.source} · conf {Math.round(b.confidence * 100)}% · v{b.version} · {new Date(b.date).toLocaleDateString()}</div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setApproval(b, "approved")}><Ic.check size={15} /> Approve</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setApproval(b, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <h3 style={{ marginTop: 18 }}>Decision Log</h3>
          <p className="muted small">What was decided, why, what was rejected and what changed. Mannas AI answers from here.</p>
          {decisions.length === 0 ? (
            <div className="glass"><Empty icon={<Ic.doc size={38} />} title="No decisions logged yet" sub="Record important creative decisions so the AI can answer 'what did we decide?'" action={<button className="btn btn-primary" onClick={recordDecision}>Log first decision</button>} /></div>
          ) : (
            <div className="stack" style={{ marginTop: 10 }}>
              {decisions.map((d) => (
                <div key={d.id} className="glass card">
                  <div className="spread">
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.title}</div>
                    <span className="small muted">{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>Because: {d.why}</div>
                  {d.changed && <div className="small" style={{ marginTop: 4 }}>Changed: {d.changed}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
