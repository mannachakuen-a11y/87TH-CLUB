import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import FilterPanel, { applyFilters, countFilters, type Filters } from "../components/FilterPanel";
import ProductGrid from "../components/ProductGrid";
import { collectionProducts } from "../data";
import { useStore } from "../store";
import NotFound from "./NotFound";

const KEYS: (keyof Filters)[] = ["size", "category", "colour", "availability"];

export default function Collection({ handle: fixed }: { handle?: string }) {
  const params0 = useParams();
  const handle = fixed ?? params0.handle ?? "";
  const [params, setParams] = useSearchParams();
  const { setFilterOpen } = useStore();
  const data = collectionProducts(handle);

  const applied: Filters = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, params.get(k)?.split(",").filter(Boolean) ?? []])) as Filters,
    [params]
  );
  if (!data) return <NotFound />;
  const items = applyFilters(data.items, applied);
  const active = countFilters(applied);

  const onApply = (f: Filters) => {
    const next = new URLSearchParams();
    KEYS.forEach((k) => f[k].length && next.set(k, f[k].join(",")));
    setParams(next, { replace: true });
    window.scrollTo(0, 0);
  };

  return (
    <main className="main collection" id="main">
      <h1 className="coll-title">{data.title}</h1>
      {active > 0 && (
        <div className="active-filters">
          <span>
            {items.length} {items.length === 1 ? "Product" : "Products"}
          </span>
          {KEYS.flatMap((k) => applied[k].map((v) => ({ k, v }))).map(({ k, v }) => (
            <button
              key={k + v}
              type="button"
              onClick={() => onApply({ ...applied, [k]: applied[k].filter((x) => x !== v) })}
              aria-label={`Remove filter ${v}`}
            >
              {v.replace("-", " ")} ×
            </button>
          ))}
          <button type="button" className="u" onClick={() => onApply({ size: [], category: [], colour: [], availability: [] })}>
            Clear All
          </button>
        </div>
      )}
      {items.length ? (
        <ProductGrid items={items} base={`/collections/${handle}`} />
      ) : (
        <div className="empty">
          <p>No products match the selected filters.</p>
          <p>
            <button type="button" className="u" onClick={() => setFilterOpen(true)}>
              Edit filters
            </button>
            &nbsp;&nbsp;
            <Link to={`/collections/${handle}`} className="u">
              Clear filters
            </Link>
          </p>
        </div>
      )}
      <FilterPanel items={data.items} applied={applied} onApply={onApply} />
    </main>
  );
}
