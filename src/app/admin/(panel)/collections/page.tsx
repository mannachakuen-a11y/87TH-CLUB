import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Badge, Empty, PageHeader, btn, td, th } from '@/components/admin/ui';

export default async function CollectionsAdmin() {
  const cols = await prisma.collection.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Collections & drops" sub="Group products, schedule drops, and control what shows in the store." actions={<Link href="/admin/collections/new" className={btn}>New collection</Link>} />
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        {cols.length ? (
          <table className="w-full min-w-[640px]">
            <thead><tr><th className={th}>Title</th><th className={th}>Products</th><th className={th}>Visibility</th><th className={th}>Drop</th></tr></thead>
            <tbody>
              {cols.map((c) => (
                <tr key={c.id}>
                  <td className={td}><Link href={`/admin/collections/${c.id}`} className="font-medium underline">{c.title}</Link><div className="text-xs text-neutral-500">/collections/{c.slug}</div></td>
                  <td className={td}>{c._count.products}</td>
                  <td className={td}><Badge value={c.isVisible ? 'ACTIVE' : 'DRAFT'} /></td>
                  <td className={td}>{c.isDrop && c.launchAt ? (c.launchAt > new Date() ? `Launches ${c.launchAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Launched') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No collections yet.</Empty>}
      </div>
    </>
  );
}
