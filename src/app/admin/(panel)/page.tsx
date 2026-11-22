import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { releaseExpiredReservations } from '@/lib/orders';
import { paystackConfigured } from '@/lib/paystack';
import { emailConfigured } from '@/lib/email';
import { Badge, Card, PageHeader, Stat, td, th, Empty } from '@/components/admin/ui';

export default async function Overview() {
  await releaseExpiredReservations().catch((e) => console.error(e));
  const paid = { paymentStatus: 'SUCCESS' as const, status: { notIn: ['REFUNDED' as const, 'CANCELLED' as const] } };
  const [sales, totalOrders, pending, completed, customers, lowStock, best, recent, productCounts, shippingCount] = await Promise.all([
    prisma.order.aggregate({ where: paid, _sum: { total: true }, _count: true }),
    prisma.order.count({ where: { paymentStatus: 'SUCCESS' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.customer.count({ where: { orders: { some: { paymentStatus: 'SUCCESS' } } } }),
    prisma.$queryRaw<{ id: string; title: string; size: string | null; color: string | null; quantity: number; productId: string }[]>`
      SELECT v.id, p.title, v.size, v.color, i.quantity, p.id as "productId"
      FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId"
      WHERE p.status = 'ACTIVE' AND i.quantity IS NOT NULL AND i.quantity <= i."lowStockThreshold"
      ORDER BY i.quantity ASC LIMIT 12`,
    prisma.orderItem.groupBy({ by: ['productId', 'title'], where: { order: { paymentStatus: 'SUCCESS' } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 8 }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.product.groupBy({ by: ['status'], _count: true }),
    prisma.shippingMethod.count({ where: { active: true } }),
  ]);
  const pc = Object.fromEntries(productCounts.map((p) => [p.status, p._count]));
  const setup = [
    { ok: paystackConfigured(), label: 'Paystack payments', fix: 'Set PAYSTACK_SECRET_KEY in the server environment' },
    { ok: shippingCount > 0, label: 'Delivery options', fix: 'Add at least one delivery option', href: '/admin/shipping' },
    { ok: (pc.ACTIVE ?? 0) > 0, label: 'Published products', fix: 'Import or add products and publish them', href: '/admin/products' },
    { ok: emailConfigured(), label: 'Order emails (SMTP)', fix: 'Set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM' },
  ];

  return (
    <>
      <PageHeader title="Overview" sub="Live figures from paid orders only." />
      {setup.some((s) => !s.ok) && (
        <Card title="Store setup" className="mb-6">
          <ul className="space-y-2 text-sm">
            {setup.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <span className={s.ok ? 'text-green-700' : 'text-red-600'}>{s.ok ? '✓' : '✗'}</span>
                <span className="font-medium">{s.label}</span>
                {!s.ok && (s.href ? <Link href={s.href} className="text-neutral-500 underline">{s.fix}</Link> : <span className="text-neutral-500">{s.fix}</span>)}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total sales" value={formatMoney(sales._sum.total ?? 0)} hint={`${sales._count} paid orders`} />
        <Stat label="Total orders" value={totalOrders} href="/admin/orders" />
        <Stat label="To fulfil" value={pending} hint="Paid / processing" href="/admin/orders?status=PAID" />
        <Stat label="Completed" value={completed} hint="Delivered" href="/admin/orders?status=DELIVERED" />
        <Stat label="Customers" value={customers} hint="With a paid order" href="/admin/customers" />
        <Stat label="Products" value={`${pc.ACTIVE ?? 0} live`} hint={`${pc.DRAFT ?? 0} draft`} href="/admin/products" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-xs underline">All orders</Link>}>
          {recent.length ? (
            <table className="w-full">
              <thead><tr><th className={th}>#</th><th className={th}>Customer</th><th className={th}>Status</th><th className={th}>Total</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-medium underline">#{o.number}</Link></td>
                    <td className={td}>{o.email}</td>
                    <td className={td}><Badge value={o.status} /></td>
                    <td className={td}>{formatMoney(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No orders yet.</Empty>}
        </Card>
        <Card title="Low stock (live products)">
          {lowStock.length ? (
            <table className="w-full">
              <thead><tr><th className={th}>Product</th><th className={th}>Option</th><th className={th}>Left</th></tr></thead>
              <tbody>
                {lowStock.map((v) => (
                  <tr key={v.id}>
                    <td className={td}><Link href={`/admin/products/${v.productId}`} className="underline">{v.title}</Link></td>
                    <td className={td}>{[v.size, v.color].filter(Boolean).join(' / ') || 'Default'}</td>
                    <td className={`${td} font-semibold ${v.quantity <= 0 ? 'text-red-600' : ''}`}>{v.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Nothing is running low.</Empty>}
        </Card>
        <Card title="Best-selling products">
          {best.length ? (
            <table className="w-full">
              <thead><tr><th className={th}>Product</th><th className={th}>Units</th><th className={th}>Revenue</th></tr></thead>
              <tbody>
                {best.map((b) => (
                  <tr key={`${b.productId}-${b.title}`}>
                    <td className={td}>{b.productId ? <Link href={`/admin/products/${b.productId}`} className="underline">{b.title}</Link> : b.title}</td>
                    <td className={td}>{b._sum.quantity}</td>
                    <td className={td}>{formatMoney(b._sum.lineTotal ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No sales yet.</Empty>}
        </Card>
      </div>
    </>
  );
}
