import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { Badge, Empty, PageHeader, btnGhost, input, td, th } from '@/components/admin/ui';

const PER = 50;
const STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(sp.status && STATUSES.includes(sp.status) ? { status: sp.status as Prisma.EnumOrderStatusFilter['equals'] } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { reference: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : [])] } : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } }, shippingAddress: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  return (
    <>
      <PageHeader title="Orders" sub={`${total} orders`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Order #, reference, email or phone" className={`${input} max-w-xs`} />
        <select name="status" defaultValue={sp.status ?? ''} className={`${input} w-auto`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}
        </select>
        <button className={btnGhost}>Filter</button>
      </form>
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        {orders.length ? (
          <table className="w-full min-w-[820px]">
            <thead><tr><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>Payment</th><th className={th}>Status</th><th className={th}>Items</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-medium underline">#{o.number}</Link><div className="text-xs text-neutral-500">{o.reference}</div></td>
                  <td className={td}>{o.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className={td}>{o.shippingAddress ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}` : ''}<div className="text-xs text-neutral-500">{o.email}</div></td>
                  <td className={td}><Badge value={o.paymentStatus} /></td>
                  <td className={td}><Badge value={o.status} /></td>
                  <td className={td}>{o._count.items}</td>
                  <td className={td}>{formatMoney(o.total, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No orders found.</Empty>}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex gap-4 text-sm">
          {page > 1 && <Link className="underline" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page - 1) })}`}>Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="underline" href={`?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page + 1) })}`}>Next</Link>}
        </div>
      )}
    </>
  );
}
