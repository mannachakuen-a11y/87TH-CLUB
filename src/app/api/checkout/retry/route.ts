import { z } from 'zod';
import { prisma } from '@/lib/db';
import { CheckoutError, releaseExpiredReservations, startPayment } from '@/lib/orders';
import { json, parseBody, rateLimit, sameOrigin } from '@/lib/http';

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  if (!(await rateLimit('retry', 10, 60_000))) return json({ error: 'Too many attempts' }, 429);
  const parsed = await parseBody(req, z.object({ reference: z.string().min(5).max(40) }));
  if ('error' in parsed) return parsed.error;
  await releaseExpiredReservations();
  const order = await prisma.order.findUnique({ where: { reference: parsed.data.reference } });
  if (!order) return json({ error: 'Order not found' }, 404);
  try {
    return json({ authorizationUrl: await startPayment(order.id) });
  } catch (e) {
    if (e instanceof CheckoutError) return json({ error: e.message }, e.status);
    console.error('[retry]', e);
    return json({ error: 'Could not start payment' }, 502);
  }
}
