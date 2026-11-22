import { checkoutSchema, CheckoutError, placeOrder } from '@/lib/orders';
import { readCartToken } from '@/lib/cart';
import { json, parseBody, rateLimit, sameOrigin } from '@/lib/http';

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  if (!(await rateLimit('checkout', 10, 60_000))) return json({ error: 'Too many attempts — try again shortly' }, 429);
  const parsed = await parseBody(req, checkoutSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const r = await placeOrder(parsed.data, await readCartToken());
    return json(r, 201);
  } catch (e) {
    if (e instanceof CheckoutError) return json({ error: e.message }, e.status);
    console.error('[checkout]', e);
    return json({ error: 'Something went wrong placing your order. You have not been charged.' }, 500);
  }
}
