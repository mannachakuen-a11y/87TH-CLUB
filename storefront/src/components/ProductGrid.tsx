import type { Product } from "../data";
import ProductCard from "./ProductCard";

export default function ProductGrid({ items, base = "" }: { items: Product[]; base?: string }) {
  return (
    <ul className="pgrid">
      {items.map((p, i) => (
        <ProductCard key={p.handle} p={p} eager={i < 6} base={base} />
      ))}
    </ul>
  );
}
