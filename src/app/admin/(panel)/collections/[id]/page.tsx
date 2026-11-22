import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader, btnDanger } from '@/components/admin/ui';
import ConfirmButton from '@/components/admin/ConfirmButton';
import CollectionForm from '../CollectionForm';
import { deleteCollectionAction } from '../../../actions/catalog';

export default async function EditCollection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [c, products] = await Promise.all([
    prisma.collection.findUnique({ where: { id }, include: { products: { orderBy: { position: 'asc' } } } }),
    prisma.product.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true, status: true } }),
  ]);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.title} sub={<Link href={`/collections/${c.slug}`} target="_blank" className="underline">/collections/{c.slug} ↗</Link>} actions={<Link href="/admin/collections" className="text-sm underline">← All collections</Link>} />
      {sp.created && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">Collection created.</p>}
      <CollectionForm c={{ ...c, productIds: c.products.map((p) => p.productId) }} products={products} />
      <form action={deleteCollectionAction} className="mt-10 border-t border-neutral-200 pt-6">
        <input type="hidden" name="id" value={c.id} />
        <ConfirmButton className={btnDanger} message="Delete this collection? Products are kept.">Delete collection</ConfirmButton>
      </form>
    </>
  );
}
