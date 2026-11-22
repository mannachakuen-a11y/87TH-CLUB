import ProductEditor from '@/components/admin/ProductEditor';
import { PageHeader } from '@/components/admin/ui';
import { prisma } from '@/lib/db';
import { CURRENCY } from '@/lib/money';

export default async function NewProduct() {
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.collection.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true, isDrop: true } }),
  ]);
  return (
    <>
      <PageHeader title="Add product" sub="Save first, then upload images." />
      <ProductEditor categories={categories} collections={collections} currency={CURRENCY} />
    </>
  );
}
