import { prisma } from '@/lib/db';
import { CURRENCY, minorToDecimal } from '@/lib/money';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { Card, Field, PageHeader } from '@/components/admin/ui';
import { deleteShippingAction, saveShippingAction } from '../../actions/catalog';

export default async function ShippingAdmin() {
  const ms = await prisma.shippingMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] });
  return (
    <>
      <PageHeader title="Delivery options" sub={`Shown at checkout. Prices in ${CURRENCY}. Checkout is disabled until at least one active option exists.`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {ms.map((m) => (
            <Card key={m.id}>
              <ActionForm action={saveShippingAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_80px_auto_auto]">
                <input type="hidden" name="id" value={m.id} />
                <Field name="name" title="Name" defaultValue={m.name} required />
                <Field name="description" title="Description" defaultValue={m.description} />
                <Field name="price" title="Price" defaultValue={minorToDecimal(m.price)} required />
                <Field name="sortOrder" title="Order" type="number" defaultValue={m.sortOrder} />
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={m.active} /> Active</label>
                <Submit variant="ghost">Save</Submit>
              </ActionForm>
              <form action={deleteShippingAction} className="mt-2"><input type="hidden" name="id" value={m.id} /><button className="text-xs text-red-600 underline">Delete</button></form>
            </Card>
          ))}
          {!ms.length && <Card><p className="text-sm text-neutral-500">No delivery options yet.</p></Card>}
        </div>
        <Card title="New delivery option">
          <ActionForm action={saveShippingAction} resetOnSuccess className="space-y-3">
            <Field name="name" title="Name" required placeholder="e.g. Nairobi same-day" />
            <Field name="description" title="Description" placeholder="e.g. Order before 2pm" />
            <Field name="price" title={`Price (${CURRENCY})`} required placeholder="0 for free" />
            <Field name="sortOrder" title="Sort order" type="number" defaultValue={0} />
            <input type="hidden" name="active" value="on" />
            <Submit>Add option</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
