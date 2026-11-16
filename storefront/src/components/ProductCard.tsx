import { Link } from "react-router-dom";
import { formatPrice, isAvailable, type Product } from "../data";
import { useStore } from "../store";

export default function ProductCard({ p, eager = false, base = "" }: { p: Product; eager?: boolean; base?: string }) {
  const { currency } = useStore();
  const href = `${base}/products/${p.handle}`;
  return (
    <li className="card">
      <Link to={href} className="card-link" aria-label={`${p.title} [${p.colour}]`}>
        <div className="card-media">
          {p.images.slice(0, 2).map((src, i) => (
            <img
              key={src}
              className={i ? "card-alt" : ""}
              src={src}
              alt={i === 0 ? `${p.title} in ${p.colour}` : ""}
              loading={eager && i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>
        <p className="card-title">
          {p.title} [{p.colour}]
        </p>
        <p className="card-price">{formatPrice(p.price, currency)}</p>
        {!isAvailable(p) && <p className="card-sold">Sold Out</p>}
      </Link>
    </li>
  );
}
