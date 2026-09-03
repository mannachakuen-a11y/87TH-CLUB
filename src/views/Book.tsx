import { useApp, useActiveProjectId } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { buildBrandBook } from "../lib/export";

export default function Book() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);

  if (!p) return <PageHead title="Brand Advancement Book" sub="Open or create a project first." />;

  const { html, title } = buildBrandBook(p);

  const downloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.brandName}-Brand-Advancement-Book.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast("Book exported", "HTML downloaded.", "success");
  };

  return (
    <div>
      <PageHead
        eyebrow="Brand Advancement Book"
        title="The complete advancement, in one document."
        sub="Summary, diagnosis, identity, world, customer experience, conversion system, content engine, campaign system, acquisition loop, analytics, before/after, assets, experiments and future recommendations."
        actions={<>
          <button className="btn btn-soft" onClick={() => go("export")}><Ic.layers size={16} /> More exports</button>
          <button className="btn btn-soft" onClick={downloadHtml}><Ic.download size={16} /> Export HTML</button>
        </>}
      />
      <div className="glass" style={{ overflow: "hidden", borderRadius: 20, ...(p.brandName ? {} : {}) }}>
        <iframe title={title} srcDoc={html} style={{ width: "100%", height: "78vh", border: 0, background: "#fff" }} />
      </div>
    </div>
  );
}
