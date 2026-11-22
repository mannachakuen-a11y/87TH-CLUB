import { z } from 'zod';
import { CartError, loadCart, removeCartItem, updateCartItem, MAX_LINE_QTY } from '@/lib/cart';
import { json, parseBody, sameOrigin } from '@/lib/http';

type Ctx = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  const parsed = await parseBody(req, z.object({ quantity: z.number().int().min(0).max(MAX_LINE_QTY) }));
  if ('error' in parsed) return parsed.error;
  try {
    await updateCartItem((await params).itemId, parsed.data.quantity);
    return json({ cart: await loadCart() });
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, cart: await loadCart() }, 409);
    throw e;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  try {
    await removeCartItem((await params).itemId);
    return json({ cart: await loadCart() });
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, cart: await loadCart() }, 404);
    throw e;
  }
}
