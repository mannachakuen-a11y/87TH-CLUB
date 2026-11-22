import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { randomToken } from './utils';
import { CURRENCY } from './money';

export const CART_COOKIE = 'club_cart';
export const MAX_LINE_QTY = 10;

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  size: string | null;
  color: string | null;
  image: string | null;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: number; // units in stock right now
  issue: string | null; // why this line cannot be bought as-is
};

export type CartView = {
  id: string | null;
  currency: string;
  lines: CartLine[];
  count: number;
  subtotal: number;
  purchasable: boolean;
};

const EMPTY: CartView = { id: null, currency: CURRENCY, lines: [], count: 0, subtotal: 0, purchasable: false };

export async function readCartToken() {
  return (await cookies()).get(CART_COOKIE)?.value;
}

/** Creates the cart and sets the cookie. Only call from a route handler or server action. */
export async function getOrCreateCartId(): Promise<string> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const cart = await prisma.cart.findUnique({ where: { token }, select: { id: true } });
    if (cart) return cart.id;
  }
  const newToken = randomToken();
  const cart = await prisma.cart.create({ data: { token: newToken } });
  jar.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

export async function loadCart(token?: string): Promise<CartView> {
  const t = token ?? (await readCartToken());
  if (!t) return EMPTY;
  const cart = await prisma.cart.findUnique({
    where: { token: t },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          variant: {
            include: {
              inventory: true,
              product: {
                include: {
                  images: { orderBy: { position: 'asc' }, take: 1 },
                  collections: { include: { collection: { select: { isDrop: true, launchAt: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) return EMPTY;
  return buildView(cart.id, cart.items);
}

type LoadedItem = NonNullable<Awaited<ReturnType<typeof loadItemsShape>>>[number];
// helper only for typing
async function loadItemsShape() {
  return prisma.cartItem.findMany({
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: {
              images: { orderBy: { position: 'asc' }, take: 1 },
              collections: { include: { collection: { select: { isDrop: true, launchAt: true } } } },
            },
          },
        },
      },
    },
  });
}

export function lineIssue(item: LoadedItem, now = new Date()): string | null {
  const p = item.variant.product;
  if (p.status !== 'ACTIVE') return 'No longer available';
  if (p.collections.some((c) => c.collection.isDrop && c.collection.launchAt && c.collection.launchAt > now)) return 'Not released yet';
  const price = item.variant.price ?? p.price;
  if (price === null) return 'Price unavailable';
  const stock = item.variant.inventory?.quantity ?? 0;
  if (stock <= 0) return 'Sold out';
  if (item.quantity > stock) return `Only ${stock} left`;
  return null;
}

function buildView(id: string, items: LoadedItem[]): CartView {
  const now = new Date();
  const lines: CartLine[] = items.map((it) => {
    const p = it.variant.product;
    const unitPrice = it.variant.price ?? p.price;
    return {
      id: it.id,
      variantId: it.variantId,
      productId: p.id,
      slug: p.slug,
      title: p.title,
      size: it.variant.size,
      color: it.variant.color,
      image: p.images[0]?.url ?? null,
      unitPrice,
      quantity: it.quantity,
      lineTotal: (unitPrice ?? 0) * it.quantity,
      available: Math.max(0, it.variant.inventory?.quantity ?? 0),
      issue: lineIssue(it, now),
    };
  });
  const subtotal = lines.reduce((s, l) => s + (l.issue ? 0 : l.lineTotal), 0);
  return {
    id,
    currency: CURRENCY,
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    purchasable: lines.length > 0 && lines.every((l) => !l.issue),
  };
}

export class CartError extends Error {}

export async function addToCart(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QTY) throw new CartError('Invalid quantity');
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { include: { collections: { include: { collection: true } } } } },
  });
  if (!variant) throw new CartError('Product not found');
  const p = variant.product;
  const now = new Date();
  if (p.status !== 'ACTIVE') throw new CartError('This product is not available');
  if (p.collections.some((c) => c.collection.isDrop && c.collection.launchAt && c.collection.launchAt > now)) throw new CartError('This drop has not launched yet');
  if ((variant.price ?? p.price) === null) throw new CartError('This product cannot be purchased yet');
  const stock = variant.inventory?.quantity ?? 0;
  if (stock <= 0) throw new CartError('This size is sold out');

  const cartId = await getOrCreateCartId();
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > stock) throw new CartError(stock === 1 ? 'Only 1 left in this size' : `Only ${stock} left in this size`);
  if (next > MAX_LINE_QTY) throw new CartError(`Maximum ${MAX_LINE_QTY} per item`);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: next },
  });
  await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

async function ownedItem(itemId: string) {
  const token = await readCartToken();
  if (!token) throw new CartError('Cart not found');
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { token } }, include: { variant: { include: { inventory: true } } } });
  if (!item) throw new CartError('Item not found');
  return item;
}

export async function updateCartItem(itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_LINE_QTY) throw new CartError('Invalid quantity');
  const item = await ownedItem(itemId);
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const stock = item.variant.inventory?.quantity ?? 0;
  if (quantity > stock) throw new CartError(stock <= 0 ? 'Sold out' : `Only ${stock} left`);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeCartItem(itemId: string) {
  const item = await ownedItem(itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
}
