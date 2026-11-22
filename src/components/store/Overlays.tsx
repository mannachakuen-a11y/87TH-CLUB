'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { cx } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import type { CartLine } from '@/lib/cart';

export function BagLines({ compact = false }: { compact?: boolean }) {
  const { cart, update, remove, loading, setBagOpen } = useStore();
  const [error, setError] = useState<string | null>(null);
  if (!cart) return <p className="t-ui py-10 text-center text-ink/50">Loading bag…</p>;
  if (cart.lines.length === 0)
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="t-display text-5xl">Your bag is empty.</p>
        <Link href="/shop" onClick={() => setBagOpen(false)} className="btn-ink">
          Continue shopping
        </Link>
      </div>
    );
  const act = async (p: Promise<string | null>) => setError(await p);
  return (
    <div>
      {error && (
        <p role="alert" className="t-micro mb-3 bg-signal px-3 py-2 text-white">
          {error}
        </p>
      )}
      <ul className="divide-y divide-ink/10">
        {cart.lines.map((l) => (
          <BagLine key={l.id} line={l} compact={compact} disabled={loading} onQty={(q) => act(update(l.id, q))} onRemove={() => act(remove(l.id))} />
        ))}
      </ul>
    </div>
  );
}

function BagLine({ line: l, compact, disabled, onQty, onRemove }: { line: CartLine; compact: boolean; disabled: boolean; onQty: (q: number) => void; onRemove: () => void }) {
  const { cart, setBagOpen } = useStore();
  return (
    <li className="flex gap-4 py-4">
      <Link href={`/products/${l.slug}`} onClick={() => setBagOpen(false)} className={cx('shrink-0 bg-[#f2f2f0]', compact ? 'h-28 w-[88px]' : 'h-40 w-32')}>
        {l.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="t-micro flex h-full items-center justify-center p-2 text-center text-ink/40">No image</span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <Link href={`/products/${l.slug}`} onClick={() => setBagOpen(false)} className="t-ui truncate hover:text-signal">
            {l.title}
          </Link>
          <span className="t-ui shrink-0">{formatMoney(l.lineTotal, cart?.currency)}</span>
        </div>
        <p className="t-micro mt-1 text-ink/60">
          {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' / ') || 'One option'}
          {l.unitPrice !== null && l.quantity > 1 && <> · {formatMoney(l.unitPrice, cart?.currency)} each</>}
        </p>
        {l.issue && <p className="t-micro mt-1 text-signal">{l.issue}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center border border-ink/20" role="group" aria-label={`Quantity for ${l.title}`}>
            <button className="h-9 w-9 text-lg disabled:opacity-30" disabled={disabled || l.quantity <= 1} onClick={() => onQty(l.quantity - 1)} aria-label="Decrease quantity">
              −
            </button>
            <span className="t-ui w-8 text-center" aria-live="polite">
              {l.quantity}
            </span>
            <button className="h-9 w-9 text-lg disabled:opacity-30" disabled={disabled || l.quantity >= Math.min(10, l.available)} onClick={() => onQty(l.quantity + 1)} aria-label="Increase quantity">
              +
            </button>
          </div>
          <button className="t-micro link-u text-ink/60" disabled={disabled} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function BagDrawer() {
  const { bagOpen, setBagOpen, cart } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bagOpen) ref.current?.focus();
  }, [bagOpen]);
  return (
    <div className={cx('fixed inset-0 z-50', bagOpen ? 'visible' : 'invisible')} aria-hidden={!bagOpen}>
      <div className={cx('absolute inset-0 bg-ink/50 transition-opacity duration-300', bagOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setBagOpen(false)} />
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={cx(
          'absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white outline-none transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
          bagOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-[var(--header-h)] items-center justify-between border-b border-ink/10 px-5">
          <h2 className="t-ui">Bag ({cart?.count ?? 0})</h2>
          <button className="t-ui h-11 px-2 hover:text-signal" onClick={() => setBagOpen(false)}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          <BagLines compact />
        </div>
        {cart && cart.lines.length > 0 && (
          <div className="border-t border-ink/10 p-5">
            <div className="t-ui mb-1 flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal, cart.currency)}</span>
            </div>
            <p className="t-micro mb-4 text-ink/50">Delivery and discounts calculated at checkout.</p>
            <div className="grid gap-2">
              {cart.purchasable ? (
                <Link href="/checkout" onClick={() => setBagOpen(false)} className="btn-red w-full">
                  Checkout
                </Link>
              ) : (
                <button className="btn-red w-full" disabled>
                  Resolve items to checkout
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/bag" onClick={() => setBagOpen(false)} className="btn-line">
                  View bag
                </Link>
                <button onClick={() => setBagOpen(false)} className="btn-line">
                  Keep shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

type Hit = { slug: string; title: string; price: string; image: string | null; soldOut: boolean };

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (searchOpen) setTimeout(() => input.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const d = await r.json();
        setHits(d.results || []);
      } catch {
        /* aborted */
      } finally {
        setBusy(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className={cx('fixed inset-0 z-50 bg-white transition-[opacity,visibility] duration-200', searchOpen ? 'visible opacity-100' : 'invisible opacity-0')} role="dialog" aria-modal="true" aria-label="Search" aria-hidden={!searchOpen}>
      <div className="wrap flex h-[var(--header-h)] items-center justify-end">
        <button className="t-ui h-11 px-2 hover:text-signal" onClick={() => setSearchOpen(false)}>
          Close
        </button>
      </div>
      <div className="wrap">
        <form onSubmit={go} role="search">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH"
            autoComplete="off"
            className="t-display w-full border-b-2 border-ink bg-transparent pb-2 text-[13vw] outline-none placeholder:text-ink/15 sm:text-8xl"
          />
        </form>
        <div className="mt-6 max-h-[60vh] overflow-y-auto pb-10" aria-live="polite">
          {busy && <p className="t-ui text-ink/50">Searching…</p>}
          {hits && hits.length === 0 && !busy && <p className="t-ui text-ink/60">Nothing found for “{q}”.</p>}
          {hits && hits.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
              {hits.map((h) => (
                <li key={h.slug}>
                  <Link href={`/products/${h.slug}`} onClick={() => setSearchOpen(false)} className="group block">
                    <div className="aspect-[4/5] bg-[#f2f2f0]">
                      {h.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <p className="t-ui mt-2 group-hover:text-signal">{h.title}</p>
                    <p className="t-micro text-ink/60">{h.soldOut ? 'Sold out' : h.price}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hits && hits.length > 0 && (
            <button onClick={go} className="btn-line mt-8">
              See all results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
