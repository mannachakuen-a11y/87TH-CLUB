import { prisma } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });
  const subs = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'asc' } });
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = ['email,phone,source,joined', ...subs.map((s) => [s.email, s.phone ?? '', s.source ?? '', s.createdAt.toISOString()].map(esc).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="87th-club-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}
