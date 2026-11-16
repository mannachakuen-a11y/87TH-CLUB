import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import FilterPanel, { applyFilters, countFilters, type Filters } from "../components/FilterPanel";
import ProductGrid, { type Callout } from "../components/ProductGrid";
import { callouts as EDITORIAL, categoryImages, collectionProducts } from "../data";
import { useStore } from "../store";
import NotFound from "./NotFound";

const KEYS: (keyof Filters)[] = ["size", "category", "colour", "availability"];

export default function Collection() {
  const { handle = "" } = useParams();
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

  const callouts: Callout[] = (() => {
    const editorial = EDITORIAL.map((f, i) => ({ src: f, to: "/pages/chapters", alt: `Campaign image ${i + 1}` }));
    if (handle === "new-arrivals" || handle === "all") return editorial;
    const cat = categoryImages[handle];
    return cat ? [{ src: cat, to: "/pages/chapters", alt: `${data.title} campaign image` }, ...editorial.slice(0, 2)] : editorial;
  })();

  const onApply = (f: Filters) => {
    const next = new URLSearchParams();
    KEYS.forEach((k) => f[k].length && next.set(k, f[k].join(",")));
    setParams(next, { replace: true });
    window.scrollTo(0, 0);
  };

  return (
    <main className="main collection" id="main">
      <h1 className="visually-hidden">{data.title}</h1>
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
        <ProductGrid items={items} callouts={active ? [] : callouts} base={`/collections/${handle}`} />
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
