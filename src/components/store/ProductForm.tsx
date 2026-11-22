'use client';
import { useMemo, useState } from 'react';
import { useStore } from './StoreProvider';
import { formatMoney } from '@/lib/money';
import { cx } from '@/lib/utils';

export type ClientVariant = { id: string; size: string | null; color: string | null; price: number | null; stock: number; lowStock: number };

export default function ProductForm({ variants, basePrice, currency }: { variants: ClientVariant[]; basePrice: number | null; currency: string }) {
  const { add, loading } = useStore();
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[], [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[], [variants]);
  const firstAvailableColor = colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) ?? colors[0] ?? null;
  const [color, setColor] = useState<string | null>(firstAvailableColor);
  const [size, setSize] = useState<string | null>(sizes.length === 0 ? null : null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const match = (s: string | null, c: string | null) => variants.find((v) => (sizes.length ? v.size === s : true) && (colors.length ? v.color === c : true));
  const selected = sizes.length && !size ? null : match(size, color);
  const price = selected?.price ?? basePrice;
  const anyStock = variants.some((v) => v.stock > 0);
  const maxQty = Math.min(10, selected?.stock ?? 0);
  const needsSize = sizes.length > 0 && !size;

  const submit = async () => {
    setMsg(null);
    if (needsSize) return setMsg({ type: 'err', text: 'Select a size' });
    if (!selected || selected.stock <= 0) return setMsg({ type: 'err', text: 'This option is sold out' });
    const err = await add(selected.id, qty);
    setMsg(err ? { type: 'err', text: err } : { type: 'ok', text: 'Added to bag' });
  };

  return (
    <div>
      <p className="t-display text-4xl" aria-live="polite">{formatMoney(price, currency)}</p>

      {colors.length > 0 && (
        <fieldset className="mt-8">
          <legend className="t-micro mb-3">
            Colour <span className="text-ink/50">— {color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const ok = variants.some((v) => v.color === c && v.stock > 0);
              return (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setQty(1);
                    if (size && !variants.some((v) => v.color === c && v.size === size && v.stock > 0)) setSize(null);
                  }}
                  aria-pressed={color === c}
                  className={cx('t-micro min-h-[44px] border px-4 transition-colors', color === c ? 'border-ink bg-ink text-white' : 'border-ink/25 hover:border-ink', !ok && 'text-ink/35 line-through')}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset className="mt-8">
          <legend className="t-micro mb-3">Size {size && <span className="text-ink/50">— {size}</span>}</legend>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {sizes.map((s) => {
              const v = match(s, color);
              const out = !v || v.stock <= 0;
              return (
                <button
                  key={s}
                  disabled={out}
                  onClick={() => {
                    setSize(s);
                    setQty(1);
                    setMsg(null);
                  }}
                  aria-pressed={size === s}
                  aria-label={out ? `${s} — sold out` : s}
                  className={cx(
                    't-ui min-h-[48px] border transition-colors',
                    size === s ? 'border-ink bg-ink text-white' : 'border-ink/25 hover:border-ink',
                    out && 'cursor-not-allowed border-ink/10 text-ink/25 line-through hover:border-ink/10',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected && selected.stock > 0 && selected.stock <= selected.lowStock && <p className="t-micro mt-3 text-signal">Only {selected.stock} left</p>}

      <div className="mt-8 flex gap-2">
        <div className="flex items-center border border-ink/25" role="group" aria-label="Quantity">
          <button className="h-12 w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
          <span className="t-ui w-8 text-center" aria-live="polite">{qty}</span>
          <button className="h-12 w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))} disabled={!selected || qty >= maxQty} aria-label="Increase quantity">+</button>
        </div>
        <button onClick={submit} disabled={loading || !anyStock || price === null || (!!selected && selected.stock <= 0)} className="btn-red flex-1">
          {!anyStock || price === null ? 'Sold out' : selected && selected.stock <= 0 ? 'Sold out' : loading ? 'Adding…' : needsSize ? 'Select a size' : 'Add to bag'}
        </button>
      </div>
      <p role="status" className={cx('t-micro mt-3 min-h-[1.2em]', msg?.type === 'err' ? 'text-signal' : 'text-ink/70')}>{msg?.text}</p>
    </div>
  );
}
