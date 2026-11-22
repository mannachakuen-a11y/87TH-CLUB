import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './db';
import { loadCart, CartView } from './cart';
import { CURRENCY, formatMoney } from './money';
import { initializeTransaction, paystackConfigured, verifyTransaction, PaystackVerification } from './paystack';
import { sendEmail, esc } from './email';
import { siteUrl } from './utils';

const RESERVATION_MINUTES = Number(process.env.RESERVATION_MINUTES || 30);

export class CheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number')
    .max(20)
    .regex(/^\+?[0-9 ()-]+$/, 'Enter a valid phone number'),
  firstName: z.string().trim().min(1, 'Required').max(80),
  lastName: z.string().trim().min(1, 'Required').max(80),
  line1: z.string().trim().min(3, 'Required').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Required').max(100),
  region: z.string().trim().max(100).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.string().trim().min(2, 'Required').max(60),
  shippingMethodId: z.string().min(1, 'Choose a delivery option'),
  discountCode: z.string().trim().max(40).optional().or(z.literal('')),
  acceptsMarketing: z.boolean().optional(),
  paymentProvider: z.literal('paystack'),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return '87C-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function evaluateDiscount(code: string | undefined | null, subtotal: number) {
  if (!code) return { discount: null, amount: 0 };
  const d = await prisma.discount.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!d || !d.active) throw new CheckoutError('This discount code is not valid');
  if (d.startsAt && d.startsAt > now) throw new CheckoutError('This discount code is not active yet');
  if (d.endsAt && d.endsAt < now) throw new CheckoutError('This discount code has expired');
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) throw new CheckoutError('This discount code has been fully redeemed');
  if (d.minSubtotal !== null && subtotal < d.minSubtotal) throw new CheckoutError(`Spend at least ${formatMoney(d.minSubtotal)} to use this code`);
  const amount = d.type === 'PERCENTAGE' ? Math.floor((subtotal * Math.min(100, d.value)) / 100) : Math.min(subtotal, d.value);
  return { discount: d, amount };
}

/** Quote the order totals for the current cart without writing anything. */
export async function quote(cart: CartView, shippingMethodId?: string, discountCode?: string) {
  const method = shippingMethodId ? await prisma.shippingMethod.findFirst({ where: { id: shippingMethodId, active: true } }) : null;
  const { amount: discountTotal } = await evaluateDiscount(discountCode, cart.subtotal);
  const shippingTotal = method?.price ?? 0;
  return { subtotal: cart.subtotal, shippingTotal, discountTotal, total: Math.max(0, cart.subtotal - discountTotal) + shippingTotal };
}

/**
 * Creates the order, reserves stock atomically (no overselling) and starts a Paystack payment.
 * Payment success is only ever recorded after server-side verification with Paystack.
 */
