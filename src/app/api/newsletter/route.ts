import { z } from 'zod';
import { prisma } from '@/lib/db';
import { json, parseBody, rateLimit, sameOrigin } from '@/lib/http';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z.string().trim().max(20).optional(),
  source: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  if (!(await rateLimit('newsletter', 10, 60_000))) return json({ error: 'Too many attempts — try again in a minute' }, 429);
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) {
    const body = await parsed.error.clone().json();
    return json({ error: body.fieldErrors?.email || body.error }, 422);
  }
  const { email, phone, source } = parsed.data;
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) return json({ ok: true, message: 'You’re already in the Club.' });
  await prisma.newsletterSubscriber.create({ data: { email, phone, source } });
  await prisma.customer.updateMany({ where: { email }, data: { acceptsMarketing: true } });
  return json({ ok: true, message: 'You’re in the Club. Welcome.' }, 201);
}
