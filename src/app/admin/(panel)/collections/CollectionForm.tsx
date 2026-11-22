import ActionForm, { Submit } from '@/components/admin/ActionForm';
import LocalDateTime from '@/components/admin/LocalDateTime';
import { input, label } from '@/components/admin/ui';
import { saveCollectionAction } from '../../actions/catalog';

type C = { id: string; title: string; slug: string; description: string | null; imageUrl: string | null; isVisible: boolean; isDrop: boolean; launchAt: Date | null; sortOrder: number; productIds: string[] };

export default function CollectionForm({ c, products }: { c?: C; products: { id: string; title: string; status: string }[] }) {
  return (
    <ActionForm action={saveCollectionAction} className="grid gap-6 xl:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="space-y-4 rounded border border-neutral-200 bg-white p-4 xl:col-span-2">
        <div><label className={label} htmlFor="title">Title *</label><input id="title" name="title" required defaultValue={c?.title} className={input} /></div>
        <div><label className={label} htmlFor="slug">URL handle</label><input id="slug" name="slug" defaultValue={c?.slug} placeholder="generated from title (use new-arrivals for the New nav link)" className={input} /></div>
        <div><label className={label} htmlFor="description">Description</label><textarea id="description" name="description" rows={3} defaultValue={c?.description ?? ''} className={input} /></div>
        <fieldset>
          <legend className={label}>Products ({products.length})</legend>
          {products.length ? (
            <div className="grid max-h-[420px] gap-1 overflow-y-auto rounded border border-neutral-200 p-2 sm:grid-cols-2">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="products" value={p.id} defaultChecked={c?.productIds.includes(p.id)} />
                  <span className="truncate">{p.title}</span>
                  {p.status !== 'ACTIVE' && <span className="text-xs text-neutral-400">{p.status.toLowerCase()}</span>}
                </label>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-500">No products yet.</p>}
        </fieldset>
      </div>
      <div className="space-y-4">
        <div className="space-y-3 rounded border border-neutral-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked={c?.isVisible ?? true} /> Visible on the storefront</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDrop" defaultChecked={c?.isDrop} /> This is a scheduled drop</label>
          <div>
            <label className={label} htmlFor="launchAt">Drop launch (your local time)</label>
            <LocalDateTime name="launchAt" iso={c?.launchAt?.toISOString()} className={input} />
            <p className="mt-1 text-xs text-neutral-500">Until then, the drop’s products are hidden and the homepage shows a countdown with early-access signup.</p>
          </div>
          <div><label className={label} htmlFor="sortOrder">Sort order</label><input id="sortOrder" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={input} /></div>
        </div>
        <div className="space-y-3 rounded border border-neutral-200 bg-white p-4">
          <p className={label}>Banner image</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c?.imageUrl && <img src={c.imageUrl} alt="" className="aspect-video w-full rounded object-cover" />}
          <input type="file" name="image" accept="image/*" className="text-sm" />
          {c?.imageUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" /> Remove image</label>}
        </div>
        <Submit className="w-full">Save collection</Submit>
      </div>
    </ActionForm>
  );
}
