import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductEditor from '@/components/admin/ProductEditor';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { PageHeader, btnDanger, input } from '@/components/admin/ui';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { prisma } from '@/lib/db';
import { CURRENCY, minorToDecimal } from '@/lib/money';
import { deleteProductAction, imageAction, uploadImagesAction } from '../../../actions/products';

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [product, categories, collections] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }, variants: { orderBy: { position: 'asc' }, include: { inventory: true } }, collections: true, _count: { select: { orderItems: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.collection.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true, isDrop: true } }),
  ]);
  if (!product) notFound();
  const attrs = product.attributes && typeof product.attributes === 'object' ? Object.entries(product.attributes as Record<string, string>) : [];
  return (
    <>
      <PageHeader
        title={product.title}
        sub={<>{product._count.orderItems} order lines · {product.status === 'ACTIVE' ? <Link href={`/products/${product.slug}`} target="_blank" className="underline">View in store ↗</Link> : 'not published'}</>}
        actions={<Link href="/admin/products" className="text-sm underline">← All products</Link>}
      />
      {sp.created && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">Product created. Now add images below.</p>}

      <section className="mb-6 rounded border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Images ({product.images.length})</h2>
          <p className="text-xs text-neutral-500">First image is the main image; the second shows on hover.</p>
        </div>
        {product.images.length > 0 && (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {product.images.map((im, i) => (
              <li key={im.id} className="rounded border border-neutral-200 p-2">
                <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={im.alt ?? ''} className="h-full w-full object-cover" />
                </div>
                <form action={imageAction} className="mt-2 flex gap-1">
                  <input type="hidden" name="imageId" value={im.id} />
                  <input type="hidden" name="op" value="alt" />
                  <input name="alt" defaultValue={im.alt ?? ''} placeholder="Alt text" className={`${input} px-2 py-1 text-xs`} aria-label="Alt text" />
                  <button className="text-xs underline">Save</button>
                </form>
                <div className="mt-2 flex justify-between text-xs">
                  {(['first', 'up', 'down', 'delete'] as const).map((op) => (
                    <form key={op} action={imageAction}>
                      <input type="hidden" name="imageId" value={im.id} />
                      <input type="hidden" name="op" value={op} />
                      <button disabled={(op !== 'delete' && op !== 'down' && i === 0) || (op === 'down' && i === product.images.length - 1)} className={`underline disabled:opacity-25 ${op === 'delete' ? 'text-red-600' : ''}`}>
                        {op === 'first' ? 'Main' : op === 'up' ? '←' : op === 'down' ? '→' : 'Delete'}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={uploadImagesAction} resetOnSuccess className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="productId" value={product.id} />
          <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="text-sm" />
          <Submit variant="ghost">Upload images</Submit>
        </ActionForm>
      </section>

      <ProductEditor
        version={product.updatedAt.toISOString()}
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          details: product.details,
          price: minorToDecimal(product.price),
          compareAtPrice: minorToDecimal(product.compareAtPrice),
          sku: product.sku,
          categoryId: product.categoryId,
          status: product.status,
          featured: product.featured,
          newArrival: product.newArrival,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          collectionIds: product.collections.map((c) => c.collectionId),
          variants: product.variants.map((v) => ({
            id: v.id,
            size: v.size ?? '',
            color: v.color ?? '',
            sku: v.sku ?? '',
            price: minorToDecimal(v.price),
            quantity: v.inventory?.quantity === null || v.inventory?.quantity === undefined ? '' : String(v.inventory.quantity),
            lowStockThreshold: String(v.inventory?.lowStockThreshold ?? 3),
          })),
        }}
        categories={categories}
        collections={collections}
        currency={CURRENCY}
      />

      {attrs.length > 0 && (
        <section className="mt-6 rounded border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Imported attributes (from source spreadsheet)</h2>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {attrs.map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="text-neutral-500">{k}:</dt><dd className="break-all">{String(v)}</dd></div>
            ))}
          </dl>
        </section>
      )}

      <form action={deleteProductAction} className="mt-10 border-t border-neutral-200 pt-6">
        <input type="hidden" name="id" value={product.id} />
        <ConfirmButton className={btnDanger} message="Delete this product permanently?">Delete product</ConfirmButton>
        <p className="mt-2 text-xs text-neutral-500">Past orders keep their item details. Consider archiving instead.</p>
      </form>
    </>
  );
}
