import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, toast, Modal } from "../components/ui";
import { Ic } from "../lib/icons";
import type { Reference } from "../lib/types";
import { uid } from "../lib/db";

export default function References() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("photo");
  const [url, setUrl] = useState("");
  const [want, setWant] = useState("");

  if (!p) return <PageHead title="Reference Intelligence" sub="Open or create a project first." />;
  const refs = p.references ?? [];

  const analyze = () => {
    if (!name.trim()) return;
    const ana = analyzeRef(name, type, url);
    const ref: Reference = { id: uid("ref"), name: name.trim(), type, url: url.trim() || undefined, analysis: ana.analysis, principles: ana.principles };
    updateProject({ id: p.id, references: [...refs, ref] });
    setOpen(false); setName(""); setUrl("");
    toast("Reference analysed", ana.principles.length + " principles extracted.", "success");
  };

  const makeDirection = (r: Reference) => {
    if (!p.brandName) { toast("Set a brand name first.", "", "warning"); return; }
    toast("Original direction created", `Principles from "${r.name}" applied to ${p.brandName} — proceeds into Design Studio.`, "success");
    log(p.id, "mannas-ai", "reference", `Created original direction from reference: ${r.name}`);
    go("design");
  };

  const wantDirection = () => {
    if (!want.trim()) return;
    toast("Original in the spirit you asked for", `Principles extracted from "${want}" and applied as an original ${p.brandName} direction — not a copy.`, "success");
    log(p.id, "mannas-ai", "reference", `Asked for "${want}"-type content; created original brand-specific direction.`);
    setWant("");
    go("design");
  };

  return (
    <div>
      <PageHead
        eyebrow="Reference Intelligence"
        title="Learn from references, never copy."
        sub="Upload reference photos, screenshots, websites or campaigns. We analyse WHY each works, extract principles, then create an original direction in your brand's voice."
        actions={<button className="btn btn-accent" onClick={() => setOpen(true)}><Ic.plus size={16} /> Add reference</button>}
      />

      <div className="glass card-lg" style={{ marginBottom: 18 }}>
        <label className="small" style={{ fontWeight: 700 }}>“I want [brand]-type content”</label>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="e.g. Broken Planet-style, Stussy-type — describe the feeling/energy" value={want} onChange={(e) => setWant(e.target.value)} />
          <button className="btn btn-primary" onClick={wantDirection}><Ic.sparkle size={16} /> Create original direction</button>
        </div>
      </div>

      {refs.length === 0 ? (
        <div className="glass"><Empty icon={<Ic.eye size={38} />} title="No references yet" sub="Add a photo, screenshot, website or campaign and we'll break down what makes it work." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Add reference</button>} /></div>
      ) : (
        <div className="grid grid-2">
          {refs.map((r) => (
            <div key={r.id} className="glass card">
              <div className="spread">
                <div className="row"><span className={`chip ${r.type === "photo" ? "accent" : "outline"}`}>{r.type}</span></div>
                <span className="chip">{r.principles.length} principles</span>
              </div>
              <h3 style={{ margin: 10, fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{r.name}</h3>
              {r.url && <button className="link small muted" onClick={() => window.open(r.url, "_blank")}><Ic.link size={13} /> {r.url}</button>}
              <p className="small" style={{ lineHeight: 1.6, marginTop: 8 }}>{r.analysis}</p>
              <div className="row" style={{ marginTop: 10, gap: 6 }}>
                {r.principles.map((pr, i) => <span key={i} className="chip">{pr}</span>)}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => makeDirection(r)}><Ic.sparkle size={15} /> Create original direction</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add a reference" footer={<>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={analyze}><Ic.check size={16} /> Analyse</button>
      </>}>
        <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Broken Planet lookbook" /></div>
        <div className="field"><label>Type</label>
          <div className="row">{["photo", "website", "campaign", "video"].map((t) => <button key={t} className="chip" style={{ background: type === t ? "var(--ink)" : "rgba(0,0,0,.05)", color: type === t ? "#fff" : "inherit" }} onClick={() => setType(t)}>{t}</button>)}</div>
        </div>
        <div className="field"><label>URL (optional)</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="reference.com" /></div>
      </Modal>
    </div>
  );
}

function analyzeRef(name: string, type: string, url: string) {
  const lower = name.toLowerCase();
  const hasStreet = /broken|street|hype|noise|urban|stussy|suvine|off|y2k|tech/i.test(lower);
  const hasLuxury = /lux|luxury|premium|rich|couture|tailor|silk/i.test(lower);
  const hasMinimal = /minimal|clean|essential|normcore|quiet/i.test(lower);
  const principles: string[] = [];
  if (hasStreet) principles.push("Raw urban energy", "Graphic, confrontational type", "Community as subject", "Contrast between muted tones and one loud accent");
  if (hasLuxury) principles.push("Restraint and negative space", "Craft and texture over quantity", "Cinematic, warm lighting", "A single, high-contrast motif");
  if (hasMinimal) principles.push("Spacious typography", "Natural palette, soft light", "One product, one idea per frame", "Quiet confidence");
  if (!principles.length) principles.push("Strong central composition", "Cohesive color story", "Clear visual hierarchy", "Consistent framing and crop");
  const analysis = `${name} works because of how it uses ${type}. It holds attention with a confident, consistent hierarchy — a clear hero, a tight palette, and typography that carries the attitude. The imagery + styling build a believable world rather than showing product alone.`;
  return { analysis, principles };
}
