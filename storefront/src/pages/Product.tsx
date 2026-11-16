import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { CATEGORY_LABEL, familyOf, formatPrice, getProduct, products, FREE_SHIPPING_USD } from "../data";
import { useStore } from "../store";
import NotFound from "./NotFound";

const SIZE_GUIDE: Record<string, { head: string[]; rows: string[][] }> = {
  tops: { head: ["Size", "Chest (in)", "Length (in)"], rows: [["XS", "38", "27"], ["S", "41", "28"], ["M", "44", "29"], ["L", "47", "30"], ["XL", "50", "31"], ["XXL", "53", "32"]] },
  waist: { head: ["Size", "Waist (in)", "Inseam (in)"], rows: [["28", "28.5", "32"], ["30", "30.5", "32"], ["32", "32.5", "32"], ["34", "34.5", "32"], ["36", "36.5", "32"], ["38", "38.5", "32"]] },
};

function Accordion({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="acc">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span aria-hidden="true">{open ? "–" : ">"}</span>
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  );
}

export default function Product() {
  const { handle = "", collection } = useParams();
  const p = getProduct(handle);
  const { currency, add, setBagOpen } = useStore();
  const [size, setSize] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setSize(p && p.sizes.length === 1 && !p.soldOut.length ? p.sizes[0] : null);
    setSlide(0);
    setAdded(false);
    window.scrollTo(0, 0);
    if (p) document.title = `${p.title} [${p.colour}] | 87TH CLUB`;
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <NotFound />;
  const family = familyOf(p);
  const base = collection ? `/collections/${collection}` : "";
  const related = products.filter((q) => q.category === p.category && q.family !== p.family).concat(products.filter((q) => q.family !== p.family && q.category !== p.category && q.newArrival)).slice(0, 3);
  const guide = p.sizes[0] === "28" ? SIZE_GUIDE.waist : p.sizes.length > 1 ? SIZE_GUIDE.tops : null;
  const allOut = p.soldOut.length === p.sizes.length;
  const n = p.images.length;

  return (
    <main className="main pdp" id="main">
      <div className="pdp-wrap">
        <div className="pdp-gallery">
          <div className="pdp-stage">
            {p.images.map((src, i) => (
              <img key={src} src={src} alt={`${p.title} in ${p.colour}${i ? `, view ${i + 1}` : ""}`} className={i === slide ? "is-active" : ""} loading={i === 0 ? "eager" : "lazy"} />
            ))}
            {n > 1 && (
              <>
                <button type="button" className="pdp-arrow pdp-arrow--prev" aria-label="Previous image" onClick={() => setSlide((slide - 1 + n) % n)}>‹</button>
                <button type="button" className="pdp-arrow pdp-arrow--next" aria-label="Next image" onClick={() => setSlide((slide + 1) % n)}>›</button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="pdp-dots">
              {p.images.map((src, i) => (
                <button key={src} type="button" aria-label={`Image ${i + 1}`} className={i === slide ? "is-active" : ""} onClick={() => setSlide(i)} />
              ))}
            </div>
          )}
        </div>
        <div className="pdp-info">
          <h1>{p.title} [{p.colour}]</h1>
          <p className="pdp-price">{formatPrice(p.price, currency)}</p>
          <p className="pdp-label">Size</p>
          <div className="pdp-sizes" role="radiogroup" aria-label="Size">
            {p.sizes.map((s) => {
              const out = p.soldOut.includes(s);
              return (
                <button key={s} type="button" role="radio" aria-checked={size === s} className={`${size === s ? "is-selected" : ""}${out ? " is-out" : ""}`} disabled={out} onClick={() => { setSize(s); setAdded(false); }}>
                  {s}
                </button>
              );
            })}
          </div>
          <p className="pdp-label">Colour</p>
          <div className="pdp-colours">
            {family.map((f) => (
              <Link key={f.handle} to={`${base}/products/${f.handle}`} className={f.handle === p.handle ? "is-selected" : ""} title={f.colour} aria-label={`${f.title} in ${f.colour}`}>
                <img src={f.images[0]} alt="" loading="lazy" />
              </Link>
            ))}
          </div>
          <button
            type="button"
            className="pdp-add"
            disabled={allOut || !size}
            onClick={() => {
              if (!size) return;
              add(p.handle, size);
              setAdded(true);
              setBagOpen(true);
            }}
          >
            {allOut ? "Sold Out" : !size ? "Select Size" : added ? "Added — Add Another" : "Add To Cart"}
          </button>
          <div className="pdp-accs">
            <Accordion label="Details">
              <p className="pdp-desc">{p.description}</p>
              <ul className="pdp-details">
                {p.details.map((d) => <li key={d}>{d}</li>)}
                <li>Category: {CATEGORY_LABEL[p.category]}</li>
              </ul>
            </Accordion>
            {guide && (
              <Accordion label="Size Guide">
                <table className="size-table">
                  <thead><tr>{guide.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{guide.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
                </table>
              </Accordion>
            )}
            <Accordion label="Shipping Policy">
              <p>Free standard shipping on orders over {formatPrice(FREE_SHIPPING_USD, currency)}. Standard 3-7 business days, express 1-3 business days.</p>
              <p>Unworn items may be returned within 30 days of delivery.</p>
            </Accordion>
          </div>
        </div>
      </div>
      <section className="related" aria-labelledby="related-h">
        <h2 id="related-h">You May Also Like</h2>
        <ProductGrid items={related} base={base} />
      </section>
    </main>
  );
}
