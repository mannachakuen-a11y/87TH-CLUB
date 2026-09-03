import type { DesignElement, DesignDocument } from "./types";
import { uid } from "./db";
import { dnaFrom, templateCanvas } from "./gen";

// ------------------------------------------------------------------
// Design Studio engine: canvas construction, layering, alignment, and
// AI actions that modify the actual element list. The editor renders
// these elements; the AI actions below really rewrite them.
// ------------------------------------------------------------------

export function el(partial: Partial<DesignElement>): DesignElement {
  return {
    id: uid("el"),
    type: "rect",
    x: 0, y: 0, w: 100, h: 100,
    rotation: 0, z: 0,
    opacity: 1,
    ...partial,
  };
}

export function seedCanvas(parent: { brandName: string; accent: string }, kind: Parameters<typeof templateCanvas>[1], name: string): DesignDocument {
  const d = dnaFrom({ brandName: parent.brandName, accent: parent.accent || "#FF3231", palette: [] });
  const c = templateCanvas(d, kind);
  const nameLower = parent.brandName.toUpperCase();
  const elements: DesignElement[] = [];
  const base = c.width > 1000 ? { title: 96, sub: 30, kick: 18, pad: 80 } : { title: 72, sub: 24, kick: 14, pad: 48 };

  if (kind === "homepage") {
    elements.push(
      el({ type: "rect", w: c.width, h: c.height, fill: d.monoBg, z: 0 }),
      el({ type: "rect", x: 0, y: 0, w: c.width, h: c.height * 0.62, fill: d.accent, z: 1, opacity: 0.9 }),
      el({ type: "text", x: base.pad, y: c.height * 0.62 - 110, w: c.width - base.pad * 2, h: 120, text: nameLower, fontSize: base.title, fontWeight: 700, color: "#fff", fontFamily: d.serif, z: 2 }),
      el({ type: "text", x: base.pad, y: c.height * 0.62 - 40, text: "A single, unmistakable value proposition.", fontSize: base.sub, color: "#fff" }, ),
      el({ type: "rect", x: base.pad, y: c.height * 0.62 + 20, w: 200, h: 56, fill: d.monoBg, z: 2, borderRadius: 999 }),
      el({ type: "text", x: base.pad + 40, y: c.height * 0.62 + 42, w: 200, h: 40, text: "SHOP NOW", fontSize: base.kick, color: "#fff", fontFamily: d.sans, z: 3, letterSpacing: 2 }),
      el({ type: "rect", x: base.pad, y: c.height * 0.62 + 120, w: c.width - base.pad * 2, h: 250, fill: d.bgs[0], z: 1, borderRadius: 24 }),
      el({ type: "text", x: base.pad + 40, y: c.height * 0.62 + 200, text: "NEW DROP", fontSize: base.kick, color: "#666", fontFamily: d.sans, letterSpacing: 3, z: 2 }),
      el({ type: "text", x: base.pad + 40, y: c.height * 0.62 + 250, text: "The collection you'll never put down.", fontSize: base.sub, color: d.fg, fontFamily: d.serif, z: 2 }),
    );
  } else if (kind === "product") {
    elements.push(
      el({ type: "rect", w: c.width, h: c.height, fill: "#fff", z: 0 }),
      el({ type: "rect", x: 40, y: 40, w: c.width - 80, h: c.height - 80, fill: d.bgs[0], z: 1, opacity: 0.9 }),
      el({ type: "rect", x: 120, y: 220, w: c.width - 240, h: c.height - 440, fill: d.fg, z: 2, borderRadius: 18 }),
      el({ type: "text", x: 120, y: 240, w: c.width - 240, h: 120, text: nameLower, fontSize: 72, fontWeight: 700, color: "#fff", fontFamily: d.serif, z: 3 }),
      el({ type: "text", x: 120, y: 340, text: `$${(c.width / 20).toFixed(0)}`, fontSize: 40, color: d.accent, fontFamily: d.sans, z: 3 }),
      el({ type: "rect", x: 120, y: c.height - 220, w: c.width - 240, h: 60, fill: d.accent, z: 3, borderRadius: 999 }),
      el({ type: "text", x: 400, y: c.height - 184, w: 400, h: 40, text: "ADD TO CART · SIZE GUIDE", fontSize: base.kick, color: "#fff", fontFamily: d.sans, z: 4 }),
    );
  } else {
    // generic social / poster / board / campaign
    elements.push(
      el({ type: "rect", w: c.width, h: c.height, fill: d.bgs[0], z: 0 }),
      el({ type: "rect", x: 0, y: 0, w: c.width, h: c.height * 0.5, fill: d.monoBg, z: 1 }),
      el({ type: "circle", x: c.width * 0.6, y: c.height * 0.08, w: c.width * 0.4, h: c.width * 0.4, fill: d.accent, z: 2, opacity: 0.9 }),
      el({ type: "text", x: base.pad, y: c.height * 0.5 - 120, w: c.width - base.pad * 2, h: 140, text: nameLower, fontSize: base.title, fontWeight: 700, color: "#fff", fontFamily: d.serif, z: 3 }),
      el({ type: "text", x: base.pad, y: c.height * 0.5 - 30, text: "The distinctive world of 2026.", fontSize: base.sub, color: "#fff", fontFamily: d.serif, z: 3, opacity: 0.8 }),
      el({ type: "rect", x: base.pad, y: base.pad, w: 90, h: 3, fill: d.accent, z: 3 }),
      el({ type: "text", x: base.pad, y: c.height - 60, text: `EST. 2026 · ${nameLower}`, fontSize: base.kick, color: '#666', fontFamily: d.sans, letterSpacing: 3, z: 3 }),
      el({ type: "circle", x: base.pad, y: c.height * 0.62, w: 120, h: 120, fill: d.fg, z: 2, opacity: 0.2 }),
    );
  }

  // normalize z
  elements.forEach((e, i) => (e.z = i));
  return { id: uid("doc"), title: name, canvas: { id: c.id, width: c.width, height: c.height, name: c.name }, elements, updatedAt: new Date().toISOString(), variables: {} };
}