export async function placeOrder(input: CheckoutInput, cartToken: string | undefined) {
  if (!paystackConfigured()) throw new CheckoutError('Online payments are not configured yet. Please contact us to order.', 503);
  await releaseExpiredReservations();

  const cart = await loadCart(cartToken);
  if (!cart.id || cart.lines.length === 0) throw new CheckoutError('Your bag is empty');
  const problem = cart.lines.find((l) => l.issue);
  if (problem) throw new CheckoutError(`${problem.title}${problem.size ? ` (${problem.size})` : ''}: ${problem.issue}`, 409);

  const method = await prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, active: true } });
  if (!method) throw new CheckoutError('Choose a valid delivery option');
  const { discount, amount: discountTotal } = await evaluateDiscount(input.discountCode, cart.subtotal);
  const subtotal = cart.subtotal;
  const shippingTotal = method.price;
  const total = Math.max(0, subtotal - discountTotal) + shippingTotal;
  if (total <= 0) throw new CheckoutError('Order total must be greater than zero');

  const reference = newReference();
  const order = await prisma.$transaction(
    async (tx) => {
      // Reserve stock: conditional decrement fails if another customer bought the last unit.
      for (const line of cart.lines) {
        const res = await tx.inventory.updateMany({
          where: { variantId: line.variantId, quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity } },
        });
        if (res.count !== 1) throw new CheckoutError(`${line.title}${line.size ? ` (${line.size})` : ''} just sold out`, 409);
      }
      if (discount) {
        const ok = await tx.discount.updateMany({
          where: { id: discount.id, ...(discount.usageLimit !== null ? { usedCount: { lt: discount.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (ok.count !== 1) throw new CheckoutError('This discount code has been fully redeemed');
      }
      const customer = await tx.customer.upsert({
        where: { email: input.email },
        create: { email: input.email, firstName: input.firstName, lastName: input.lastName, phone: input.phone, acceptsMarketing: !!input.acceptsMarketing },
        update: { firstName: input.firstName, lastName: input.lastName, phone: input.phone, ...(input.acceptsMarketing ? { acceptsMarketing: true } : {}) },
      });
      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          firstName: input.firstName,
          lastName: input.lastName,
          line1: input.line1,
          line2: input.line2 || null,
          city: input.city,
          region: input.region || null,
          postalCode: input.postalCode || null,
          country: input.country,
          phone: input.phone,
        },
      });
      const created = await tx.order.create({
        data: {
          reference,
          customerId: customer.id,
          email: input.email,
          phone: input.phone,
          shippingAddressId: address.id,
          shippingMethodId: method.id,
          shippingName: method.name,
          currency: CURRENCY,
          subtotal,
          shippingTotal,
          discountTotal,
          total,
          discountId: discount?.id,
          discountCode: discount?.code,
          reservedUntil: new Date(Date.now() + RESERVATION_MINUTES * 60_000),
          items: {
            create: cart.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              title: l.title,
              size: l.size,
              color: l.color,
              imageUrl: l.image,
              unitPrice: l.unitPrice!,
              quantity: l.quantity,
              lineTotal: l.unitPrice! * l.quantity,
            })),
          },
        },
      });
      for (const line of cart.lines) {
        const inv = await tx.inventory.findUnique({ where: { variantId: line.variantId } });
        if (inv) await tx.inventoryMovement.create({ data: { inventoryId: inv.id, change: -line.quantity, reason: 'reserved', orderId: created.id } });
      }
      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20_000 },
  );

  try {
    const authUrl = await startPayment(order.id);
    // Cart is cleared only after the order exists; the order keeps the snapshot.
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { reference: order.reference, authorizationUrl: authUrl };
  } catch (e) {
    await cancelOrder(order.id, 'Payment could not be started');
    throw new CheckoutError((e as Error).message || 'Payment could not be started', 502);
  }
}

/** Creates a Paystack transaction for an order (used for first attempt and retries). */
export async function startPayment(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
  if (order.paymentStatus === 'SUCCESS') throw new CheckoutError('This order is already paid');
  if (order.status !== 'PENDING_PAYMENT' || order.stockReleased) throw new CheckoutError('This order has expired. Please check out again.');
  const attempt = order.payments.length + 1;
  const reference = attempt === 1 ? order.reference : `${order.reference}-${attempt}`;
  const init = await initializeTransaction({
    email: order.email,
    amount: order.total,
    currency: order.currency,
    reference,
    callbackUrl: siteUrl(`/checkout/verify?reference=${encodeURIComponent(reference)}`),
    metadata: { order_reference: order.reference, order_number: order.number },
  });
  await prisma.payment.create({ data: { orderId: order.id, provider: 'paystack', reference, amount: order.total, currency: order.currency } });
  return init.authorization_url;
}

/**
 * Verifies a payment with Paystack and updates the order. Idempotent: safe to call from the
 * redirect page and the webhook at the same time.
 */
export async function confirmPayment(paymentReference: string, prefetched?: PaystackVerification) {
  const payment = await prisma.payment.findUnique({ where: { reference: paymentReference }, include: { order: true } });
  if (!payment) throw new CheckoutError('Payment not found', 404);
  if (payment.status === 'SUCCESS') return { order: payment.order, status: 'SUCCESS' as const };

  const v = prefetched && prefetched.reference === paymentReference ? prefetched : await verifyTransaction(paymentReference);
  const order = payment.order;

  if (v.status === 'success') {
    if (v.amount !== payment.amount || v.currency?.toUpperCase() !== payment.currency.toUpperCase()) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', providerData: v as object, verifiedAt: new Date() } });
      await prisma.order.update({ where: { id: order.id }, data: { note: appendNote(order.note, `Payment ${paymentReference} amount/currency mismatch: received ${v.amount} ${v.currency}`) } });
      throw new CheckoutError('Payment amount did not match the order. Our team has been notified.', 409);
    }
    // Atomic transition so concurrent webhook + redirect only process once.
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCESS' } },
      data: { status: 'SUCCESS', channel: v.channel ?? null, providerData: v as object, verifiedAt: new Date() },
    });
    if (updated.count === 1) {
      let note: string | null = null;
      if (order.stockReleased) {
        // Paid after the reservation expired: try to take the stock again.
        const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
        for (const it of items) {
          if (!it.variantId) continue;
          const r = await prisma.inventory.updateMany({ where: { variantId: it.variantId, quantity: { gte: it.quantity } }, data: { quantity: { decrement: it.quantity } } });
          if (r.count !== 1) note = 'PAID AFTER RESERVATION EXPIRED — some items may be out of stock. Contact the customer.';
        }
      }
      const paidOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'SUCCESS',
          paidAt: v.paid_at ? new Date(v.paid_at) : new Date(),
          stockReleased: false,
          cancelledAt: null,
          ...(note ? { note: appendNote(order.note, note) } : {}),
        },
      });
      await sendOrderEmails(paidOrder.id);
      return { order: paidOrder, status: 'SUCCESS' as const };
    }
    return { order: await prisma.order.findUniqueOrThrow({ where: { id: order.id } }), status: 'SUCCESS' as const };
  }

  if (v.status === 'failed' || v.status === 'reversed') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', providerData: v as object, verifiedAt: new Date() } });
    return { order, status: 'FAILED' as const };
  }
  if (v.status === 'abandoned') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'ABANDONED', providerData: v as object } });
    return { order, status: 'ABANDONED' as const };
  }
  return { order, status: 'PENDING' as const };
}

