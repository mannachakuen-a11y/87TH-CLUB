import { prisma } from '@/lib/db';
import { Card, Empty, PageHeader } from '@/components/admin/ui';
import { messageAction } from '../../actions/catalog';

export default async function MessagesAdmin() {
  const msgs = await prisma.contactMessage.findMany({ orderBy: [{ handled: 'asc' }, { createdAt: 'desc' }], take: 200 });
  return (
    <>
      <PageHeader title="Messages" sub={`${msgs.filter((m) => !m.handled).length} open — from the contact form`} />
      <div className="space-y-3">
        {msgs.length ? msgs.map((m) => (
          <Card key={m.id} className={m.handled ? 'opacity-60' : ''}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{m.subject || '(no subject)'}</p>
                <p className="text-sm text-neutral-500">{m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'your message'))}`} className="underline">{m.email}</a> · {m.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <form action={messageAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value={m.handled ? 'open' : 'handled'} /><button className="underline">{m.handled ? 'Reopen' : 'Mark handled'}</button></form>
                <form action={messageAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value="delete" /><button className="text-red-600 underline">Delete</button></form>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
          </Card>
        )) : <Card><Empty>No messages.</Empty></Card>}
      </div>
    </>
  );
}
