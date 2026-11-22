import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { Badge, Empty, PageHeader, btn, btnGhost, input, td, th } from '@/components/admin/ui';
import { setProductStatusAction } from '../../actions/products';

const PER = 50;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(sp.status ? { status: sp.status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' } : {}),
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: 'insensitive' } }, { sku: { contains: sp.q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: sp.q, mode: 'insensitive' } } } }] } : {}),
    ...(sp.issue === 'no-image' ? { images: { none: {} } } : sp.issue === 'no-price' ? { price: null } : sp.issue === 'no-stock' ? { variants: { some: { inventory: { quantity: null } } } } : {}),
  };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PER,
      take: PER,
      include: { images: { take: 1, orderBy: { position: 'asc' } }, category: true, variants: { include: { inventory: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(p) }).toString();
  return (
    <>
      <PageHeader title="Products" sub={`${total} products`} actions={<><Link href="/admin/import" className={btnGhost}>Import</Link><Link href="/admin/products/new" className={btn}>Add product</Link></>} />
      {sp.deleted && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">Product deleted.</p>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search title or SKU" className={`${input} max-w-xs`} />
        <select name="status" defaultValue={sp.status ?? ''} className={`${input} w-auto`}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select name="issue" defaultValue={sp.issue ?? ''} className={`${input} w-auto`}>
          <option value="">Any data</option>
          <option value="no-image">Missing images</option>
          <option value="no-price">Missing price</option>
          <option value="no-stock">Stock not set</option>
        </select>
        <button className={btnGhost}>Filter</button>
      </form>
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        {products.length ? (
          <table className="w-full min-w-[760px]">
            <thead>
              <tr><th className={th}></th><th className={th}>Product</th><th className={th}>Status</th><th className={th}>Price</th><th className={th}>Stock</th><th className={th}>Category</th><th className={th}></th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const known = p.variants.filter((v) => v.inventory?.quantity !== null && v.inventory?.quantity !== undefined);
                const stock = known.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className={`${td} w-14`}>
                      <div className="h-14 w-11 overflow-hidden rounded bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.images[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                      </div>
                    </td>
                    <td className={td}>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                      <div className="mt-0.5 flex gap-2 text-xs">
                        {!p.images.length && <span className="text-amber-700">no image</span>}
                        {p.price === null && <span className="text-amber-700">no price</span>}
                        {known.length < p.variants.length && <span className="text-amber-700">stock not set</span>}
                        {p.featured && <span className="text-neutral-500">featured</span>}
                        {p.newArrival && <span className="text-neutral-500">new</span>}
                      </div>
                    </td>
                    <td className={td}><Badge value={p.status} /></td>
                    <td className={td}>{formatMoney(p.price)}</td>
                    <td className={td}>{known.length ? `${stock} in ${p.variants.length} variant${p.variants.length === 1 ? '' : 's'}` : '—'}</td>
                    <td className={td}>{p.category?.name ?? '—'}</td>
                    <td className={`${td} text-right`}>
                      <form action={setProductStatusAction} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={p.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'} />
                        <button className="text-xs underline disabled:opacity-30" disabled={p.status !== 'ACTIVE' && p.price === null} title={p.price === null ? 'Set a price first' : ''}>{p.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Empty>No products match. <Link href="/admin/products/new" className="underline">Add one</Link> or <Link href="/admin/import" className="underline">import a spreadsheet</Link>.</Empty>}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={`?${qs(page - 1)}`} className="underline">Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={`?${qs(page + 1)}`} className="underline">Next</Link>}
        </div>
      )}
    </>
  );
}
