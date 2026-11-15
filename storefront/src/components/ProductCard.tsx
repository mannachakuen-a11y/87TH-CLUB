import { Link } from "react-router-dom";
import { formatPrice, isAvailable, type Product } from "../data";
import { useStore } from "../store";

export default function ProductCard({ p, eager = false, base = "" }: { p: Product; eager?: boolean; base?: string }) {
  const { currency, add, setBagOpen } = useStore();
  const href = `${base}/products/${p.handle}`;
  const available = isAvailable(p);
  const label = `${p.colour} ${p.title}`;
  return (
    <li className="card">
      <Link to={href} className="card-media" aria-label={label} draggable={false}>
        <div className="card-track">
          {p.images.map((src, i) => (
            <div className={`card-slide${i > 0 ? " card-slide--alt" : ""}`} key={src}>
              <img
                src={src}
                alt={i === 0 ? `${p.title} in ${p.colour}` : `${p.title} in ${p.colour}, alternate view`}
                loading={eager && i === 0 ? "eager" : "lazy"}
                decoding="async"
                width={960}
                height={1200}
              />
            </div>
          ))}
        </div>
      </Link>
      <div className="card-info">
        <div className="card-title">
          <Link to={href} aria-label={label}>
            {p.title}
          </Link>
          {!available && <span className="grey">Sold out</span>}
        </div>
        <div className="card-price">{formatPrice(p.price, currency)}</div>
        <div className="card-sizes" aria-label="Quick add size">
          {p.sizes.map((s) => {
            const out = p.soldOut.includes(s);
            return (
              <button
                key={s}
                type="button"
                className={out ? "is-out" : ""}
                disabled={out}
                title={out ? `${s} sold out` : `Add ${s} to bag`}
                onClick={() => {
                  add(p.handle, s);
                  setBagOpen(true);
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}