export function bringToFront(doc: DesignDocument, id: string): DesignDocument {
  const arr = [...doc.elements];
  const target = arr.find((e) => e.id === id);
  if (!target) return doc;
  arr.splice(arr.indexOf(target), 1);
  arr.push(target);
  arr.forEach((e, i) => (e.z = i));
  return { ...doc, elements: arr };
}

export function sendToBack(doc: DesignDocument, id: string): DesignDocument {
  const arr = [...doc.elements];
  const target = arr.find((e) => e.id === id);
  if (!target) return doc;
  arr.splice(arr.indexOf(target), 1);
  arr.unshift(target);
  arr.forEach((e, i) => (e.z = i));
  return { ...doc, elements: arr };
}

export function deleteElement(doc: DesignDocument, id: string): DesignDocument {
  return { ...doc, elements: doc.elements.filter((e) => e.id !== id) };
}

export function duplicateElement(doc: DesignDocument, id: string): DesignDocument {
  const t = doc.elements.find((e) => e.id === id);
  if (!t) return doc;
  const copy = { ...t, id: uid("el"), x: t.x + 16, y: t.y + 16 };
  return { ...doc, elements: [...doc.elements, copy] };
}

// ---------------- AI ACTIONS (modify the real elements) ----------------

export function makePremium(doc: DesignDocument, accent: string): DesignDocument {
  const elements = doc.elements.map((e) => {
    if (e.type === "text" && e.fontWeight === 700) return { ...e, fontSize: (e.fontSize ?? 0) * 1.08, letterSpacing: 3 };
    if (e.type === "rect") return { ...e, opacity: Math.max(0.92, e.opacity), borderRadius: e.borderRadius ?? 8 };
    return e;
  });
  // add a signature accent line
  const line = el({ type: "rect", x: 80, y: doc.canvas.height - 40, w: 120, h: 3, fill: accent, z: elements.length });
  return { ...doc, elements: [...elements, line] };
}

