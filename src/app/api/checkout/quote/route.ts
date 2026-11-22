import { z } from 'zod';
import { loadCart } from '@/lib/cart';
import { CheckoutError, quote } from '@/lib/orders';
import { json, parseBody } from '@/lib/http';

export async function POST(req: Request) {
  const parsed = await parseBody(req, z.object({ shippingMethodId: z.string().max(40).optional(), discountCode: z.string().max(40).optional() }));
  if ('error' in parsed) return parsed.error;
  const cart = await loadCart();
  try {
    return json({ totals: await quote(cart, parsed.data.shippingMethodId || undefined, parsed.data.discountCode || undefined) });
  } catch (e) {
    if (e instanceof CheckoutError) return json({ error: e.message }, e.status);
    throw e;
  }
}
