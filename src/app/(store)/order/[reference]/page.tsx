import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import Mascot from '@/components/Mascot';
import RetryPayment from './RetryPayment';

export const metadata: Metadata = { title: 'Your order', robots: { index: false } };

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Confirmed',
  PROCESSING: 'Being prepared',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

function mask(email: string) {
  const [u, d] = email.split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { reference } = await params;
  const sp = await searchParams;
  const o = await prisma.order.findUnique({ where: { reference }, include: { items: true, shippingAddress: true } });
  if (!o) notFound();
  const paid = o.paymentStatus === 'SUCCESS';
  return (
    <div className="wrap pb-10 pt-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-6">
        <div>
          <p className="t-micro text-signal">Order #{o.number} · {o.reference}</p>
          <h1 className="t-display mt-2 text-6xl sm:text-8xl">{paid && sp.paid ? 'Welcome to the Club.' : STATUS[o.status]}</h1>
          {paid && <p className="mt-3 text-[15px] text-ink/70">Confirmation sent to {mask(o.email)}.</p>}
        </div>
        {paid && <Mascot size={200} className="h-24 w-24 sm:h-32 sm:w-32" />}
      </div>
      {o.status === 'PENDING_PAYMENT' && !o.stockReleased && <RetryPayment reference={o.reference} />}
      {o.status === 'CANCELLED' && <p className="t-micro mb-8 bg-ink px-3 py-3 text-white">This order was cancelled{o.paymentStatus !== 'SUCCESS' ? ' and you were not charged.' : '.'}</p>}
      <div className="grid gap-10 lg:grid-cols-12">
        <ul className="divide-y divide-ink/15 lg:col-span-7">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4">
              <div className="h-28 w-[88px] shrink-0 bg-[#f2f2f0]">
                {i.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="t-ui">{i.title}</p>
                <p className="t-micro text-ink/60">{[i.size && `Size ${i.size}`, i.color, `Qty ${i.quantity}`].filter(Boolean).join(' / ')}</p>
              </div>
              <p className="t-ui">{formatMoney(i.lineTotal, o.currency)}</p>
            </li>
          ))}
        </ul>
        <aside className="space-y-6 lg:col-span-5">
          <dl className="space-y-2 bg-[#f2f2f0] p-6">
            <div className="t-ui flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
            {o.discountTotal > 0 && <div className="t-ui flex justify-between"><dt>Discount {o.discountCode}</dt><dd>−{formatMoney(o.discountTotal, o.currency)}</dd></div>}
            <div className="t-ui flex justify-between"><dt>Delivery · {o.shippingName}</dt><dd>{formatMoney(o.shippingTotal, o.currency)}</dd></div>
            <div className="t-display flex justify-between border-t border-ink/15 pt-3 text-3xl"><dt>Total</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
          </dl>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="t-micro mb-2 text-ink/50">Status</p>
              <p className="t-ui">{STATUS[o.status]}</p>
              {o.trackingNumber && (
                <p className="mt-2 text-[14px]">
                  {o.carrier && <>{o.carrier} · </>}
                  {o.trackingUrl ? <a href={o.trackingUrl} className="link-u" target="_blank" rel="noopener noreferrer">{o.trackingNumber}</a> : o.trackingNumber}
                </p>
              )}
            </div>
            {o.shippingAddress && (
              <div>
                <p className="t-micro mb-2 text-ink/50">Delivering to</p>
                <p className="text-[14px] leading-relaxed">
                  {o.shippingAddress.firstName} {o.shippingAddress.lastName}
                  <br />
                  {o.shippingAddress.city}, {o.shippingAddress.country}
                </p>
              </div>
            )}
          </div>
          <Link href="/shop" className="btn-ink">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
