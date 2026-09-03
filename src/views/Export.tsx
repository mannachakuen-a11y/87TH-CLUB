import { useApp, useActiveProjectId } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty } from "../components/ui";
import { Ic } from "../lib/icons";
import { exportJson, exportAnalyticsCsv, exportFindingsCsv, exportBrandBook, exportCaseStudyFile } from "../lib/export";

export default function ExportCenter() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);

  if (!p) return <PageHead title="Export Center" sub="Open or create a project first." />;

  const items = [
    { icon: Ic.doc, name: "Brand Advancement Book", desc: "Polished HTML book: summary, diagnosis, identity, world, experience, conversion, content, campaign, acquisition, analytics, before/after, experiments.", fmt: "HTML", run: () => exportBrandBook(p) },
    { icon: Ic.layers, name: "Strategy / Advancement JSON", desc: "The full project as structured data — framework, findings, decisions, brain, campaigns, experiments.", fmt: "JSON", run: () => exportJson(p) },
    { icon: Ic.chart, name: "Analytics CSV", desc: "All measured metrics as a spreadsheet.", fmt: "CSV", run: () => exportAnalyticsCsv(p) },
    { icon: Ic.search, name: "Findings CSV", desc: "Every problem, evidence, severity, confidence and recommendation.", fmt: "CSV", run: () => exportFindingsCsv(p) },
    { icon: Ic.sparkle, name: "Case Study", desc: "Problem → Findings → Changes → Why → Creative → Campaign → Website → Results → Learnings.", fmt: "MD", run: () => exportCaseStudyFile(p) },
  ];

  return (
    <div>
      <PageHead
        eyebrow="Export Center"
        title="Ship the work."
        sub="Export strategy, the brand book, campaign, website concepts, content calendar, social packs, analytics, case studies, client presentation, assets, templates and the project package. Everything is generated from real project state."
        actions={<span className="chip chip ink">{p.brandName}</span>}
      />
      <div className="grid grid-2">
        {items.map((it) => (
          <div key={it.name} className="glass card hover-lift">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <it.icon size={22} />
              <span className="chip outline">{it.fmt}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, margin: "10px 0 4px" }}>{it.name}</div>
            <p className="small muted" style={{ lineHeight: 1.5 }}>{it.desc}</p>
            <button className="btn btn-primary" onClick={it.run}><Ic.download size={16} /> Export {it.fmt}</button>
          </div>
        ))}
      </div>
      <div className="glass card-lg" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Project package (everything at once)</h3>
        <p className="small muted">All deliverables in one download. Use the Book as the client-facing asset and the JSON/CSV as the working set.</p>
        <div className="row">
          <button className="btn btn-accent" onClick={() => exportBrandBook(p)}><Ic.download size={16} /> Brand Book</button>
          <button className="btn btn-soft" onClick={() => exportJson(p)}>Advancement JSON</button>
          <button className="btn btn-soft" onClick={() => exportCaseStudyFile(p)}>Case study</button>
          <button className="btn btn-ghost" onClick={() => go("email")}>Client message draft</button>
        </div>
      </div>
    </div>
  );
}
