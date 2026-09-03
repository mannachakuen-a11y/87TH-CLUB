import { useState } from "react";
import { useApp, useActiveProjectId, addTemplate, saveDesignDoc } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Seg, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { getDefaultTemplates } from "../lib/db";
import { uid } from "../lib/db";
import { seedCanvas } from "../lib/design";

const CATS = ["All", "Brand Identity", "Social", "Campaigns", "Website", "Content", "Presentation", "Analytics"];
const BRAND_TYPES = ["Streetwear", "Luxury", "Premium", "Formal", "Minimalist", "Maximalist", "Sportswear", "Athleisure", "Denim", "Vintage", "Y2K", "Techwear", "Outdoor", "Skate", "Cultural", "Artistic", "Avant-Garde", "Essentials", "Fast Fashion", "Slow Fashion", "Sustainable", "Resort", "Evening", "Tailoring", "Footwear", "Accessories", "Jewelry"];

const kindFromType: Record<string, Parameters<typeof seedCanvas>[1]> = {
  "Brand Identity": "book", Social: "social", Campaigns: "campaign", Website: "homepage", Content: "board", Presentation: "book", Analytics: "board",
};

export default function Templates() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [cat, setCat] = useState("All");
  const [style, setStyle] = useState("All");
  const [q, setQ] = useState("");

  if (!p) return <PageHead title="Template Library" sub="Open or create a project first." />;

  const all = getDefaultTemplates();
  const base = all.filter((t) => (style === "All" || t.style === style) && (!q || t.name.toLowerCase().includes(q.toLowerCase())));

  const useTemplate = (t: { name: string; category: string }) => {
    const kind = kindFromType[t.category] ?? "social";
    const doc = seedCanvas({ brandName: p.brandName, accent: "#FF3231" }, kind, `${p.brandName} — ${t.name}`);
    doc.variables = { "brand name": p.brandName, colors: "#FF3231", fonts: "Georgia + Helvetica" };
    saveDesignDoc(doc, p.id);
    toast("Template opened", "It's ready in Design Studio — swap the variables and edit.", "success");
    go("design");
  };

  const convertToTemplate = () => {
    addTemplate({ id: uid("tpl"), name: `${p.brandName} — saved from design`, category: "Social", style: p.industry || "Streetwear", designType: "social", variables: ["brand name", "logo", "colors", "fonts", "product image", "campaign title", "cta"] });
    toast("Saved as template", "Converted reusable work into a variables-based template.", "success");
  };

  // group by category when browsing All
  const groups = CATS.filter((c) => c !== "All").map((c) => ({ cat: c, items: base.filter((t) => t.category === c) })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHead
        eyebrow="Template Library"
        title="A gallery of templates."
        sub="Brand identity & logos, social, campaigns (divided by brand type), website, content, presentation and analytics. Use one, mix your brand in, or save your own work as a reusable template."
        actions={<button className="btn btn-soft" onClick={convertToTemplate}><Ic.copy size={16} /> Save work as template</button>}
      />

      <div className="row" style={{ marginBottom: 22, gap: 10 }}>
        <div className="searchbox" style={{ flex: 1 }}><Ic.search size={15} /><input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="chip">{all.length} templates · {base.length} shown</span>
      </div>

      <div className="row" style={{ gap: 18, marginBottom: 26, borderBottom: "1px solid var(--line)" }}>
        {CATS.map((c) => <button key={c} className={`filt ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="row" style={{ marginBottom: 34, gap: 16, flexWrap: "wrap" }}>
        <span className="kicker" style={{ color: "var(--faint)" }}>Brand type</span>
        {["All", ...BRAND_TYPES].map((s) => <button key={s} className={`filt ${style === s ? "on" : ""}`} onClick={() => setStyle(s)}>{s}</button>)}
      </div>

      {cat !== "All" ? (
        <SectionGrid items={base.filter((t) => t.category === cat)} use={useTemplate} cat={cat} />
      ) : groups.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", padding: 60 }}><div className="muted">No templates match — try a different brand type.</div></div>
      ) : (
        groups.map((g) => (
          <section key={g.cat} style={{ marginBottom: 44 }}>
            <div className="spread" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 22, letterSpacing: "-0.01em" }}>{g.cat}</h3>
              <span className="kicker" style={{ color: "var(--faint)" }}>{g.items.length}</span>
            </div>
            <SectionGrid items={g.items} use={useTemplate} cat={g.cat} />
          </section>
        ))
      )}
    </div>
  );
}

function SectionGrid({ items, use, cat }: { items: any[]; use: (t: any) => void; cat: string }) {
  return (
    <div className="hairline-grid hairline-grid-4">
      {items.map((t) => (
        <div key={t.id} style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 150, background: "var(--ink)", position: "relative", display: "grid", placeItems: "center" }}>
            <div style={{ fontFamily: "var(--display)", color: "var(--white)", fontWeight: 900, fontSize: 42, letterSpacing: "-0.02em" }}>{cat === "Brand Identity" ? "LOGO" : t.name.slice(0, 2).toUpperCase()}</div>
            <span className="kicker" style={{ position: "absolute", top: 12, right: 12, color: "var(--muted)" }}>{t.style}</span>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>{t.name}</div>
            <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>{t.designType}</div>
            <div className="small" style={{ color: "var(--faint)", marginTop: 8, lineHeight: 1.5 }}>{t.variables.slice(0, 4).join(" · ")}</div>
            <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: "auto" }} onClick={() => use(t)}>Use template</button>
          </div>
        </div>
      ))}
    </div>
  );
}
