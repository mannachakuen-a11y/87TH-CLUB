import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { CATEGORY_LABEL, familyOf, formatPrice, getProduct, products, FREE_SHIPPING_USD } from "../data";
import { useStore } from "../store";
import NotFound from "./NotFound";

const SIZE_GUIDE: Record<string, { head: string[]; rows: string[][] }> = {
  tops: { head: ["Size", "Chest (in)", "Length (in)"], rows: [["XS", "38", "27"], ["S", "41", "28"], ["M", "44", "29"], ["L", "47", "30"], ["XL", "50", "31"], ["XXL", "53", "32"]] },
  waist: { head: ["Size", "Waist (in)", "Inseam (in)"], rows: [["28", "28.5", "32"], ["30", "30.5", "32"], ["32", "32.5", "32"], ["34", "34.5", "32"], ["36", "36.5", "32"], ["38", "38.5", "32"]] },
};

function Toggle({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pdp-toggle">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
        <svg className={`chev${open ? " is-open-down" : ""}`} width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
          {defaultOpen ? <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" /> : <path d="M2 0.5l3.5 2.5L2 5.5" fill="none" stroke="currentColor" />}
        </svg>
      </button>
      {open && <div className="pdp-toggle-body">{children}</div>}
    </div>
  );
}

export default function Product() {
  const { handle = "", collection } = useParams();
  const p = getProduct(handle);
  const { currency, add, setBagOpen } = useStore();
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(p && p.sizes.length === 1 && !p.soldOut.length ? p.sizes[0] : null);
    setError(false);
    setSlide(0);
    track.current?.scrollTo({ left: 0 });
    window.scrollTo(0, 0);
    if (p) document.title = `${p.title} - ${p.colour} | 87TH CLUB`;
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <NotFound />;
  const family = familyOf(p);
  const base = collection ? `/collections/${collection}` : "";
  const related = products.filter((q) => q.category === p.category && q.family !== p.family).concat(products.filter((q) => q.family !== p.family && q.category !== p.category && q.newArrival)).slice(0, 4);
  const guide = p.sizes[0] === "28" ? SIZE_GUIDE.waist : p.sizes.length > 1 ? SIZE_GUIDE.tops : null;
  const allOut = p.soldOut.length === p.sizes.length;

  const onAdd = () => {
    if (!size) {
      setError(true);
      return;
    }
    add(p.handle, size);
    setBagOpen(true);
  };

  return (
    <main className="main pdp" id="main">
      <div className="pdp-wrap">
        <div className="pdp-gallery">
          <div
            className="pdp-track"
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {p.images.map((src, i) => (
              <div className="pdp-slide" key={src}>
                <img src={src} alt={`${p.title} in ${p.colour}${i ? ", alternate view" : ""}`} loading={i === 0 ? "eager" : "lazy"} width={960} height={1200} />
              </div>
            ))}
          </div>
          <div className="pdp-dots mobile-only" aria-hidden="true">
            {slide + 1} / {p.images.length}
          </div>
        </div>
        <div className="pdp-info">
          <div className="pdp-sticky">
            <h1>{p.title}</h1>
            <p className="pdp-price">{formatPrice(p.price, currency)}</p>
            <p className="grey">{p.colour}</p>
            <div className="pdp-sizes" role="radiogroup" aria-label="Size">
              {p.sizes.map((s) => {
                const out = p.soldOut.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={size === s}
                    className={`${size === s ? "is-selected" : ""}${out ? " is-out" : ""}`}
                    disabled={out}
                    onClick={() => {
                      setSize(s);
                      setError(false);
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {family.length > 1 && (
              <div className="pdp-colours" aria-label="Colour">
                {family.map((f) => (
                  <Link key={f.handle} to={`${base}/products/${f.handle}`} className={f.handle === p.handle ? "is-selected" : ""} title={f.colour} aria-label={`${f.title} in ${f.colour}`}>
                    <img src={f.images[0]} alt="" loading="lazy" />
                  </Link>
                ))}
              </div>
            )}
            <button type="button" className="btn btn--black pdp-add" onClick={onAdd} disabled={allOut}>
              {allOut ? "Sold Out" : error ? "Please Select A Size" : "Add To Bag"}
            </button>
            <Toggle label="Product Details" defaultOpen>
              <p className="pdp-desc">{p.description}</p>
              <ul className="pdp-details">
                {p.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
                <li>Category: {CATEGORY_LABEL[p.category]}</li>
              </ul>
            </Toggle>
            {guide && (
              <Toggle label="Size Guide">
                <table className="size-table">
                  <thead>
                    <tr>{guide.head.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {guide.rows.map((r) => (
                      <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </Toggle>
            )}
            <Toggle label="Shipping & Returns">
              <p>Standard shipping 3-7 business days. Express shipping 1-3 business days.</p>
              <p>Unworn items may be returned within 30 days of delivery for a full refund.</p>
            </Toggle>
            <p className="pdp-note">
              Free standard shipping for orders over {formatPrice(FREE_SHIPPING_USD, currency)}. Exclusions apply.
            </p>
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
