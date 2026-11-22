'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cx } from '@/lib/utils';

type Facets = { categories: { name: string; slug: string }[]; sizes: string[]; colors: string[] };

const SORTS = [
  ['newest', 'Newest'],
  ['featured', 'Featured'],
  ['best-selling', 'Best selling'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
];

export default function ShopFilters({ facets, total, hideCategory = false }: { facets: Facets; total: number; hideCategory?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    start(() => router.push(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
  };
  const active = ['category', 'size', 'color', 'availability', 'q'].filter((k) => params.get(k));

  const Chip = ({ k, v, label }: { k: string; v: string; label: string }) => {
    const on = params.get(k)?.toLowerCase() === v.toLowerCase();
    return (
      <button onClick={() => set(k, on ? null : v)} aria-pressed={on} className={cx('t-micro border px-3 py-2 transition-colors', on ? 'border-ink bg-ink text-white' : 'border-ink/20 hover:border-ink')}>
        {label}
      </button>
    );
  };

  return (
    <div className={cx('mb-6 transition-opacity', pending && 'opacity-60')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-3">
        <div className="flex items-center gap-4">
          <button className="t-ui flex h-10 items-center hover:text-signal" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="filter-panel">
            Filter {active.length > 0 && <span className="ml-1 text-signal">({active.length})</span>}
          </button>
          <span className="t-micro text-ink/50" aria-live="polite">{total} {total === 1 ? 'product' : 'products'}</span>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set('q', q.trim() || null);
          }}
          className="order-3 flex w-full items-center border-b border-ink sm:order-none sm:w-64"
        >
          <label htmlFor="shop-q" className="sr-only">Search the shop</label>
          <input id="shop-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH" className="t-ui min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-ink/35" />
          <button className="t-micro px-1">Go</button>
        </form>
        <label className="t-ui flex items-center gap-2">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select value={params.get('sort') ?? 'newest'} onChange={(e) => set('sort', e.target.value === 'newest' ? null : e.target.value)} className="t-ui h-10 cursor-pointer border-0 bg-transparent pr-1 outline-none">
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div id="filter-panel" className={cx('gap-6 border-b border-ink/15 py-6 md:grid-cols-4', open ? 'grid' : 'hidden')}>
        {!hideCategory && facets.categories.length > 0 && (
          <fieldset>
            <legend className="t-micro mb-3 text-ink/50">Category</legend>
            <div className="flex flex-wrap gap-2">{facets.categories.map((c) => <Chip key={c.slug} k="category" v={c.slug} label={c.name} />)}</div>
          </fieldset>
        )}
        {facets.sizes.length > 0 && (
          <fieldset>
            <legend className="t-micro mb-3 text-ink/50">Size</legend>
            <div className="flex flex-wrap gap-2">{facets.sizes.map((s) => <Chip key={s} k="size" v={s} label={s} />)}</div>
          </fieldset>
        )}
        {facets.colors.length > 0 && (
          <fieldset>
            <legend className="t-micro mb-3 text-ink/50">Colour</legend>
            <div className="flex flex-wrap gap-2">{facets.colors.map((c) => <Chip key={c} k="color" v={c} label={c} />)}</div>
          </fieldset>
        )}
        <fieldset>
          <legend className="t-micro mb-3 text-ink/50">Availability</legend>
          <Chip k="availability" v="in-stock" label="In stock only" />
        </fieldset>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {active.map((k) => (
            <button key={k} onClick={() => set(k, null)} className="t-micro bg-[#f2f2f0] px-3 py-1.5 hover:bg-signal hover:text-white">
              {k === 'q' ? `“${params.get(k)}”` : params.get(k)} ×
            </button>
          ))}
          <button onClick={() => start(() => router.push(pathname))} className="t-micro link-u ml-1">Clear all</button>
        </div>
      )}
    </div>
  );
}
