import { useState } from "react";
import { useApp, useActiveProjectId, addMetric, addExperiment, updateExperiment, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, Modal, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { uid } from "../lib/db";

const KPIS = [
  ["Revenue", "$"], ["Orders", ""], ["AOV", "$"], ["Conversion", "%"], ["Traffic", ""],
  ["Reach", ""], ["Engagement", ""], ["Followers", ""], ["Repeat purchase", "%"], ["CAC", "$"], ["LTV", "$"],
];

export default function Analytics() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [metricOpen, setMetricOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [m, setM] = useState({ name: "", value: "", unit: "", period: "This month", source: "Manual / measured" });
  const [e, setE] = useState({ hypothesis: "", control: "", variant: "", metric: "Conversion rate" });

  if (!p) return <PageHead title="Analytics" sub="Open or create a project first." />;
  const metrics = p.analyticsMetrics ?? [];
  const experiments = p.experiments ?? [];

  const addM = () => {
    if (!m.name.trim()) return;
    addMetric(p.id, { id: uid("met"), name: m.name, value: +m.value || 0, unit: m.unit, period: m.period, source: m.source, organic: true });
    log(p.id, "user", "analytics", `Logged measured metric: ${m.name} = ${m.value}${m.unit}`);
    toast("Metric logged", "Stored as measured data. It's only reported where real data exists.", "success");
    setMetricOpen(false); setM({ name: "", value: "", unit: "", period: "This month", source: "Manual / measured" });
  };

  const addE = () => {
    if (!e.hypothesis.trim()) return;
    addExperiment(p.id, { id: uid("exp"), ...e, startDate: new Date().toISOString().slice(0, 10), status: "planned" });
    toast("Experiment added", "Hypothesis, control, variant and metric recorded. Run it, then set the result.", "success");
    setExpOpen(false); setE({ hypothesis: "", control: "", variant: "", metric: "Conversion rate" });
  };

  return (
    <div>
      <PageHead
        eyebrow="Measurable Growth System"
        title="Know what's working, and why."
        sub="Track revenue, orders, conversion, AOV, traffic, reach, engagement, CAC, repeat purchase, LTV, content/campaign/product performance — only where real data exists. Nothing is fabricated."
        actions={<>
          <button className="btn btn-soft" onClick={() => go("integrations")}><Ic.plug size={16} /> Connect a source</button>
          <button className="btn btn-accent" onClick={() => setMetricOpen(true)}><Ic.plus size={16} /> Log measured metric</button>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: "repeat(6,1fr)", marginBottom: 20 }}>
        {KPIS.map(([k, pre]) => {
          const existing = metrics.find((x) => x.name.toLowerCase() === k.toLowerCase());
          return (
            <div key={k} className="glass card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 22 }}>{pre}{existing ? existing.value : "—"}</div>
              <div className="small" style={{ fontWeight: 600 }}>{k}</div>
              <div className="small muted">{existing ? existing.source : "no data"}</div>
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,.8fr)", alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0 }}>Measured metrics</h3>
          <p className="small muted" style={{ marginTop: 2 }}>These are real, logged values — not estimates.</p>
          {metrics.length === 0 ? (
            <div className="glass" style={{ marginTop: 12 }}><Empty icon={<Ic.chart size={38} />} title="No metrics connected" sub="Log measured numbers here, or connect Shopify/Stripe/GA4 in Integrations to pull real data." action={<button className="btn btn-primary" onClick={() => setMetricOpen(true)}>Log a measured metric</button>} /></div>
          ) : (
            <table className="tbl glass" style={{ marginTop: 12, overflow: "hidden", borderRadius: 14, border: "1px solid var(--line)" }}>
              <thead><tr><th>Metric</th><th>Value</th><th>Period</th><th>Source</th></tr></thead>
              <tbody>
                {metrics.map((mm) => (
                  <tr key={mm.id}>
                    <td style={{ fontWeight: 600 }}>{mm.name}</td>
                    <td>{mm.value} {mm.unit}</td>
                    <td className="small">{mm.period}</td>
                    <td className="small muted">{mm.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ margin: "26px 0 2px" }}>Experiment Engine</h3>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="small muted">DATA → INSIGHT → HYPOTHESIS → TEST → RESULT → LEARNING → NEXT ACTION</span>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setExpOpen(true)}><Ic.plus size={15} /> New experiment</button>
          </div>
          {experiments.length === 0 ? (
            <div className="glass"><Empty icon={<Ic.refresh size={38} />} title="No experiments yet" sub="Every change should be a test. Log a hypothesis, run it, then record the result and learning." action={<button className="btn btn-primary" onClick={() => setExpOpen(true)}>Create experiment</button>} /></div>
          ) : (
            <div className="stack">
              {experiments.map((ex) => (
                <div key={ex.id} className="glass card">
                  <div className="spread">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.hypothesis}</div>
                    <span className={`chip ${ex.status === "complete" ? "green" : ex.status === "running" ? "accent" : "outline"}`}>{ex.status}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 6 }}>Control: {ex.control || "—"} · Variant: {ex.variant || "—"} · Metric: {ex.metric}</div>
                  {ex.result && <div className="small" style={{ marginTop: 6 }}>Result: {ex.result}</div>}
                  {ex.learning && <div className="small" style={{ marginTop: 4 }}>Learning: {ex.learning}</div>}
                  {ex.nextAction && <div className="small accent-ish" style={{ marginTop: 4 }}>Next: {ex.nextAction}</div>}
                  <div className="row" style={{ marginTop: 12 }}>
                    {ex.status === "planned" && <button className="btn btn-soft btn-sm" onClick={() => updateExperiment(p.id, ex.id, { status: "running" })}>Start</button>}
                    {ex.status === "running" && <button className="btn btn-soft btn-sm" onClick={() => { const res = prompt("Result?"); const learn = prompt("Learning?"); const next = prompt("Next action?"); updateExperiment(p.id, ex.id, { status: "complete", result: res || undefined, learning: learn || undefined, nextAction: next || undefined, endDate: new Date().toISOString().slice(0, 10) }); }}>Record result</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>How measurement stays honest</h3>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            The OS never guesses a number. Every metric either comes from a connected source (Shopify, Stripe, GA4) or a number you log as measured. That's the only way it appears in the dashboard and the Brand Advancement Book.
          </p>
          <div className="timeline" style={{ marginTop: 8 }}>
            <div><strong>Connect</strong><div className="small muted">Pull a real source via Integrations.</div></div>
            <div><strong>Insight</strong><div className="small muted">Read what the number says.</div></div>
            <div><strong>Test</strong><div className="small muted">Ship a change, measure the delta.</div></div>
            <div><strong>Learning</strong><div className="small muted">Turn the result into the next action.</div></div>
          </div>
        </div>
      </div>

      <Modal open={metricOpen} onClose={() => setMetricOpen(false)} title="Log a measured metric" footer={<>
        <button className="btn btn-ghost" onClick={() => setMetricOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={addM}>Save</button>
      </>}>
        <div className="field"><label>Metric name</label><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Revenue" /></div>
        <div className="grid grid-2">
          <div className="field"><label>Value</label><input className="input" value={m.value} onChange={(e) => setM({ ...m, value: e.target.value })} placeholder="1200" /></div>
          <div className="field"><label>Unit</label><input className="input" value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value })} placeholder="$ / % / units" /></div>
        </div>
        <div className="field"><label>Period</label><input className="input" value={m.period} onChange={(e) => setM({ ...m, period: e.target.value })} placeholder="Last 30 days" /></div>
      </Modal>

      <Modal open={expOpen} onClose={() => setExpOpen(false)} title="New experiment" footer={<>
        <button className="btn btn-ghost" onClick={() => setExpOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={addE}>Create</button>
      </>}>
        <div className="field"><label>Hypothesis</label><input className="input" value={e.hypothesis} onChange={(x) => setE({ ...e, hypothesis: x.target.value })} placeholder="Adding reviews above the fold lifts conversion" /></div>
        <div className="field"><label>Control</label><input className="input" value={e.control} onChange={(x) => setE({ ...e, control: x.target.value })} placeholder="Current page" /></div>
        <div className="field"><label>Variant</label><input className="input" value={e.variant} onChange={(x) => setE({ ...e, variant: x.target.value })} placeholder="Page with trust strip" /></div>
        <div className="field"><label>Metric</label><input className="input" value={e.metric} onChange={(x) => setE({ ...e, metric: x.target.value })} placeholder="Conversion rate" /></div>
      </Modal>
    </div>
  );
}
