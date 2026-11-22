import { useState } from "react";
import { useApp, useActiveProjectId, saveDesignDoc, log, pushNotification } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Seg, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { seedCanvas } from "../lib/design";
import type { DesignDocument } from "../lib/types";

// A website + checkout redesign workbench. You shape the brand's site
// (home / collection / product / cart / checkout) in a live preview,
// push it into Design Studio as an editable canvas, or export standalone
// HTML. Everything is real project state — nothing is faked.

const PAGES = [
  { id: "homepage", label: "Homepage" },
  { id: "collection", label: "Collection" },
  { id: "product", label: "Product" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
] as const;
type PageId = (typeof PAGES)[number]["id"];

const LAYOUTS = [
  { id: "zine", label: "Zine / street" },
  { id: "clean", label: "Clean" },
  { id: "editorial", label: "Editorial" },
] as const;

const rand = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export default function WebsiteStudio() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);

  const [page, setPage] = useState<PageId>("homepage");
  const [layout, setLayout] = useState<(typeof LAYOUTS)[number]["id"]>("zine");
  const [headline, setHeadline] = useState("Wear the culture.");
  const [sub, setSub] = useState("A limited drop for the ones who move different.");
  const [cta, setCta] = useState("Shop the drop");
  const [price, setPrice] = useState("45");
  const [accent, setAccent] = useState("#FF3231");
  const [trust, setTrust] = useState(true);
  const [newsletter, setNewsletter] = useState(true);

  if (!p) return <PageHead title="Website Studio" sub="Open or create a project first." />;

  const brand = p.brandName?.toUpperCase() || "YOUR BRAND";
  const dark = layout !== "clean";
  const navBg = dark ? "#0b0b0d" : "#ffffff";
  const bodyBg = dark ? "#f6f1e7" : "#fafafa";
  const fg = dark ? "#0b0b0d" : "#141414";
  const onDark = "#ffffff";

  const seed = brand.length * 37 + page.length + 3;
  const rnd = rand(seed);
  const products = [
    { name: "Oversized Hoodie", price: Number(price) },
    { name: "Boxy Tee", price: Number(price) + 5 },
    { name: "Cargo Pant", price: Number(price) + 12 },
    { name: "Track Jacket", price: Number(price) + 18 },
    { name: "Amulet Cap", price: Number(price) - 5 },
    { name: "Crew Sock", price: Number(price) - 10 },
  ];

  const toDesignStudio = () => {
    const kind: Parameters<typeof seedCanvas>[1] = page === "homepage" || page === "collection" ? "homepage" : page === "product" ? "product" : "campaign";
    const doc: DesignDocument = seedCanvas({ brandName: p.brandName, accent }, kind, `${p.brandName} — ${PAGES.find((x) => x.id === page)!.label}`);
    doc.variables = { "brand name": p.brandName, colors: accent, fonts: "Impact + Helvetica", headline, sub, cta, page };
    saveDesignDoc(doc, p.id);
    log(p.id, "user", "design", `Built ${page} in Website Studio → Design Studio`);
    pushNotification(`Website ${page} pushed to Design Studio`, "Open it to edit the canvas layer-by-layer.", "success");
    toast("Website design ready", "It's now in Design Studio to refine.", "success");
    go("design");
  };

  const exportHtml = () => {
    const html = buildHtml(p.brandName, brand, page, layout, headline, sub, cta, accent, bodyBg, fg, dark, onDark, products, price, trust, newsletter);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(p.brandName)}-${page}.html`;
    a.click();
    URL.revokeObjectURL(url);
    log(p.id, "user", "export", `Exported ${page} HTML`);
    toast(`Exported ${page} HTML`, "A standalone page file was downloaded.", "info");
  };

  return (
    <div>
      <PageHead
        eyebrow="Website Studio"
        title="Design your site & checkout."
        sub="Shape the pages your customer actually sees — then push the design into Design Studio or export a real HTML page."
        actions={
          <div className="row">
            <button className="btn btn-ghost" onClick={exportHtml}><Ic.download size={16} /> Export HTML</button>
            <button className="btn btn-accent" onClick={toDesignStudio}><Ic.pen size={16} /> Push to Design Studio</button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "330px minmax(0,1fr)", gap: 28, alignItems: "start" }}>
        {/* ---- Controls ---- */}
        <div className="glass" style={{ padding: 22, position: "sticky", top: 88 }}>
          <div className="kicker" style={{ color: "var(--ink-soft)", marginBottom: 14 }}>Page</div>
          <Seg options={PAGES.map((x) => ({ id: x.id, label: x.label }))} value={page} onChange={(v) => setPage(v as PageId)} />

          <div className="kicker" style={{ color: "var(--ink-soft)", margin: "22px 0 14px" }}>Direction</div>
          <div className="stack" style={{ gap: 14 }}>
            <Field label="Headline"><input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
            <Field label="Sub-line"><input className="input" value={sub} onChange={(e) => setSub(e.target.value)} /></Field>
            <Field label="Button"><input className="input" value={cta} onChange={(e) => setCta(e.target.value)} /></Field>
            <Field label="Price ($)"><input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Accent colour">
              <div className="row">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 46, height: 40, border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: 3, background: "transparent" }} />
                <span className="mono small muted">{accent.toUpperCase()}</span>
              </div>
            </Field>
          </div>

          <div className="kicker" style={{ color: "var(--ink-soft)", margin: "22px 0 14px" }}>Layout</div>
          <Seg options={LAYOUTS.map((x) => ({ id: x.id, label: x.label }))} value={layout} onChange={(v) => setLayout(v as typeof LAYOUTS[number]["id"])} />

          <div className="kicker" style={{ color: "var(--ink-soft)", margin: "22px 0 6px" }}>Sections</div>
          <label className="row" style={{ gap: 10, fontSize: 13, cursor: "pointer", padding: "8px 0" }}>
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} style={{ accentColor: "var(--brand)" }} />
            Trust badges (reviews · shipping · returns)
          </label>
          <label className="row" style={{ gap: 10, fontSize: 13, cursor: "pointer", padding: "8px 0 2px" }}>
            <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} style={{ accentColor: "var(--brand)" }} />
            Newsletter capture
          </label>
        </div>

        {/* ---- Live preview ---- */}
        <div>
          <div className="spread" style={{ marginBottom: 12 }}>
            <span className="kicker" style={{ color: "var(--muted)" }}>Live preview · {PAGES.find((x) => x.id === page)?.label}</span>
            <span className="chip">{brand}</span>
          </div>
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-md)", background: bodyBg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#2b2b2e", color: "#c9c9cc" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <div style={{ flex: 1, marginLeft: 8, background: "rgba(255,255,255,.12)", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "rgba(255,255,255,.6)" }}>{slug(p.brandName) + ".com/" + page}</div>
            </div>
            <div style={{ background: navBg, padding: "14px 24px", display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 18, textTransform: "uppercase", color: dark ? onDark : fg }}>{brand.slice(0, 8)}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
                {["Shop", "About", "Journal"].map((n) => <span key={n} style={{ color: dark ? "rgba(255,255,255,.75)" : fg, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{n}</span>)}
                <span style={{ color: accent, fontWeight: 800 }}>Cart ({(1 + Math.floor(rnd() * 3))})</span>
              </span>
            </div>

            <div style={{ padding: "30px 28px", background: bodyBg, minHeight: 460 }}>
              {page === "homepage" && (
                <div>
                  <div style={{ background: dark ? "#0b0b0d" : accent, color: dark ? onDark : onDark, borderRadius: "var(--radius)", padding: "46px 36px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -30, right: -20, width: 200, height: 200, borderRadius: "50%", background: accent, opacity: dark ? 0.5 : 0.18 }} />
                    <div className="kicker" style={{ color: dark ? accent : "rgba(255,255,255,.8)", marginBottom: 14 }}>New season</div>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 44, lineHeight: 0.98, letterSpacing: "-0.02em", maxWidth: 460 }}>{headline}</div>
                    <div style={{ color: dark ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.85)", marginTop: 16, maxWidth: 380 }}>{sub}</div>
                    <div className="row" style={{ marginTop: 24 }}>
                      <span style={{ background: dark ? accent : "#0b0b0d", color: "#fff", padding: "12px 22px", borderRadius: "var(--radius-sm)", fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{cta}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                    {products.slice(0, 3).map((pr, i) => <ProductCard key={i} pr={pr} accent={accent} bodyBg={bodyBg} fg={fg} rnd={rnd} />)}
                  </div>
                  {newsletter && <Newsletter accent={accent} fg={fg} />}
                </div>
              )}

              {page === "collection" && (
                <div>
                  <div className="kicker" style={{ color: "var(--muted)" }}>The collection</div>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 34, marginBottom: 22 }}>{headline}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                    {products.map((pr, i) => <ProductCard key={i} pr={pr} accent={accent} bodyBg={bodyBg} fg={fg} rnd={rnd} />)}
                  </div>
                </div>
              )}

              {page === "product" && (
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 26 }}>
                  <div style={{ background: "#e9e2d3", borderRadius: "var(--radius)", aspectRatio: "3/4", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, #d8d0c0, #c4bba8)" }} />
                    <div style={{ position: "absolute", left: "24px", bottom: "24px", fontFamily: "var(--display)", fontWeight: 900, fontSize: 54, color: "rgba(11,11,13,.12)", textTransform: "uppercase", letterSpacing: "-0.02em" }}>{brand.slice(0, 5)}</div>
                  </div>
                  <div>
                    <div className="kicker" style={{ color: accent, marginBottom: 8 }}>Outcome 04 · Conversion</div>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 30, lineHeight: 1 }}>{products[1].name}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10, color: accent }}>${products[1].price}</div>
                    <div style={{ color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>{sub}</div>
                    <div style={{ marginTop: 18, background: accent, color: "#fff", textAlign: "center", padding: "15px", borderRadius: "var(--radius-sm)", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>Add to cart</div>
                    <div className="row" style={{ marginTop: 12 }}>
                      <span className="chip">Size guide</span>
                      <span className="chip">Free shipping over $60</span>
                    </div>
                    {trust && <TrustRow fg={fg} />}
                  </div>
                </div>
              )}

              {page === "cart" && (
                <div>
                  <div className="kicker" style={{ color: "var(--muted)" }}>Your bag</div>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 34, marginBottom: 22 }}>Cart</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {products.slice(0, 3).map((pr, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto auto", gap: 16, alignItems: "center", background: dark ? "rgba(11,11,13,.04)" : "#fff", border: "1px solid var(--line-strong)", borderRadius: "var(--radius)", padding: 12 }}>
                        <div style={{ width: 72, height: 72, background: "linear-gradient(145deg,#d8d0c0,#c4bba8)", borderRadius: "var(--radius-sm)" }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{pr.name}</div>
                          <div className="small muted">Qty · 1</div>
                        </div>
                        <div className="small muted">${pr.price}</div>
                        <span style={{ color: accent, fontSize: 18 }}>✕</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontWeight: 800, fontSize: 18 }}>
                    <span>Subtotal</span><span>${products[0].price + products[1].price + products[2].price}</span>
                  </div>
                  <div style={{ marginTop: 16, background: accent, color: "#fff", textAlign: "center", padding: "15px", borderRadius: "var(--radius-sm)", fontWeight: 800, textTransform: "uppercase" }}>Checkout</div>
                </div>
              )}

              {page === "checkout" && (
                <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 26 }}>
                  <div style={{ background: dark ? "#0b0b0d" : "#fff", color: dark ? onDark : fg, borderRadius: "var(--radius)", padding: 22 }}>
                    <div className="kicker" style={{ color: accent, marginBottom: 10 }}>Secure checkout</div>
                    <Stacked total={products[0].price + products[1].price + products[2].price + 6} accent={accent} fg={dark ? onDark : fg} onDark={onDark} dark={dark} />
                  </div>
                  <div>
                    <div className="kicker" style={{ color: "var(--muted)", marginBottom: 10 }}>Contact & delivery</div>
                    {["Email", "Name", "Address", "City"].map((f) => (
                      <div key={f} style={{ border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 10, color: "var(--faint)" }}>{f}</div>
                    ))}
                    <div className="row" style={{ gap: 10 }}>
                      {["Card", "Apple Pay", "M-Pesa"].map((m) => <span key={m} className="chip" style={{ borderColor: accent, color: accent }}>{m}</span>)}
                    </div>
                    <div style={{ marginTop: 16, background: accent, color: "#fff", textAlign: "center", padding: "15px", borderRadius: "var(--radius-sm)", fontWeight: 800, textTransform: "uppercase" }}>Pay ${products[0].price + products[1].price + products[2].price + 6}</div>
                    {trust && <TrustRow fg={fg} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- small presentational helpers ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field" style={{ marginBottom: 0 }}><label>{label}</label>{children}</div>;
}

function ProductCard({ pr, accent, bodyBg, fg, rnd }: { pr: { name: string; price: number }; accent: string; bodyBg: string; fg: string; rnd: () => number }) {
  return (
    <div style={{ background: bodyBg, border: "1px solid var(--line-strong)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ aspectRatio: "1/1", background: "linear-gradient(145deg,#d8d0c0,#c4bba8)", position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: 12, background: accent, color: "#fff", padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>New</span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{pr.name}</div>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontWeight: 800, color: accent }}>${pr.price}</span>
          <span style={{ color: fg, fontSize: 12, fontWeight: 700 }}>+ Bag</span>
        </div>
      </div>
    </div>
  );
}

function TrustRow({ fg }: { fg: string }) {
  return (
    <div className="row" style={{ marginTop: 16, gap: 14, color: fg, opacity: 0.8 }}>
      <span className="row" style={{ gap: 6 }}><Ic.check size={14} /> 4.9★ reviews</span>
      <span className="row" style={{ gap: 6 }}><Ic.box size={14} /> Free shipping</span>
      <span className="row" style={{ gap: 6 }}><Ic.refresh size={14} /> 30-day returns</span>
    </div>
  );
}

function Newsletter({ accent, fg }: { accent: string; fg: string }) {
  return (
    <div style={{ marginTop: 22, border: "1px solid var(--line-strong)", borderRadius: "var(--radius)", padding: 20, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 800 }}>Join the list</div>
        <div className="small muted">Early access to drops. No spam.</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" placeholder="you@brand.com" style={{ maxWidth: 190 }} />
        <span style={{ background: accent, color: "#fff", padding: "12px 18px", borderRadius: "var(--radius-sm)", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>Join</span>
      </div>
    </div>
  );
}

function Stacked({ total, accent, fg, onDark, dark }: { total: number; accent: string; fg: string; onDark: string; dark: boolean }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}><span>Subtotal</span><span>${(total - 6).toFixed(0)}</span></div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}><span>Shipping</span><span>$6</span></div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.2)", margin: "12px 0" }} />
      <div className="row" style={{ justifyContent: "space-between", fontWeight: 800, fontSize: 20 }}><span>Total</span><span style={{ color: accent }}>${total}</span></div>
    </div>
  );
}

function slug(s: string): string {
  return (s || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------- standalone HTML export ----------
function buildHtml(brandName: string, brand: string, page: PageId, layout: string, headline: string, sub: string, cta: string, accent: string, bodyBg: string, fg: string, dark: boolean, onDark: string, products: { name: string; price: number }[], price: string, trust: boolean, newsletter: boolean): string {
  const navBg = dark ? "#0b0b0d" : "#ffffff";
  const card = (pr: { name: string; price: number }) => `<div style="border:1px solid rgba(11,11,13,.14);border-radius:6px;overflow:hidden;background:${bodyBg}">
      <div style="aspect-ratio:1/1;background:linear-gradient(145deg,#d8d0c0,#c4bba8)"></div>
      <div style="padding:12px"><b>${pr.name}</b><div style="display:flex;justify-content:space-between;margin-top:6px"><b style="color:${accent}">$${pr.price}</b><span style="font-size:12px;font-weight:700">+ Bag</span></div></div>
    </div>`;
  const trustHtml = trust ? `<div style="margin-top:16px;opacity:.8;font-size:13px;color:${fg}">4.9★ reviews · Free shipping · 30-day returns</div>` : "";
  const newsletterHtml = newsletter ? `<div style="margin-top:22px;border:1px solid rgba(11,11,13,.14);border-radius:6px;padding:20px;display:flex;justify-content:space-between;align-items:center"><b>Join the list</b><button style="background:${accent};color:#fff;border:0;padding:12px 18px;border-radius:4px;font-weight:800">Join</button></div>` : "";

  let body = "";
  if (page === "homepage") {
    body = `<div style="background:${dark ? "#0b0b0d" : accent};color:#fff;border-radius:6px;padding:46px 36px"><div style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:${dark ? accent : "rgba(255,255,255,.8)"}">New season</div><h1 style="font-family:Impact,'Arial Black',sans-serif;font-weight:900;text-transform:uppercase;font-size:44px;line-height:.98;max-width:460px;margin:14px 0 0">${headline}</h1><p style="max-width:380px;opacity:.8;margin-top:16px">${sub}</p><button style="margin-top:24px;background:${dark ? accent : "#0b0b0d"};color:#fff;border:0;padding:12px 22px;border-radius:4px;font-weight:800;text-transform:uppercase">${cta}</button></div>
      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${products.slice(0, 3).map(card).join("")}</div>${newsletterHtml}`;
  } else if (page === "collection") {
    body = `<div style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:${accent}">The collection</div><h1 style="font-family:Impact,'Arial Black',sans-serif;font-weight:900;text-transform:uppercase;font-size:34px;margin:10px 0 22px">${headline}</h1><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${products.map(card).join("")}</div>`;
  } else if (page === "product") {
    body = `<div style="display:grid;grid-template-columns:1.1fr .9fr;gap:26px"><div style="aspect-ratio:3/4;border-radius:6px;background:linear-gradient(145deg,#d8d0c0,#c4bba8)"></div><div><div style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:${accent}">Conversion</div><h1 style="font-family:Impact,'Arial Black',sans-serif;font-weight:900;text-transform:uppercase;font-size:30px;line-height:1">${products[1].name}</h1><div style="font-size:26px;font-weight:800;margin-top:10px;color:${accent}">$${products[1].price}</div><p style="color:${fg};opacity:.7;margin-top:10px">${sub}</p><div style="margin-top:18px;background:${accent};color:#fff;text-align:center;padding:15px;border-radius:4px;font-weight:800;text-transform:uppercase">Add to cart</div></div></div>`;
  } else {
    body = `<div style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:${accent}">Secure checkout</div><h1 style="font-family:Impact,'Arial Black',sans-serif;font-weight:900;text-transform:uppercase;font-size:34px;margin:10px 0 22px">${headline || "Checkout"}</h1><div style="display:flex;justify-content:space-between;font-weight:800;font-size:20px"><span>Total</span><span style="color:${accent}">$${Number(price) + 6 + 5 + 12}</span></div>${trustHtml}`;
  }

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${brandName} — ${page}</title>
<style>body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;background:${bodyBg};color:${fg}}*{box-sizing:border-box}a{color:inherit;text-decoration:none}</style>
</head><body>
<div style="max-width:1000px;margin:0 auto;padding:0 24px 60px">
  <div style="display:flex;align-items:center;gap:18px;padding:16px 0;color:${dark ? onDark : fg}">
    <b style="font-family:Impact,'Arial Black',sans-serif;font-size:20px;text-transform:uppercase">${brand.slice(0, 8)}</b>
    <span style="margin-left:auto;display:flex;gap:16px;font-size:12px;font-weight:700;text-transform:uppercase">Shop About Journal</span>
  </div>
  ${body}
</div>
</body></html>`;
}
