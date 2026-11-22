'use client';
import { useEffect, useState } from 'react';
import { useKeepAction } from './ActionForm';
import { saveProductAction } from '@/app/admin/actions/products';
import { input, label } from './ui';

type V = { id?: string; size: string; color: string; sku: string; price: string; quantity: string; lowStockThreshold: string };
type Props = {
  product?: {
    id: string; title: string; slug: string; description: string | null; details: string | null; price: string; compareAtPrice: string; sku: string | null;
    categoryId: string | null; status: string; featured: boolean; newArrival: boolean; seoTitle: string | null; seoDescription: string | null; collectionIds: string[]; variants: V[];
  };
  categories: { id: string; name: string }[];
  collections: { id: string; title: string; isDrop: boolean }[];
  currency: string;
  version?: string;
};

const blank = (): V => ({ size: '', color: '', sku: '', price: '', quantity: '', lowStockThreshold: '3' });

function Save({ pending }: { pending: boolean }) {
  return <button className="rounded bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-[#E31B23] disabled:opacity-50" disabled={pending}>{pending ? 'Saving…' : 'Save product'}</button>;
}

export default function ProductEditor({ product, categories, collections, currency, version }: Props) {
  const [state, onSubmit, pending] = useKeepAction(saveProductAction);
  const [variants, setVariants] = useState<V[]>(product?.variants.length ? product.variants : [blank()]);
  // after a save the server re-renders with fresh variant ids — adopt them
  useEffect(() => {
    if (product?.variants.length) setVariants(product.variants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  const [sizesQuick, setSizesQuick] = useState('');
  const upd = (i: number, k: keyof V, v: string) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addSizes = () => {
    const sizes = sizesQuick.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!sizes.length) return;
    setVariants((vs) => {
      const base = vs.length === 1 && !vs[0].size && !vs[0].color && !vs[0].id ? [] : vs;
      return [...base, ...sizes.filter((s) => !base.some((b) => b.size === s && !b.color)).map((s) => ({ ...blank(), size: s }))];
    });
    setSizesQuick('');
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <div className="space-y-6 xl:col-span-2">
        <section className="space-y-4 rounded border border-neutral-200 bg-white p-4">
          <div>
            <label className={label} htmlFor="title">Title *</label>
            <input id="title" name="title" required defaultValue={product?.title} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={6} defaultValue={product?.description ?? ''} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="details">Details (materials, fit, care)</label>
            <textarea id="details" name="details" rows={4} defaultValue={product?.details ?? ''} className={input} />
          </div>
        </section>

        <section className="rounded border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Variants &amp; stock</h2>
              <p className="text-xs text-neutral-500">One row per size/colour. Leave stock empty if unknown — that option can’t be bought until it’s set.</p>
            </div>
            <div className="flex gap-2">
              <input value={sizesQuick} onChange={(e) => setSizesQuick(e.target.value)} placeholder="Quick add sizes: S M L XL" className={`${input} w-48`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizes(); } }} />
              <button type="button" onClick={addSizes} className="rounded border border-neutral-300 px-3 text-sm hover:border-neutral-900">Add</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="pb-2 pr-2 font-medium">Size</th>
                  <th className="pb-2 pr-2 font-medium">Colour</th>
                  <th className="pb-2 pr-2 font-medium">SKU</th>
                  <th className="pb-2 pr-2 font-medium">Price override ({currency})</th>
                  <th className="pb-2 pr-2 font-medium">Stock</th>
                  <th className="pb-2 pr-2 font-medium">Low-stock alert</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id ?? `n${i}`}>
                    {(['size', 'color', 'sku', 'price', 'quantity', 'lowStockThreshold'] as (keyof V)[]).map((k) => (
                      <td key={k} className="pb-2 pr-2">
                        <input
                          aria-label={`${k} row ${i + 1}`}
                          value={v[k] ?? ''}
                          onChange={(e) => upd(i, k, e.target.value)}
                          inputMode={k === 'quantity' || k === 'lowStockThreshold' || k === 'price' ? 'decimal' : undefined}
                          placeholder={k === 'quantity' ? 'unknown' : k === 'price' ? 'same' : ''}
                          className={`${input} ${k === 'quantity' && v.quantity === '' ? 'border-amber-400' : ''}`}
                        />
                      </td>
                    ))}
                    <td className="pb-2">
                      <button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} disabled={variants.length === 1} className="px-2 text-neutral-400 hover:text-red-600 disabled:opacity-30" aria-label={`Remove row ${i + 1}`}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setVariants((vs) => [...vs, blank()])} className="mt-2 text-sm underline">+ Add variant row</button>
        </section>

        <section className="space-y-4 rounded border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Search engine listing</h2>
          <div>
            <label className={label} htmlFor="slug">URL handle</label>
            <div className="flex items-center gap-1 text-sm text-neutral-500">/products/<input id="slug" name="slug" defaultValue={product?.slug} placeholder="generated from title" className={input} /></div>
          </div>
          <div>
            <label className={label} htmlFor="seoTitle">SEO title</label>
            <input id="seoTitle" name="seoTitle" defaultValue={product?.seoTitle ?? ''} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="seoDescription">SEO description</label>
            <textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={product?.seoDescription ?? ''} className={input} />
          </div>
        </section>
      </div>

      <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
        <section className="space-y-4 rounded border border-neutral-200 bg-white p-4">
          <div>
            <label className={label} htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={product?.status ?? 'DRAFT'} className={input}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="ACTIVE">Active (published)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newArrival" defaultChecked={product?.newArrival} /> New arrival</label>
        </section>
        <section className="space-y-4 rounded border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="price">Price ({currency})</label>
              <input id="price" name="price" inputMode="decimal" defaultValue={product?.price} className={`${input} ${product && !product.price ? 'border-amber-400' : ''}`} />
            </div>
            <div>
              <label className={label} htmlFor="compareAtPrice">Compare-at</label>
              <input id="compareAtPrice" name="compareAtPrice" inputMode="decimal" defaultValue={product?.compareAtPrice} className={input} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="sku">Product SKU</label>
            <input id="sku" name="sku" defaultValue={product?.sku ?? ''} className={input} />
          </div>
        </section>
        <section className="space-y-4 rounded border border-neutral-200 bg-white p-4">
          <div>
            <label className={label} htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ''} className={input}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className={label}>Collections</legend>
            {collections.length ? (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {collections.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="collections" value={c.id} defaultChecked={product?.collectionIds.includes(c.id)} /> {c.title} {c.isDrop && <span className="text-xs text-neutral-500">(drop)</span>}
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-neutral-500">No collections yet.</p>}
          </fieldset>
        </section>
        <div className="rounded border border-neutral-200 bg-white p-4">
          <Save pending={pending} />
          {state?.error && <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          {state?.ok && <p role="status" className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
        </div>
      </div>
    </form>
  );
}