export function useBrandWorld(doc: DesignDocument, accent: string, bg: string): DesignDocument {
  const elements = doc.elements.map((e) => {
    if (e.type === "text") return { ...e };
    if (e.fill === "#FF3231" || /^#eee|^#fff|^#f\d/i.test(e.fill ?? "")) return e;
    if (e.type === "rect" && e.opacity < 0.5) return e;
    return { ...e, fill: e.fill === "#0b0b0c" ? bg : e.fill };
  });
  return { ...doc, elements };
}

export function mobileFirst(doc: DesignDocument): DesignDocument {
  // Rescale everything to a 9:16 canvas, reflow to single column.
  const w = 1080, h = 1920;
  const scale = Math.min(w / doc.canvas.width, h / doc.canvas.height);
  const elements = doc.elements.map((e) => ({
    ...e,
    x: 60,
    y: Math.min(e.y * scale, h - 300),
    w: w - 120,
    h: e.h,
    fontSize: (e.fontSize ?? 0),
  }));
  const hdr = el({ type: "text", x: 60, y: 200, w: w - 120, h: 200, text: doc.title.toUpperCase(), fontSize: 96, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif", z: 0 });
  return { ...doc, canvas: { ...doc.canvas, width: w, height: h }, elements: [hdr, ...elements.map((e, i) => ({ ...e, z: i + 1 }))] };
}

export function drawFiveAds(doc: DesignDocument, accent: string): DesignDocument[] {
  const base = doc.elements.filter((e) => e.type === "text");
  const tags = ["DROP", "LIMITED", "NEW", "CULT", "ESSENTIAL"];
  return tags.map((t, i) => {
    const el2 = base.map((e) => ({ ...e, y: e.y + 20, text: e.text === doc.title.toUpperCase() ? t : e.text, opacity: e.opacity }));
    const badge = el({ type: "rect", x: doc.canvas.width - 240, y: 80, w: 160, h: 48, fill: accent, z: el2.length, borderRadius: 999 });
    const label = el({ type: "text", x: doc.canvas.width - 216, y: 96, w: 160, h: 40, text: `VARIANT ${i + 1}`, fontSize: 14, color: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif", z: el2.length + 1 });
    return { ...doc, elements: [...el2, badge, label] };
  });
}

export function reelFromPost(doc: DesignDocument): DesignDocument {
  const w = 1080, h = 1920;
  const base = doc.elements.filter((e) => e.type === "text");
  return {
    ...doc,
    title: doc.title + " (Reel)",
    canvas: { ...doc.canvas, width: w, height: h },
    elements: [
      el({ type: "rect", w, h, fill: "#0b0b0c", z: 0 }),
      el({ type: "text", x: 80, y: 720, w: w - 160, h: 340, text: "POV: the new drop", fontSize: 84, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif", z: 1 }),
      ...base.map((e, i) => ({ ...e, x: 80, y: 1120 + i * 90, w: w - 160, z: i + 2, fontSize: 32, color: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif" })),
    ],
  };
}

export function fromReference(doc: DesignDocument, reference: { principles: string[] }): DesignDocument {
  const note = el({
    type: "text", x: 40, y: doc.canvas.height - 120, w: doc.canvas.width - 80, h: 60,
    text: `REFERENCE PRINCIPLES APPLIED · ${reference.principles.slice(0, 3).join(" · ").toUpperCase()}`,
    fontSize: 14, color: "#888", fontFamily: "'Helvetica Neue', Arial, sans-serif", z: doc.elements.length,
  });
  return { ...doc, elements: [...doc.elements, note] };
}

export function docToDataURL(doc: DesignDocument): string {
  // Render an SVG preview of the canvas (approximation used for asset export).
  const { width, height } = doc.canvas;
  const parts = doc.elements.map((e) => {
    const common = `x="${e.x}" y="${e.y}" transform="rotate(${e.rotation} ${e.x + e.w / 2} ${e.y + e.h / 2})" opacity="${e.opacity}"`;
    if (e.type === "rect")
      return `<rect ${common} width="${e.w}" height="${e.h}" rx="${e.borderRadius ?? 0}" fill="${e.fill ?? "#000"}"/>`;
    if (e.type === "circle")
      return `<circle ${common} cx="${e.x + e.w / 2}" cy="${e.y + e.h / 2}" r="${Math.min(e.w, e.h) / 2}" fill="${e.fill ?? "#000"}"/>`;
    if (e.type === "line")
      return `<line x1="${e.x}" y1="${e.y}" x2="${e.x + e.w}" y2="${e.y + e.h}" stroke="${e.fill ?? "#000"}" stroke-width="${e.h || 2}"/>`;
    if (e.type === "text")
      return `<text ${common} x="${e.x}" y="${e.y + (e.fontSize ?? 24)}" font-family="${e.fontFamily ?? "Georgia, serif"}" font-size="${e.fontSize ?? 24}" font-weight="${e.fontWeight ?? 400}" fill="${e.color ?? "#000"}" letter-spacing="${e.letterSpacing ?? 0}">${e.text ?? ""}</text>`;
    return `<rect ${common} width="${e.w}" height="${e.h}" fill="${e.fill ?? "#000"}"/>`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#fff"/>${parts}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
