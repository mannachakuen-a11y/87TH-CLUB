import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log, pushNotification } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Seg, toast, Modal } from "../components/ui";
import { Ic } from "../lib/icons";
import type { CinemaProject, StoryboardCard, Shot } from "../lib/types";
import { uid } from "../lib/db";
import { FRAMEWORK, getOutcome } from "../lib/framework";
import { toDataUrl, dnaFrom, identityLockup, moodboard, heroCreative, socialPost } from "../lib/gen";

// ------------------------------------------------------------------
// CINEMA STUDIO — THE PRODUCTION HOUSE.
// Designed like a world-class marketing studio. Divided into ASSET
// TYPES (Stories, Highlights, Reels, TikTok, Tweets, Posts, Carousels,
// Ads, UGC, Thumbnails, Covers…), outcome-aware (knows which framework
// outcome it serves), with a Brand Identity board and a Distinctive
// World test, plus a PRODUCTION CONTROL panel showing which specialist
// engine drives each stage (Higgsfield / DaVinci Resolve / Canva /
// Adobe CC / Figma).
// ------------------------------------------------------------------

const CATEGORIES = [
  { id: "SOCIAL", label: "Social", desc: "Feed-first, platform-native short-form + stills.", engines: ["Higgsfield", "Canva"], assetTypes: ["Stories", "Highlights", "Reels", "TikTok", "Tweets", "Posts", "Carousels", "Ads", "UGC", "Thumbnails", "Covers"] },
  { id: "CONTENT", label: "Content", desc: "Films, teasers, trailers, lookbooks, editorials, BTS.", engines: ["Higgsfield", "DaVinci Resolve"], assetTypes: ["Short film", "Teaser", "Trailer", "Product film", "Campaign film", "BTS", "Lookbook", "Editorial", "Interview", "Launch video"] },
  { id: "CAMPAIGN", label: "Campaign", desc: "Hero creative, campaign boards, key visual, rollout.", engines: ["Higgsfield", "Canva", "Figma"], assetTypes: ["Campaign board", "Hero creative", "Key visual", "Social rollout", "Ad variants", "Creator brief", "UGC brief", "Email / SMS", "Launch assets"] },
  { id: "BRAND", label: "Brand", desc: "Identity, logo system, typography, colour, brand book, motion.", engines: ["Adobe CC", "Figma"], assetTypes: ["Identity", "Logo system", "Typography", "Colour", "Graphics", "Packaging", "Brand book", "Art direction", "Photography direction", "Motion identity", "Sound direction"], identity: true },
  { id: "WEB", label: "Web", desc: "Homepage, landing, product, cart, checkout, campaign pages.", engines: ["Figma"], assetTypes: ["Homepage", "Landing page", "Collection", "Product page", "Cart", "Checkout", "Campaign page", "Popup", "Email concept"] },
  { id: "DESIGN", label: "Design", desc: "Posters, flyers, lookbooks, pitch decks, moodboards, cards.", engines: ["Canva", "Adobe CC"], assetTypes: ["Poster", "Flyer", "Lookbook", "Presentation", "Moodboard", "Pitch deck", "Product card", "Promo graphic"] },
];

const PHASES = ["Idea", "Treatment", "Script", "Storyboard", "Shot List", "Generate", "Edit", "Colour", "Export"];

// Which engine drives each phase — the production control read-out.
const PHASE_ENGINE: Record<string, string> = {
  Idea: "Mannas AI · Arena AI", Treatment: "Mannas AI · Claude", Script: "Mannas AI · Gemini", Storyboard: "Mannas AI · Arena AI",
  "Shot List": "Mannas AI · Structured extraction", Generate: "Higgsfield", Edit: "DaVinci Resolve", Colour: "DaVinci Resolve", Export: "Codec + Delivery",
};
const PHASE_ICON: Record<string, any> = {
  Generate: Ic.video, Edit: Ic.film, Colour: Ic.refresh, Export: Ic.download, Idea: Ic.spark, Treatment: Ic.doc, Script: Ic.doc, Storyboard: Ic.layers, "Shot List": Ic.check,
};

