import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { Badge, Card, Empty, Field, PageHeader, input, label, td, th } from '@/components/admin/ui';
import { saveDiscountAction, toggleDiscountAction } from '../../actions/catalog';

export default async function DiscountsAdmin() {
  const ds = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHeader title="Discounts" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-x-auto rounded border border-neutral-200 bg-white xl:col-span-2">
          {ds.length ? (
            <table className="w-full min-w-[620px]">
              <thead><tr><th className={th}>Code</th><th className={th}>Value</th><th className={th}>Used</th><th className={th}>Window</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {ds.map((d) => (
                  <tr key={d.id}>
                    <td className={`${td} font-mono font-semibold`}>{d.code}</td>
                    <td className={td}>{d.type === 'PERCENTAGE' ? `${d.value}%` : formatMoney(d.value)}{d.minSubtotal ? <div className="text-xs text-neutral-500">min {formatMoney(d.minSubtotal)}</div> : null}</td>
                    <td className={td}>{d.usedCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</td>
                    <td className={`${td} text-xs`}>{d.startsAt ? d.startsAt.toLocaleDateString('en-GB') : 'now'} → {d.endsAt ? d.endsAt.toLocaleDateString('en-GB') : 'no end'}</td>
                    <td className={td}><Badge value={d.active ? 'ACTIVE' : 'DRAFT'} /></td>
                    <td className={`${td} space-x-3 text-right text-xs`}>
                      <form action={toggleDiscountAction} className="inline"><input type="hidden" name="id" value={d.id} /><button className="underline">{d.active ? 'Disable' : 'Enable'}</button></form>
                      <form action={toggleDiscountAction} className="inline"><input type="hidden" name="id" value={d.id} /><input type="hidden" name="op" value="delete" /><button className="text-red-600 underline">Delete</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No discount codes.</Empty>}
        </div>
        <Card title="New discount code">
          <ActionForm action={saveDiscountAction} resetOnSuccess className="space-y-3">
            <Field name="code" title="Code" required placeholder="CLUB10" />
            <div>
              <label className={label} htmlFor="type">Type</label>
              <select id="type" name="type" className={input}><option value="PERCENTAGE">Percentage off</option><option value="FIXED_AMOUNT">Fixed amount off</option></select>
            </div>
            <Field name="value" title="Value (% or amount)" required />
            <Field name="minSubtotal" title="Minimum subtotal (optional)" />
            <Field name="usageLimit" title="Usage limit (optional)" type="number" min={1} />
            <div className="grid grid-cols-2 gap-2"><Field name="startsAt" title="Starts" type="date" /><Field name="endsAt" title="Ends" type="date" /></div>
            <Submit>Create code</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
