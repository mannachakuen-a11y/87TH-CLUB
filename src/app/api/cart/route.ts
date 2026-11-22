import { z } from 'zod';
import { addToCart, CartError, loadCart, MAX_LINE_QTY } from '@/lib/cart';
import { json, parseBody, sameOrigin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ cart: await loadCart() });
}

const addSchema = z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(MAX_LINE_QTY) });

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  const parsed = await parseBody(req, addSchema);
  if ('error' in parsed) return parsed.error;
  try {
    await addToCart(parsed.data.variantId, parsed.data.quantity);
    return json({ cart: await loadCart() });
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, cart: await loadCart() }, 409);
    throw e;
  }
}
