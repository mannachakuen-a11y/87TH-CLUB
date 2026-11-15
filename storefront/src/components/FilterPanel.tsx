import { useEffect, useState } from "react";
import { CATEGORY_LABEL, type Product } from "../data";
import { useStore } from "../store";

export type Filters = { size: string[]; category: string[]; colour: string[]; availability: string[] };
export const EMPTY: Filters = { size: [], category: [], colour: [], availability: [] };
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38", "ONE SIZE"];
const SWATCH: Record<string, string> = {
  Black: "#111", White: "#fff", Grey: "#9a9a9a", Blue: "#3b5b8c", Green: "#3f5a3a", Brown: "#7b4a2a", Pink: "#e6a9b8",
  Orange: "#d9692b", Yellow: "#e8c13a", Natural: "#e6dcc8", Gold: "#c9a45a", Purple: "#b48cc6", Multi: "linear-gradient(135deg,#d9692b,#3b5b8c,#e8c13a)",
};

export function countFilters(f: Filters) {
  return f.size.length + f.category.length + f.colour.length + f.availability.length;
}

export function applyFilters(items: Product[], f: Filters) {
  return items.filter(
    (p) =>
      (!f.size.length || f.size.some((s) => p.sizes.includes(s) && !p.soldOut.includes(s))) &&
      (!f.category.length || f.category.includes(p.category)) &&
      (!f.colour.length || f.colour.includes(p.colourGroup)) &&
      (!f.availability.length ||
        f.availability.some((a) => (a === "in-stock" ? p.soldOut.length < p.sizes.length : p.soldOut.length > 0)))
  );
}

export default function FilterPanel({ items, applied, onApply }: { items: Product[]; applied: Filters; onApply: (f: Filters) => void }) {
  const { filterOpen, setFilterOpen } = useStore();
  const [draft, setDraft] = useState<Filters>(applied);
  useEffect(() => {
    if (filterOpen) setDraft(applied);
  }, [filterOpen, applied]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilterOpen(false);
    if (filterOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterOpen, setFilterOpen]);

  const sizes = SIZE_ORDER.filter((s) => items.some((p) => p.sizes.includes(s)));
  const cats = [...new Set(items.map((p) => p.category))];
  const colours = [...new Set(items.map((p) => p.colourGroup))].sort();
  const preview = applyFilters(items, draft).length;

  const toggle = (k: keyof Filters, v: string) =>
    setDraft((d) => ({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] }));

  const Group = ({ k, title, options }: { k: keyof Filters; title: string; options: { v: string; label: string; swatch?: string }[] }) =>
    options.length > 1 || k === "size" ? (
      <fieldset className="filter-group">
        <legend>{title}</legend>
        <div className="filter-options">
          {options.map((o) => (
            <label key={o.v} className="check">
              <input type="checkbox" checked={draft[k].includes(o.v)} onChange={() => toggle(k, o.v)} />
              <span className="box" aria-hidden="true" />
              {o.swatch && <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />}
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    ) : null;

  return (
    <div className={`filter-root${filterOpen ? " is-open" : ""}`} aria-hidden={!filterOpen}>
      <div className="filter-overlay" onClick={() => setFilterOpen(false)} />
      <div className="filter-panel" role="dialog" aria-modal="true" aria-label="Filter products">
        <button type="button" className="filter-close" aria-label="Close filters" onClick={() => setFilterOpen(false)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <div className="filter-scroll">
          {Group({ k: "size", title: "Filter Size", options: sizes.map((s) => ({ v: s, label: s })) })}
          {Group({ k: "category", title: "Category", options: cats.map((c) => ({ v: c, label: CATEGORY_LABEL[c] ?? c })) })}
          {Group({ k: "colour", title: "Colour", options: colours.map((c) => ({ v: c, label: c, swatch: SWATCH[c] })) })}
          {Group({ k: "availability", title: "Availability", options: [
              { v: "in-stock", label: "In stock" },
              { v: "low-stock", label: "Limited sizes" },
            ] })}
        </div>
        <div className="filter-actions">
          <button
            type="button"
            className="btn btn--white"
            onClick={() => {
              setDraft(EMPTY);
              onApply(EMPTY);
            }}
          >
            Clear ({countFilters(draft)})
          </button>
          <button
            type="button"
            className="btn btn--black"
            onClick={() => {
              onApply(draft);
              setFilterOpen(false);
            }}
          >
            Apply Filters ({preview})
          </button>
        </div>
      </div>
    </div>
  );
}
