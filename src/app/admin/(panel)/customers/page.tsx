import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { Empty, PageHeader, btnGhost, input, td, th } from '@/components/admin/ui';

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { firstName: { contains: q, mode: 'insensitive' as const } }, { lastName: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } : {};
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50, include: { orders: { where: { paymentStatus: 'SUCCESS' }, select: { total: true } }, _count: { select: { orders: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Customers" sub={`${total} customers`} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Name, email or phone" className={`${input} max-w-xs`} />
        <button className={btnGhost}>Search</button>
      </form>
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        {customers.length ? (
          <table className="w-full min-w-[720px]">
            <thead><tr><th className={th}>Customer</th><th className={th}>Phone</th><th className={th}>Orders</th><th className={th}>Spent</th><th className={th}>Marketing</th><th className={th}>Since</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className={td}><Link href={`/admin/customers/${c.id}`} className="font-medium underline">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}</Link><div className="text-xs text-neutral-500">{c.email}</div></td>
                  <td className={td}>{c.phone ?? '—'}</td>
                  <td className={td}>{c._count.orders} ({c.orders.length} paid)</td>
                  <td className={td}>{formatMoney(c.orders.reduce((s, o) => s + o.total, 0))}</td>
                  <td className={td}>{c.acceptsMarketing ? 'Yes' : 'No'}</td>
                  <td className={td}>{c.createdAt.toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No customers yet. Customers are created at checkout.</Empty>}
      </div>
      {total > 50 && (
        <div className="mt-4 flex gap-4 text-sm">
          {page > 1 && <Link className="underline" href={`?q=${q ?? ''}&page=${page - 1}`}>Previous</Link>}
          <span>Page {page} of {Math.ceil(total / 50)}</span>
          {page * 50 < total && <Link className="underline" href={`?q=${q ?? ''}&page=${page + 1}`}>Next</Link>}
        </div>
      )}
    </>
  );
}
