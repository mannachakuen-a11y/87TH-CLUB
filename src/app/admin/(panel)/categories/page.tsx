import { prisma } from '@/lib/db';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Card, Empty, PageHeader, input, label } from '@/components/admin/ui';
import { deleteCategoryAction, saveCategoryAction } from '../../actions/catalog';

export default async function CategoriesAdmin() {
  const cats = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" sub="Used for shop filters and navigation (e.g. T-Shirts, Hoodies, Bottoms, Accessories)." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {cats.length ? cats.map((c) => (
            <Card key={c.id}>
              <ActionForm action={saveCategoryAction} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_80px_auto_auto]">
                <input type="hidden" name="id" value={c.id} />
                <div><label className={label}>Name</label><input name="name" defaultValue={c.name} className={input} /></div>
                <div><label className={label}>URL</label><input name="slug" defaultValue={c.slug} className={input} /></div>
                <div><label className={label}>Order</label><input name="sortOrder" type="number" defaultValue={c.sortOrder} className={input} /></div>
                <Submit variant="ghost">Save</Submit>
                <span className="pb-2 text-xs text-neutral-500">{c._count.products} products</span>
              </ActionForm>
              <form action={deleteCategoryAction} className="mt-2">
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton className="text-xs text-red-600 underline" message="Delete this category? Products stay, uncategorised.">Delete</ConfirmButton>
              </form>
            </Card>
          )) : <Card><Empty>No categories yet.</Empty></Card>}
        </div>
        <Card title="New category">
          <ActionForm action={saveCategoryAction} resetOnSuccess className="space-y-3">
            <div><label className={label} htmlFor="name">Name</label><input id="name" name="name" required className={input} /></div>
            <div><label className={label} htmlFor="description">Description</label><textarea id="description" name="description" rows={2} className={input} /></div>
            <Submit>Create category</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
