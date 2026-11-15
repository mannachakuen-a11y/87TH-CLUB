import { Link } from "react-router-dom";
import type { Product } from "../data";
import ProductCard from "./ProductCard";

export type Callout = { src: string; to: string; alt: string };

// Callout positions, mirroring the reference grid: on the 4-column layout they
// alternate right / left every few rows; on the 2-column layout they span full width.
const DESKTOP = [
  { row: 1, col: 3 },
  { row: 6, col: 1 },
  { row: 10, col: 3 },
  { row: 15, col: 1 },
  { row: 20, col: 3 },
];
const MOBILE_ROWS = [3, 12, 17, 24, 31];

/** Simulate auto-placement to decide which callouts would have products beside them. */
function visibleCallouts(n: number, cols: number, slots: { row: number; col: number }[]) {
  let keep = slots.length;
  while (keep > 0) {
    const taken = new Set<string>();
    slots.slice(0, keep).forEach(({ row, col }) => {
      for (let r = row; r < row + 2; r++) for (let c = col; c < col + (cols === 4 ? 2 : 2); c++) taken.add(`${r}:${c}`);
    });
    let placed = 0;
    let lastRow = 0;
    for (let r = 1; placed < n; r++)
      for (let c = 1; c <= cols && placed < n; c++)
        if (!taken.has(`${r}:${c}`)) {
          placed++;
          lastRow = r;
        }
    const last = slots[keep - 1];
    if (lastRow >= last.row + 1 || (cols === 2 && lastRow >= last.row)) break;
    keep--;
  }
  return keep;
}

export default function ProductGrid({ items, callouts = [], base = "" }: { items: Product[]; callouts?: Callout[]; base?: string }) {
  const dKeep = visibleCallouts(items.length, 4, DESKTOP.slice(0, callouts.length));
  const mKeep = visibleCallouts(items.length, 2, MOBILE_ROWS.slice(0, callouts.length).map((row) => ({ row, col: 1 })));
  return (
    <ul className="pgrid">
      {items.map((p, i) => (
        <ProductCard key={p.handle} p={p} eager={i < 4} base={base} />
      ))}
      {callouts.slice(0, Math.max(dKeep, mKeep)).map((c, i) => (
        <li
          key={c.src + i}
          className={`callout${i >= dKeep ? " hide-d" : ""}${i >= mKeep ? " hide-m" : ""}`}
          style={{ ["--row-d" as string]: DESKTOP[i].row, ["--col-d" as string]: DESKTOP[i].col, ["--row-m" as string]: MOBILE_ROWS[i] }}
        >
          <Link to={c.to} aria-label={c.alt}>
            <img src={c.src} alt={c.alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