export default function CinemaStudio() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [cat, setCat] = useState("SOCIAL");
  const [catSel, setCatSel] = useState<string | null>(null);
  const [assetType, setAssetType] = useState("Stories");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sel, setSel] = useState<CinemaProject | null>(null);

  if (!p) return <PageHead title="Cinema Studio" sub="Open or create a project first." />;

  const activeCategory = CATEGORIES.find((c) => c.id === cat)!;
  const outcome = getOutcome(p.currentOutcomeId);

  const make = () => {
    const name = title.trim() || `${p.brandName} — ${assetType}`;
    const cp: CinemaProject = {
      id: uid("cin"), title: name, format: cat as any, assetType, outcome: p.currentOutcomeId,
      phase: "Idea",
      treatment: treatmentFor(p.brandName, p.industry || "streetwear", name),
      script: scriptFor(p.brandName, assetType),
      storyboard: storyboardFor(p.brandName, assetType),
      shotList: shotsFor(p.brandName, assetType),
      aspectRatios: cat === "SOCIAL" ? ["9:16", "4:5", "1:1"] : cat === "WEB" ? ["16:9", "1:1"] : cat === "DESIGN" ? ["A4", "1080×1350"] : ["16:9", "2.39:1"],
      exportNote: cat === "SOCIAL" ? "Vertical 9:16 master → 4:5 + 1:1 crops. Reel/TikTok-native." : cat === "WEB" ? "Scalable UI frames + a live screen prototype." : cat === "DESIGN" ? "High-res print + 1080×1350 social export." : "16:9 master → 2.39:1 for the film frame.",
    };
    updateProject({ id: p.id, cinemaProjects: [...(p.cinemaProjects ?? []), cp] });
    log(p.id, "mannas-ai", "cinema", `Cinema project created: ${name} (${cat} · ${assetType}) serving Outcome ${p.currentOutcomeId}.`);
    pushNotification("Cinema Studio project ready", `${name} — ${assetType} · Outcome ${p.currentOutcomeId}`, "success");
    setOpen(false); setTitle(""); setSel(cp);
    toast(`Created "${name}"`, "The whole production pipeline is set up.", "success");
  };

  const regen = () => {
    if (!sel) return;
    const cp: CinemaProject = {
      ...sel,
      treatment: treatmentFor(p.brandName, p.industry || "streetwear", sel.title),
      script: scriptFor(p.brandName, sel.assetType || sel.title),
      storyboard: storyboardFor(p.brandName, sel.assetType || sel.title),
      shotList: shotsFor(p.brandName, sel.assetType || sel.title),
      phase: "Idea",
    };
    updateProject({ id: p.id, cinemaProjects: p.cinemaProjects.map((x) => (x.id === sel.id ? { ...x, ...cp } : x)) });
    setSel(cp);
    toast("Regenerated", "A fresh treatment, script, storyboard and shot list.", "info");
  };

  const active = sel;

  return (
    <div>
      <PageHead
        eyebrow="Cinema Studio"
        title="The production house."
        sub={`${p.brandName} · ${outcome.number} ${outcome.title}. Make the unknown or weak creative, and the brand identity & world, studio-grade. Every asset type serves an outcome.`}
        actions={<button className="btn btn-accent" onClick={() => setOpen(true)}><Ic.plus size={16} /> New production</button>}
      />

      {!active ? (
        <div>
          {/* Category tabs */}
          <div className="row" style={{ gap: 18, marginBottom: 34, borderBottom: "1px solid var(--line)" }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`filt ${cat === c.id ? "on" : ""}`} onClick={() => { setCat(c.id); setCatSel(null); }}>{c.label}</button>
            ))}
          </div>

          {catSel === null ? (
            <>
              <div className="kicker" style={{ color: "var(--muted)", marginBottom: 6 }}>{activeCategory.id} · Asset types</div>
              <p className="small muted" style={{ marginTop: 0, marginBottom: 22, maxWidth: 560 }}>{activeCategory.desc}. Choose the asset you're producing.</p>
              <div className="hairline-grid hairline-grid-4">
                {activeCategory.assetTypes.map((t) => (
                  <button key={t} style={{ border: 0, textAlign: "left", padding: 26, cursor: "pointer" }} onClick={() => { setAssetType(t); setCatSel(t); setOpen(true); }}>
                    <div className="kicker" style={{ color: "var(--faint)", marginBottom: 14 }}>{cat}</div>
                    <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.01em" }}>{t}</div>
                    <div className="small muted" style={{ marginTop: 8 }}>{engineLine(activeCategory, t)}</div>
                  </button>
                ))}
                {activeCategory.identity && (
                  <button style={{ border: 0, textAlign: "left", padding: 26, cursor: "pointer", background: "rgba(255,50,49,.03)" }} onClick={() => { setOpen(true); setAssetType("Identity"); setCatSel("Brand Identity"); }} >
                    <div className="kicker" style={{ color: "var(--accent)", marginBottom: 14 }}>Brand Identity</div>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>Open Identity board</div>
                    <div className="small muted" style={{ marginTop: 8 }}>Purpose, audience, positioning, promise, message · Distinctive World test.</div>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="hairline-grid hairline-grid-3" style={{ maxWidth: 760 }}>
              {activeCategory.assetTypes.map((t) => (
                <button key={t} style={{ border: 0, textAlign: "left", padding: 22, cursor: "pointer", background: t === assetType || t === "Identity" ? "rgba(19,19,22,.04)" : "var(--panel)" }} onClick={() => { setAssetType(t); setOpen(true); }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{t}</div>
                  <div className="small muted" style={{ marginTop: 6 }}>{engineLine(activeCategory, t)}</div>
                </button>
              ))}
            </div>
          )}

          {p.cinemaProjects?.length > 0 && (
            <section style={{ marginTop: 46 }}>
              <div className="kicker" style={{ color: "var(--muted)", marginBottom: 14 }}>In production</div>
              <div className="hairline-grid hairline-grid-3">
                {p.cinemaProjects.map((c) => (
                  <button key={c.id} onClick={() => setSel(c)} style={{ border: 0, textAlign: "left", padding: 24, cursor: "pointer" }}>
                    <div className="spread">
                      <span className="chip">{c.assetType || c.format}</span>
                      <span className="kicker" style={{ color: "var(--faint)" }}>{c.outcome ? "O" + String(c.outcome).padStart(2, "0") : ""}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginTop: 12 }}>{c.title}</div>
                    <div className="small muted" style={{ marginTop: 4 }}>{c.aspectRatios.join(" · ")}</div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Production cp={active} setCp={(cp) => { updateProject({ id: p.id, cinemaProjects: p.cinemaProjects.map((x) => (x.id === cp.id ? cp : x)) }); setSel(cp); }} onRegen={regen} go={go} />
      )}

      {active && (
        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => setSel(null)}>← Production library</button>
          <button className="btn btn-soft" onClick={() => { toast("Production brief staged for export.", "Open Export Center to download.", "info"); go("export"); }}><Ic.download size={16} /> Export brief</button>
          <button className="btn btn-soft" onClick={() => go("integrations")}><Ic.plug size={16} /> Hand to specialist</button>
        </div>
      )}

      {/* New production modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="New production" footer={<>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={make}><Ic.spark size={16} /> Create</button>
      </>}>
        <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${p.brandName} — ${assetType}`} /></div>
        <div className="field"><label>Asset type</label>
          <div className="row" style={{ gap: 8 }}>
            {activeCategory.assetTypes.map((t) => <button key={t} className="chip" style={{ background: assetType === t ? "var(--ink)" : "rgba(0,0,0,.04)", borderColor: assetType === t ? "var(--ink)" : "var(--line)", color: assetType === t ? "var(--bg)" : "var(--ink-soft)" }} onClick={() => setAssetType(t)}>{t}</button>)}
          </div>
        </div>
        <div className="glass" style={{ padding: 16, background: "rgba(19,19,22,.03)", borderRadius: 10 }}>
          <div className="kicker" style={{ color: "var(--muted)", marginBottom: 10 }}>Serves outcome</div>
          <div style={{ fontWeight: 600 }}>{outcome.number} · {outcome.title}</div>
          <div className="small muted" style={{ marginTop: 4 }}>{outcome.promise}</div>
        </div>
        <div className="field" style={{ marginTop: 16 }}><label>Production engines</label>
          <div className="row">{activeCategory.engines.map((e) => <span key={e} className="chip outline"><Ic.plug size={12} /> {e}</span>)}</div>
        </div>
      </Modal>
    </div>
  );
}

function engineLine(cat: { engines: string[] }, t: string) {
  return `Engine: ${cat.engines.join(" · ")}`;
}

// ------------------------------------------------------------------
// The open production workspace.
// ------------------------------------------------------------------
function Production({ cp, setCp, onRegen, go }: { cp: CinemaProject; setCp: (c: CinemaProject) => void; onRegen: () => void; go: (v: any) => void }) {
  const [phase, setPhase] = useState(cp.phase);
  const outcome = getOutcome(cp.outcome ?? 1);
  const dna = dnaFrom({ brandName: cp.title.split("—")[0]?.trim() || "Brand", accent: "#FF3231", palette: [] });

  const stageVisual = (): string => {
    if (cp.assetType === "Identity" || cp.format === "BRAND") return toDataUrl(identityLockup(dna, 1));
    if (cp.format === "CAMPAIGN") return toDataUrl(heroCreative(dna, 6, cp.assetType || "A NEW SEASON"));
    return toDataUrl(socialPost(dna, 1, cp.assetType?.toUpperCase() || "THE DROP", cp.title.toUpperCase()));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) 250px", gap: 24, alignItems: "start" }}>
      {/* Left rail — pipeline + engines */}
      <div className="glass" style={{ padding: 22, position: "sticky", top: 92 }}>
        <div className="kicker" style={{ color: "var(--muted)", marginBottom: 4 }}>{cp.assetType || cp.format}</div>
        <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 22, letterSpacing: "-0.01em", marginBottom: 6 }}>{cp.title}</div>
        <div className="kicker" style={{ color: "var(--accent)", marginBottom: 18 }}>{outcome.number} · {outcome.title}</div>

        <div className="stack" style={{ gap: 2 }}>
          {PHASES.map((ph) => {
            const isActive = phase === ph;
            return (
              <button key={ph} onClick={() => { setPhase(ph); setCp({ ...cp, phase: ph }); }}
                style={{ border: 0, textAlign: "left", padding: "8px 8px", cursor: "pointer", width: "100%", borderRadius: 6, background: isActive ? "var(--ink)" : "transparent", color: isActive ? "var(--bg)" : "var(--ink-soft)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ opacity: 0.7, display: "grid", placeItems: "center" }}>{(() => { const I = PHASE_ICON[ph]; return I ? <I size={14} /> : <Ic.chevR size={14} />; })()}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{ph}</span>
              </button>
            );
          })}
        </div>

        <div className="divider" />
        <div className="kicker" style={{ color: "var(--muted)", marginBottom: 10 }}>Engine</div>
        <div className="kicker" style={{ color: "var(--ink-soft)", fontSize: 12, letterSpacing: "0.04em", textTransform: "none", marginBottom: 4 }}>{PHASE_ENGINE[phase]}</div>
        <div className="small muted" style={{ lineHeight: 1.5 }}>This stage is driven from Integrations behind the OS.</div>
        <button className="btn btn-soft btn-sm" style={{ marginTop: 12 }} onClick={() => go("integrations")}><Ic.plug size={13} /> Manage engines</button>
      </div>

      {/* Center — the work */}
      <div>
        <div style={{ borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "#dedcd6", padding: 36, display: "grid", placeItems: "center", marginBottom: 22 }}>
          <div style={{ maxWidth: 640, width: "100%", boxShadow: "0 30px 70px rgba(0,0,0,.22)" }}>
            <img src={stageVisual()} alt="preview" style={{ width: "100%", display: "block", borderRadius: 6 }} />
          </div>
        </div>
        <div className="row" style={{ marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={() => go("design")}><Ic.pen size={15} /> Polish in Design Studio</button>
          <button className="btn btn-soft" onClick={() => go("templates")}><Ic.folder size={15} /> Template library</button>
          <button className="btn btn-ghost" onClick={() => go("campaigns")}><Ic.sparkle size={15} /> Link to a campaign</button>
        </div>

        {phase === "Idea" && <IdeaPanel cp={cp} setCp={setCp} regen={onRegen} />}
        {phase === "Treatment" && <Section title="Treatment" hint="The single idea, the world, the feeling — in words." value={cp.treatment} onSave={(v) => setCp({ ...cp, treatment: v })} />}
        {phase === "Script" && <Section title="Script" hint="Scene-by-scene beats, VO, sound, pacing." value={cp.script} onSave={(v) => setCp({ ...cp, script: v })} />}
        {phase === "Storyboard" && <Storyboard cp={cp} />}
        {phase === "Shot List" && <ShotList cp={cp} />}
        {["Generate", "Edit", "Colour", "Export"].includes(phase) && <StageNote phase={phase} cp={cp} go={go} />}
      </div>

      {/* Right rail — brand context + world test */}
      <div className="glass" style={{ padding: 22 }}>
        <div className="kicker" style={{ color: "var(--muted)", marginBottom: 8 }}>Brand Identity</div>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35, marginBottom: 6 }}>{purposeFor(cp.title.split("—")[0]?.trim() || "Brand")}</div>
        <div className="divider" />
        <div className="kicker" style={{ color: "var(--muted)", marginBottom: 8 }}>Distinctive World</div>
        <div className="small" style={{ lineHeight: 1.6, color: "var(--ink-soft)" }}>{worldFor(cp)}</div>
        <div className="divider" />
        <button className="btn btn-ghost btn-sm btn-block" onClick={() => toast("World test shipped", "Show the creative without the logo — if it still reads as the brand, it passes.", "success")}>Run distinctiveness test</button>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="chip green"><Ic.check size={12} /> clear & recognizable</span>
        </div>
      </div>
    </div>
  );
}

function IdeaPanel({ cp, setCp, regen }: { cp: CinemaProject; setCp: (c: CinemaProject) => void; regen: () => void }) {
  return (
    <div className="glass" style={{ padding: 26 }}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>The idea</h3>
        <button className="btn btn-soft btn-sm" onClick={regen}><Ic.refresh size={14} /> New take</button>
      </div>
      <p className="small muted" style={{ lineHeight: 1.6 }}>{cp.treatment}</p>
      <button className="btn btn-primary" onClick={() => setCp({ ...cp, phase: "Treatment" })}><Ic.arrowR size={15} /> Draft treatment</button>
    </div>
  );
}

function Section({ title, hint, value, onSave }: { title: string; hint: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="glass" style={{ padding: 26 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="small muted">{hint}</span>
      </div>
      <textarea className="input" style={{ minHeight: 220, marginTop: 14 }} value={v} onChange={(e) => setV(e.target.value)} />
      <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(v)}><Ic.check size={15} /> Save</button>
      </div>
    </div>
  );
}

function StageNote({ phase, cp, go }: { phase: string; cp: CinemaProject; go: (v: any) => void }) {
  const body: Record<string, string> = {
    Generate: `Generate via ${PHASE_ENGINE[phase]}. ${cp.exportNote} Keep the signature elements on-brand.`,
    Edit: `Assemble to the treatment in ${PHASE_ENGINE[phase]}. Master edit, then trimmed cuts per platform.`,
    Colour: `Grade to the brand world in ${PHASE_ENGINE[phase]}: warm, slightly desaturated, deep blacks, the precision accent for signature/CTA.`,
    Export: `Deliver in ${PHASE_ENGINE[phase]}: ${cp.exportNote}`,
  };
  return (
    <div className="glass" style={{ padding: 26 }}>
      <h3 style={{ marginTop: 0 }}>{phase}</h3>
      <p className="small muted" style={{ lineHeight: 1.6 }}>{body[phase]}</p>
      <div className="row">
        <button className="btn btn-accent" onClick={() => go("integrations")}><Ic.plug size={15} /> Open {PHASE_ENGINE[phase]}</button>
        <button className="btn btn-soft" onClick={() => go("export")}><Ic.download size={15} /> Export</button>
      </div>
    </div>
  );
}

function Storyboard({ cp }: { cp: CinemaProject }) {
  return (
    <div className="glass" style={{ padding: 26 }}>
      <h3 style={{ marginTop: 0 }}>Storyboard</h3>
      <p className="small muted">Every frame: what we see, camera, note for the shoot.</p>
      <div className="hairline-grid hairline-grid-4" style={{ marginTop: 14 }}>
        {cp.storyboard.map((f) => (
          <div key={f.id} style={{ padding: 16 }}>
            <div style={{ aspectRatio: "9/16", borderRadius: 6, background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 30, color: "var(--brand)" }}>{String(f.frame).padStart(2, "0")}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{f.description}</div>
            <div className="small muted" style={{ marginTop: 4 }}>{f.camera}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShotList({ cp }: { cp: CinemaProject }) {
  return (
    <div className="glass" style={{ padding: 26 }}>
      <h3 style={{ marginTop: 0 }}>Shot list</h3>
      <p className="small muted">The production roadmap — camera, location, cast, wardrobe, lighting, sound.</p>
      <table className="tbl" style={{ marginTop: 12 }}>
        <thead><tr><th>#</th><th>Dur</th><th>Shot</th><th>Camera</th><th>Location</th><th>Light</th><th>Sound</th></tr></thead>
        <tbody>{cp.shotList.map((s) => (
          <tr key={s.id}><td className="mono">{s.n}</td><td>{s.duration}</td><td>{s.description}</td><td className="small">{s.cameraMovement}</td><td className="small">{s.location}</td><td className="small">{s.lighting}</td><td className="small">{s.sound}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ---- outcome-aware generators ----
function treatmentFor(brand: string, industry: string, title?: string) {
  return `${title || brand + " — a film for a season"}.\n\nBig idea: in a world that copies, ${brand} is the original. We open on texture — fabric, concrete, light — and pull back to reveal people who move through the city owning the room.\n\nTone: cinematic, warm, kinetic. Grade: deep blacks, warm mids, the precision accent reserved for the signature.\n\nMusic: slow, driving. A single percussive hit lands the mark at the end.`;
}
function scriptFor(brand: string, assetType: string) {
  const open = assetType === "Reels" || assetType === "TikTok" ? "A 3-second hook then the riff." : "";
  return `${open}\n\nSCENE 1 — WIDE, GOLDEN HOUR.\nA hand runs across a sleeve. Cut.\n\nSCENE 2 — CLOSE.\nPacing. City blur behind.\n\nSCENE 3 — MID, TRACKING.\nThe group moves, confident, unhurried.\n\nSCENE 4 — STATIC, LOW.\nA single figure stops, looks at camera. Beat.\n\nV.O.: Some make clothes. ${brand} makes a statement.\n\nSCENE 5 — LOGO HIT with the accent line.\n${brand.toUpperCase()} · EST. 2026.`;
}
function storyboardFor(brand: string, assetType: string): StoryboardCard[] {
  const frames = [
    ["Opening texture", "macros, slow push", "establish the world"],
    ["The group", "steady tracking", "movement + style"],
    ["Detail on garment", "static, shallow DOF", "product storytelling"],
    ["The signal", "whip pan to signature", "brand code"],
    ["Logo hit", "hard cut, accent flash", "end on the mark"],
  ];
  return frames.map((f, i) => ({ id: uid("sb"), frame: i + 1, description: f[0], camera: f[1], note: f[2] }));
}
function shotsFor(brand: string, assetType: string): Shot[] {
  const locs = ["City street", "Concrete rooftop", "Studio", "Night market", "Dusty lot"];
  const shots = ["Opening frame", "The approach", "Detail on garment", "Movement", "The look", "Finale"];
  return shots.map((s, i) => ({
    id: uid("shot"), n: `${i + 1}A`, duration: i === 0 ? "5s" : "3s",
    description: `${s} — ${brand}`, cameraMovement: i % 2 ? "dolly in" : "static + pan",
    location: locs[i % locs.length], cast: "2 lead + crowd", wardrobe: `${brand} mainline`,
    lighting: i % 2 ? "golden hour" : "hard daylight", sound: "ambient + score",
  }));
}

function purposeFor(brand: string) {
  return `${brand} exists to give its community a statement of fashion that is unmistakably its own. The promise: buy it once, wear it as a point of view.`;
}
function worldFor(cp: CinemaProject) {
  return `The ${cp.assetType || "world"} lives in a cinematic, kinetic world — light and shadow over texture, warm and slightly desaturated, serif display against a tight grotesk. Recurring signatures: the monogram, the red accent line, the landscape-framing graphic. In motion it's unhurried and confident.`;
}
