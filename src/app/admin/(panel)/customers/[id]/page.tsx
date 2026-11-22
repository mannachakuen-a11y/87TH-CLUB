import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { Badge, Card, PageHeader, td, th } from '@/components/admin/ui';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { items: true } } } }, addresses: { orderBy: { createdAt: 'desc' }, take: 5 } } });
  if (!c) notFound();
  const spent = c.orders.filter((o) => o.paymentStatus === 'SUCCESS').reduce((s, o) => s + o.total, 0);
  return (
    <>
      <PageHeader title={[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email} sub={`Customer since ${c.createdAt.toLocaleDateString('en-GB')} · ${formatMoney(spent)} spent`} actions={<Link href="/admin/customers" className="text-sm underline">← Customers</Link>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={`Orders (${c.orders.length})`} className="xl:col-span-2">
          <table className="w-full">
            <thead><tr><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Payment</th><th className={th}>Status</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.id}>
                  <td className={td}><Link href={`/admin/orders/${o.id}`} className="underline">#{o.number}</Link> <span className="text-xs text-neutral-500">({o._count.items} items)</span></td>
                  <td className={td}>{o.createdAt.toLocaleDateString('en-GB')}</td>
                  <td className={td}><Badge value={o.paymentStatus} /></td>
                  <td className={td}><Badge value={o.status} /></td>
                  <td className={td}>{formatMoney(o.total, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-6">
          <Card title="Contact">
            <p className="text-sm"><a className="underline" href={`mailto:${c.email}`}>{c.email}</a></p>
            {c.phone && <p className="text-sm"><a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></p>}
            <p className="mt-2 text-xs text-neutral-500">Marketing emails: {c.acceptsMarketing ? 'subscribed' : 'not subscribed'}</p>
          </Card>
          <Card title="Addresses">
            {c.addresses.map((a) => (
              <address key={a.id} className="mb-3 text-sm not-italic leading-relaxed">{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}{a.region && `, ${a.region}`} {a.postalCode}<br />{a.country}</address>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
