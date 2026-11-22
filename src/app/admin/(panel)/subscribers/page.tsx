import { prisma } from '@/lib/db';
import { Empty, PageHeader, btnGhost, td, th } from '@/components/admin/ui';
import { deleteSubscriberAction } from '../../actions/catalog';

export default async function SubscribersAdmin() {
  const [total, subs] = await Promise.all([prisma.newsletterSubscriber.count(), prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })]);
  return (
    <>
      <PageHeader title="Newsletter" sub={`${total} subscribers (incl. drop early-access signups)`} actions={<a href="/api/admin/subscribers" className={btnGhost}>Export CSV</a>} />
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        {subs.length ? (
          <table className="w-full min-w-[560px]">
            <thead><tr><th className={th}>Email</th><th className={th}>Source</th><th className={th}>Joined</th><th className={th}></th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className={td}>{s.email}</td>
                  <td className={td}>{s.source ?? '—'}</td>
                  <td className={td}>{s.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className={`${td} text-right`}><form action={deleteSubscriberAction}><input type="hidden" name="id" value={s.id} /><button className="text-xs text-red-600 underline">Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No subscribers yet.</Empty>}
      </div>
    </>
  );
}