function appendNote(existing: string | null, line: string) {
  return [existing, `[${new Date().toISOString()}] ${line}`].filter(Boolean).join('\n');
}

async function restock(orderId: string, reason: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.stockReleased) return;
  await prisma.$transaction(async (tx) => {
    const flagged = await tx.order.updateMany({ where: { id: orderId, stockReleased: false }, data: { stockReleased: true } });
    if (flagged.count !== 1) return;
    for (const it of order.items) {
      if (!it.variantId) continue;
      const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } });
      if (!inv) continue;
      await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: it.quantity } } });
      await tx.inventoryMovement.create({ data: { inventoryId: inv.id, change: it.quantity, reason, orderId } });
    }
    if (order.discountId && order.paymentStatus !== 'SUCCESS') {
      await tx.discount.updateMany({ where: { id: order.discountId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
  });
}

export async function cancelOrder(orderId: string, reason: string, opts: { restock?: boolean } = {}) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === 'CANCELLED') return order;
  if (opts.restock !== false) await restock(orderId, `cancelled: ${reason}`);
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      paymentStatus: order.paymentStatus === 'PENDING' ? 'ABANDONED' : order.paymentStatus,
      note: appendNote(order.note, `Cancelled: ${reason}${order.paymentStatus === 'SUCCESS' ? ' — refund must be issued from the Paystack dashboard' : ''}`),
    },
  });
}

/** Releases stock held by unpaid orders whose reservation window has passed. */
export async function releaseExpiredReservations() {
  const expired = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', stockReleased: false, reservedUntil: { lt: new Date() } },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
    take: 50,
  });
  for (const o of expired) {
    // A webhook may have been missed — check with Paystack before releasing.
    if (paystackConfigured()) {
      let paid = false;
      for (const p of o.payments) {
        try {
          const r = await confirmPayment(p.reference);
          if (r.status === 'SUCCESS') {
            paid = true;
            break;
          }
        } catch {
          /* provider unreachable — fall through */
        }
      }
      if (paid) continue;
    }
    await cancelOrder(o.id, 'Payment not completed within the reservation window');
  }
}

async function sendOrderEmails(orderId: string) {
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shippingAddress: true } });
  const lines = o.items.map((i) => `${i.quantity} × ${i.title}${i.size ? ` / ${i.size}` : ''}${i.color ? ` / ${i.color}` : ''} — ${formatMoney(i.lineTotal, o.currency)}`);
  const text = [
    `Order #${o.number} (${o.reference}) is confirmed.`,
    '',
    ...lines,
    '',
    `Subtotal: ${formatMoney(o.subtotal, o.currency)}`,
    o.discountTotal ? `Discount: -${formatMoney(o.discountTotal, o.currency)}` : '',
    `Delivery (${o.shippingName}): ${formatMoney(o.shippingTotal, o.currency)}`,
    `Total paid: ${formatMoney(o.total, o.currency)}`,
    '',
    `Track your order: ${siteUrl(`/order/${o.reference}`)}`,
    '',
    'THE 87TH CLUB — Life is art.',
  ]
    .filter((l) => l !== '')
    .join('\n');
  await sendEmail(o.email, `THE 87TH CLUB — Order #${o.number} confirmed`, text, `<pre style="font-family:Helvetica,Arial,sans-serif">${esc(text)}</pre>`);
  if (process.env.ORDER_NOTIFY_EMAIL) await sendEmail(process.env.ORDER_NOTIFY_EMAIL, `New paid order #${o.number} — ${formatMoney(o.total, o.currency)}`, text);
}
