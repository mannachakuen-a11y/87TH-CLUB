import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import CollectionForm from '../CollectionForm';

export default async function NewCollection() {
  const products = await prisma.product.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true, status: true } });
  return (
    <>
      <PageHeader title="New collection" />
      <CollectionForm products={products} />
    </>
  );
}
