import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { Badge, Card, PageHeader, input, label, td, th } from '@/components/admin/ui';
import { cancelOrderAction, noteAction, reverifyPaymentAction, trackingAction, updateOrderStatusAction } from '../../../actions/orders';

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { id: true } } } }, payments: { orderBy: { createdAt: 'desc' } }, shippingAddress: true, customer: { include: { _count: { select: { orders: true } } } } } });
  if (!o) notFound();
  const paid = o.paymentStatus === 'SUCCESS';
  const a = o.shippingAddress;
  return (
    <>
      <PageHeader
        title={`Order #${o.number}`}
        sub={<>{o.reference} · {o.createdAt.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</>}
        actions={<><Badge value={o.paymentStatus} /><Badge value={o.status} /><Badge value={o.fulfillmentStatus} /></>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title={`Items (${o.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <table className="w-full">
              <thead><tr><th className={th}></th><th className={th}>Product</th><th className={th}>Option</th><th className={th}>Qty</th><th className={th}>Price</th><th className={th}>Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td className={`${td} w-12`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {i.imageUrl && <img src={i.imageUrl} alt="" className="h-14 w-11 rounded object-cover" />}
                    </td>
                    <td className={td}>{i.product ? <Link href={`/admin/products/${i.product.id}`} className="underline">{i.title}</Link> : i.title}{i.sku && <div className="text-xs text-neutral-500">{i.sku}</div>}</td>
                    <td className={td}>{[i.size, i.color].filter(Boolean).join(' / ') || '—'}</td>
                    <td className={td}>{i.quantity}</td>
                    <td className={td}>{formatMoney(i.unitPrice, o.currency)}</td>
                    <td className={td}>{formatMoney(i.lineTotal, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between"><dt>Discount ({o.discountCode})</dt><dd>−{formatMoney(o.discountTotal, o.currency)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery ({o.shippingName})</dt><dd>{formatMoney(o.shippingTotal, o.currency)}</dd></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
            </dl>
          </Card>

          <Card title="Payments">
            {o.payments.length ? (
              <table className="w-full">
                <thead><tr><th className={th}>Reference</th><th className={th}>Provider</th><th className={th}>Status</th><th className={th}>Channel</th><th className={th}>Amount</th><th className={th}>Verified</th><th className={th}></th></tr></thead>
                <tbody>
                  {o.payments.map((p) => (
                    <tr key={p.id}>
                      <td className={`${td} font-mono text-xs`}>{p.reference}</td>
                      <td className={td}>{p.provider}</td>
                      <td className={td}><Badge value={p.status} /></td>
                      <td className={td}>{p.channel ?? '—'}</td>
                      <td className={td}>{formatMoney(p.amount, p.currency)}</td>
                      <td className={td}>{p.verifiedAt ? p.verifiedAt.toLocaleString('en-GB') : '—'}</td>
                      <td className={td}>
                        {p.status !== 'SUCCESS' && (
                          <ActionForm action={reverifyPaymentAction}>
                            <input type="hidden" name="reference" value={p.reference} />
                            <Submit variant="ghost" className="px-2 py-1 text-xs">Check with Paystack</Submit>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-neutral-500">No payment attempts.</p>}
          </Card>

          <Card title="Internal note">
            <ActionForm action={noteAction}>
              <input type="hidden" name="id" value={o.id} />
              <textarea name="note" rows={4} defaultValue={o.note ?? ''} className={input} />
              <div className="mt-2"><Submit variant="ghost">Save note</Submit></div>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="text-sm font-medium">{a ? `${a.firstName} ${a.lastName}` : '—'}</p>
            <p className="text-sm"><a href={`mailto:${o.email}`} className="underline">{o.email}</a></p>
            {o.phone && <p className="text-sm"><a href={`tel:${o.phone}`} className="underline">{o.phone}</a></p>}
            {o.customer && <Link href={`/admin/customers/${o.customer.id}`} className="mt-2 block text-xs underline">{o.customer._count.orders} order(s) · view customer</Link>}
            {a && (
              <address className="mt-4 text-sm not-italic leading-relaxed">
                {a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.city}{a.region && `, ${a.region}`}{a.postalCode && ` ${a.postalCode}`}<br />{a.country}
              </address>
            )}
          </Card>

          <Card title="Fulfilment">
            {paid ? (
              <ActionForm action={updateOrderStatusAction} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue="" className={input} aria-label="New status">
                  <option value="" disabled>Change status…</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Email the customer (shipped/delivered)</label>
                <Submit>Update status</Submit>
              </ActionForm>
            ) : <p className="text-sm text-neutral-500">Fulfilment unlocks once payment is verified.</p>}
          </Card>

          <Card title="Tracking">
            <ActionForm action={trackingAction} className="space-y-3">
              <input type="hidden" name="id" value={o.id} />
              <div><label className={label} htmlFor="carrier">Carrier</label><input id="carrier" name="carrier" defaultValue={o.carrier ?? ''} className={input} /></div>
              <div><label className={label} htmlFor="trackingNumber">Tracking number</label><input id="trackingNumber" name="trackingNumber" defaultValue={o.trackingNumber ?? ''} className={input} /></div>
              <div><label className={label} htmlFor="trackingUrl">Tracking link</label><input id="trackingUrl" name="trackingUrl" defaultValue={o.trackingUrl ?? ''} className={input} placeholder="https://" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="markShipped" defaultChecked /> Mark as shipped</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Email tracking to customer</label>
              <Submit variant="ghost">Save tracking</Submit>
            </ActionForm>
          </Card>

          {!['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status) && (
            <Card title="Cancel order">
              <ActionForm action={cancelOrderAction} className="space-y-3" confirm="Cancel this order and return its items to stock?">
                <input type="hidden" name="id" value={o.id} />
                <input name="reason" placeholder="Reason (internal)" className={input} />
                {paid && <p className="text-xs text-amber-700">This order is paid. Cancelling returns stock; refund the customer from the Paystack dashboard.</p>}
                <Submit variant="danger">Cancel order</Submit>
              </ActionForm>
            </Card>
          )}
          <Link href={`/order/${o.reference}`} target="_blank" className="block text-xs underline">Customer’s order page ↗</Link>
        </div>
      </div>
    </>
  );
}
