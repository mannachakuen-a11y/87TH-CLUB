import { useEffect, useRef, useState } from "react";
import { useApp, useActiveProjectId, updateProject, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import type { DesignDocument, DesignElement } from "../lib/types";
import { uid } from "../lib/db";
import { seedCanvas, el, bringToFront, sendToBack, deleteElement, duplicateElement, makePremium, useBrandWorld, mobileFirst, drawFiveAds, reelFromPost, fromReference, docToDataURL } from "../lib/design";

const TEMPLATE_KINDS: { id: Parameters<typeof seedCanvas>[1]; label: string; icon: any }[] = [
  { id: "homepage", label: "Homepage", icon: Ic.globe },
  { id: "product", label: "Product page", icon: Ic.box },
  { id: "social", label: "Social post", icon: Ic.image },
  { id: "poster", label: "Poster", icon: Ic.doc },
  { id: "board", label: "Campaign board", icon: Ic.layers },
  { id: "book", label: "Brand book cover", icon: Ic.book },
  { id: "campaign", label: "Campaign hero", icon: Ic.sparkle },
];

export default function DesignStudio() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [doc, setDoc] = useState<DesignDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<DesignDocument[]>([]);
  const [future, setFuture] = useState<DesignDocument[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  if (!p) return <PageHead title="Design Studio" sub="Open or create a project first." />;

  const openDoc = (newDoc: DesignDocument) => {
    setDoc(newDoc);
    setSelectedId(newDoc.elements[newDoc.elements.length - 1]?.id ?? null);
    setHistory((h) => [...h, newDoc]);
    setFuture([]);
  };

  const apply = (next: DesignDocument, pushToHistory = true) => {
    if (pushToHistory) setHistory((h) => [...h, doc!]);
    setFuture([]);
    setDoc(next);
  };

  const save = () => {
    if (!doc) return;
    updateProject({ id: p.id, designDocuments: [...(p.designDocuments ?? []).filter((d) => d.id !== doc.id), doc] });
    toast("Saved", "Added to project documents.", "success");
  };

  const undo = () => { if (history.length > 1) { const prev = history[history.length - 2]; setFuture((f) => [doc!, ...f]); setHistory((h) => h.slice(0, -1)); setDoc(prev); } };
  const redo = () => { if (future.length) { const n = future[0]; setHistory((h) => [...h, doc!]); setFuture((f) => f.slice(1)); setDoc(n); } };

  const updateEl = (id: string, patch: Partial<DesignElement>, push = true) => {
    if (!doc) return;
    const next = { ...doc, elements: doc.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    if (push) apply(next);
    else setDoc(next);
  };

  const add = (type: DesignElement["type"]) => {
    if (!doc) return;
    const ne = el({ type, x: doc.canvas.width / 2 - 80, y: doc.canvas.height / 2 - 40, w: type === "line" ? 200 : 160, h: type === "line" ? 3 : 90, z: doc.elements.length });
    if (type === "text") Object.assign(ne, { text: "Your text", fontSize: 40, fontFamily: "Georgia, serif", color: "#0b0b0c" });
    if (type === "rect") Object.assign(ne, { fill: "#0b0b0c", borderRadius: 12 });
    if (type === "circle") Object.assign(ne, { fill: "#FF3231", w: 100, h: 100 });
    if (type === "line") Object.assign(ne, { fill: "#0b0b0c", h: 3 });
    apply({ ...doc, elements: [...doc.elements, ne] });
    setSelectedId(ne.id);
  };

  const aiAction = (action: string) => {
    if (!doc) return;
    let next: DesignDocument | DesignDocument[] = doc;
    if (action === "premium") next = makePremium(doc, "#FF3231");
    else if (action === "world") next = useBrandWorld(doc, "#FF3231", "#f1ede6");
    else if (action === "mobile") next = mobileFirst(doc);
    else if (action === "reel") next = reelFromPost(doc);
    else if (action === "ads") { const arr = drawFiveAds(doc, "#FF3231"); setDoc(arr[0]); setHistory((h) => [...h, doc]); setFuture([]); setSelectedId(null); toast("Five ad variants ready", "Saved to design documents.", "success"); saveAll(arr); return; }
    else if (action === "reference") next = fromReference(doc, { principles: ["High-contrast graphic", "Spacious typography", "Single motif"] });
    if (Array.isArray(next)) return;
    apply(next);
    log(p.id, "mannas-ai", "design", `AI action: ${action}`);
    toast("Applied", "Updated the canvas. Undo if not right.", "success");
  };

  const saveAll = (docs: DesignDocument[]) => {
    updateProject({ id: p.id, designDocuments: [...(p.designDocuments ?? []), ...docs] });
  };

  const addImage = () => {
    if (!doc) return;
    const url = prompt("Paste an image URL (or leave blank for a placeholder)") ?? "";
    const ne = el({ type: "image", x: doc.canvas.width / 2 - 100, y: doc.canvas.height / 2 - 100, w: 200, h: 200, z: doc.elements.length, imageUrl: url || undefined, fill: "#eee" });
    apply({ ...doc, elements: [...doc.elements, ne] });
  };

  const selected = doc?.elements.find((e) => e.id === selectedId) ?? null;

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    if (!doc) return;
    setSelectedId(id);
    const elem = doc.elements.find((x) => x.id === id);
    if (!elem) return;
    const startX = e.clientX, startY = e.clientY, origX = elem.x, origY = elem.y;
    const move = (ev: MouseEvent) => {
      const scr = doc.canvas.width / (stageRef.current?.clientWidth || doc.canvas.width);
      updateEl(id, { x: origX + (ev.clientX - startX) * scr, y: origY + (ev.clientY - startY) * scr }, false);
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div>
      <PageHead
        eyebrow="Design Studio"
        title="A visual-first canvas."
        sub="Design logos, social posts, stories, websites, ads, posters, lookbooks, boards and more. Drag, layer, and let AI act on the canvas."
        actions={<>
          <button className="btn btn-soft" onClick={undo} disabled={history.length <= 1}><Ic.undo size={16} /></button>
          <button className="btn btn-soft" onClick={redo} disabled={!future.length}><Ic.refresh size={16} /></button>
          <button className="btn btn-primary" onClick={() => { save(); downloadDoc(doc); }}><Ic.download size={16} /> Save / Export</button>
        </>}
      />

      {!doc ? (
        <div>
          <div className="kicker" style={{ color: "var(--muted)", marginBottom: 18 }}>Start a canvas</div>
          <div className="hairline-grid hairline-grid-7">
            {TEMPLATE_KINDS.map((t) => (
              <button key={t.id} onClick={() => openDoc(seedCanvas({ brandName: p.brandName, accent: "#FF3231" }, t.id, `${p.brandName} — ${t.label}`))}
                style={{ border: 0, padding: "26px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", color: "var(--ink-soft)" }}>
                <t.icon size={22} strokeWidth={1.3} />
                <span style={{ fontSize: 11, fontWeight: 500, textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.3 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {p.designDocuments?.length > 0 && (
            <section style={{ marginTop: 44 }}>
              <div className="kicker" style={{ color: "var(--muted)", marginBottom: 16 }}>Your documents</div>
              <div className="hairline-grid hairline-grid-3">
                {p.designDocuments.map((d) => (
                  <button key={d.id} onClick={() => openDoc(d)} style={{ border: 0, textAlign: "left", padding: 26, cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{d.title}</div>
                    <div className="small" style={{ color: "var(--muted)", marginTop: 6 }}>{d.canvas.width}×{d.canvas.height} · {d.elements.length} elements</div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="canvas-shell">
          {/* Toolbar */}
          <div className="glass toolpanel">
            <div className="sect">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Add</div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-soft btn-sm" onClick={() => add("text")}>T</button>
                <button className="btn btn-soft btn-sm" onClick={() => add("rect")}>▭</button>
                <button className="btn btn-soft btn-sm" onClick={() => add("circle")}>◯</button>
                <button className="btn btn-soft btn-sm" onClick={() => add("line")}>—</button>
                <button className="btn btn-soft btn-sm" onClick={addImage}>🖼</button>
              </div>
            </div>
            <div className="sect">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>AI actions</div>
              <div className="stack" style={{ gap: 6 }}>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("premium")}>✨ Make this premium</button>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("world")}>Use approved brand world</button>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("mobile")}>Make mobile-first</button>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("reel")}>Turn into a reel</button>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("ads")}>Create five ad variants</button>
                <button className="btn btn-soft btn-sm btn-block" onClick={() => aiAction("reference")}>Reference → original</button>
              </div>
            </div>
            {selected && (
              <div className="sect">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Layer</div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => apply(bringToFront(doc, selected.id))}>Front</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => apply(sendToBack(doc, selected.id))}>Back</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => apply(duplicateElement(doc, selected.id))}>Duplicate</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => apply(deleteElement(doc, selected.id))}>🗑</button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="canvas-scroll">
            <div className="canvas-stage" style={{ width: doc.canvas.width, height: doc.canvas.height }} ref={stageRef}>
              {doc.elements.map((e) => (
                <div
                  key={e.id}
                  className={`canvas-el ${selectedId === e.id ? "selected" : ""}`}
                  style={{ left: e.x, top: e.y, width: e.w, height: e.h, transform: `rotate(${e.rotation}deg)`, opacity: e.opacity, zIndex: e.z }}
                  onMouseDown={(ev) => { ev.stopPropagation(); onMouseDown(ev, e.id); }}
                >
                  {renderEl(e)}
                  {selectedId === e.id && <><span className="handle" style={{ right: -5, bottom: -5 }} /><span className="handle" style={{ left: -5, top: -5 }} /></>}
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div className="glass toolpanel">
            <div className="sect">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Canvas</div>
              <div className="small muted">{doc.canvas.name}</div>
              <div className="small muted" style={{ marginTop: 2 }}>{doc.canvas.width}×{doc.canvas.height}px</div>
            </div>
            {selected && (
              <div className="sect">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Properties</div>
                {["x", "y", "w", "h"].map((k) => (
                  <label key={k} className="small row" style={{ marginBottom: 6 }}>
                    <span style={{ width: 20 }}>{k}</span>
                    <input type="number" className="input" style={{ height: 30, padding: "4px 8px" }} value={Math.round((selected as any)[k])} onChange={(e) => updateEl(selected.id, { [k]: +e.target.value })} />
                  </label>
                ))}
                <label className="small row" style={{ marginBottom: 6 }}>
                  <span style={{ width: 20 }}>rot</span>
                  <input type="number" className="input" style={{ height: 30, padding: "4px 8px" }} value={selected.rotation} onChange={(e) => updateEl(selected.id, { rotation: +e.target.value })} />
                </label>
                <label className="small row" style={{ marginBottom: 6 }}>
                  <span style={{ width: 20 }}>op</span>
                  <input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => updateEl(selected.id, { opacity: +e.target.value })} />
                </label>
                {selected.type === "text" && (
                  <>
                    <div className="small row" style={{ marginBottom: 6 }}><span style={{ width: 20 }}>fill</span><input type="color" value={selected.color ?? "#000"} onChange={(e) => updateEl(selected.id, { color: e.target.value })} /></div>
                    <input className="input" style={{ marginBottom: 6 }} value={selected.fontSize ?? 24} onChange={(e) => updateEl(selected.id, { fontSize: +e.target.value })} placeholder="size" />
                    <textarea className="input" value={selected.text ?? ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })} style={{ minHeight: 60 }} />
                  </>
                )}
                {selected.type !== "text" && (
                  <div className="small row" style={{ marginBottom: 6 }}><span style={{ width: 20 }}>fill</span><input type="color" value={selected.fill ?? "#0b0b0c"} onChange={(e) => updateEl(selected.id, { fill: e.target.value })} /></div>
                )}
              </div>
            )}
            <div className="sect">
              <button className="btn btn-soft btn-sm btn-block" onClick={() => openDoc(seedCanvas({ brandName: p.brandName, accent: "#FF3231" }, "social", `${p.brandName} — new canvas`))}>＋ New canvas</button>
            </div>
            <div className="sect">
              <button className="btn btn-ghost btn-sm btn-block" onClick={() => go("templates")}>{p.brandName} template library →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderEl(e: DesignElement) {
  if (e.type === "text") return <span style={{ fontFamily: e.fontFamily, fontSize: e.fontSize, color: e.color, fontWeight: e.fontWeight, whiteSpace: "pre-wrap", lineHeight: 1.1, letterSpacing: (e as any).letterSpacing ?? 0 }}>{e.text}</span>;
  if (e.type === "rect") return <div style={{ width: "100%", height: "100%", background: e.fill, borderRadius: e.borderRadius ?? 0 }} />;
  if (e.type === "circle") return <div style={{ width: "100%", height: "100%", background: e.fill, borderRadius: "50%" }} />;
  if (e.type === "line") return <div style={{ width: "100%", height: 3, background: e.fill, transform: "translateY(50%)" }} />;
  if (e.type === "image") return <img src={e.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: e.borderRadius ?? 0 }} />;
  return null;
}

function downloadDoc(doc: DesignDocument | null) {
  if (!doc) return;
  const dataUrl = docToDataURL(doc);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${doc.title.replace(/\s+/g, "-").toLowerCase()}-${doc.canvas.width}x${doc.canvas.height}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast("Exported SVG", "Downloaded to your device.", "success");
}
