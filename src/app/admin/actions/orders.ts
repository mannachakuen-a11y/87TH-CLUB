'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { cancelOrder, confirmPayment } from '@/lib/orders';
import { sendEmail } from '@/lib/email';
import { siteUrl } from '@/lib/utils';
import type { ActionState } from '@/components/admin/ActionForm';

const FLOW: Record<string, string[]> = {
  PENDING_PAYMENT: [],
  PAID: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateOrderStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id'));
  const status = z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED']).safeParse(fd.get('status'));
  if (!status.success) return { error: 'Choose a status' };
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: 'Order not found' };
  if (!FLOW[order.status].includes(status.data)) return { error: `Can’t move an order from ${order.status.replace('_', ' ').toLowerCase()} to ${status.data.toLowerCase()}. Only paid orders can be fulfilled.` };
  const fulfillment = status.data === 'PROCESSING' ? 'PROCESSING' : status.data === 'SHIPPED' ? 'SHIPPED' : status.data === 'DELIVERED' ? 'DELIVERED' : order.fulfillmentStatus;
  await prisma.order.update({
    where: { id },
    data: { status: status.data, fulfillmentStatus: fulfillment, ...(status.data === 'REFUNDED' ? { paymentStatus: 'REFUNDED', note: [order.note, `[${new Date().toISOString()}] Marked refunded — issue the refund in the Paystack dashboard.`].filter(Boolean).join('\n') } : {}) },
  });
  if (fd.get('notify') === 'on' && (status.data === 'SHIPPED' || status.data === 'DELIVERED')) {
    await sendEmail(order.email, `THE 87TH CLUB — Order #${order.number} ${status.data.toLowerCase()}`, `Your order #${order.number} is ${status.data.toLowerCase()}.\n\nTrack it here: ${siteUrl(`/order/${order.reference}`)}`);
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: `Order marked ${status.data.toLowerCase()}.` };
}

export async function trackingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id'));
  const p = z.object({ carrier: z.string().trim().max(80), trackingNumber: z.string().trim().min(1, 'Enter a tracking number').max(120), trackingUrl: z.string().trim().url('Tracking link must be a URL').or(z.literal('')) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: 'Order not found' };
  if (order.paymentStatus !== 'SUCCESS') return { error: 'Only paid orders can be shipped.' };
  const ship = fd.get('markShipped') === 'on' && ['PAID', 'PROCESSING'].includes(order.status);
  await prisma.order.update({
    where: { id },
    data: { carrier: p.data.carrier || null, trackingNumber: p.data.trackingNumber, trackingUrl: p.data.trackingUrl || null, ...(ship ? { status: 'SHIPPED', fulfillmentStatus: 'SHIPPED' } : {}) },
  });
  let mail = '';
  if (fd.get('notify') === 'on') {
    const r = await sendEmail(
      order.email,
      `THE 87TH CLUB — Order #${order.number} is on its way`,
      `Your order #${order.number} has shipped.\n\n${p.data.carrier ? `Carrier: ${p.data.carrier}\n` : ''}Tracking: ${p.data.trackingNumber}${p.data.trackingUrl ? `\n${p.data.trackingUrl}` : ''}\n\nOrder page: ${siteUrl(`/order/${order.reference}`)}`,
    );
    mail = r.sent ? ' Customer emailed.' : ` Email not sent (${r.error}).`;
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: `Tracking saved.${ship ? ' Marked shipped.' : ''}${mail}` };
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id'));
  const reason = String(fd.get('reason') || 'Cancelled by admin').slice(0, 300);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: 'Order not found' };
  if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return { error: `A ${order.status.toLowerCase()} order can’t be cancelled.` };
  await cancelOrder(id, reason, { restock: fd.get('restock') !== 'off' });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: order.paymentStatus === 'SUCCESS' ? 'Order cancelled and stock returned. Issue the refund from your Paystack dashboard.' : 'Order cancelled and stock returned.' };
}

export async function noteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id'));
  await prisma.order.update({ where: { id }, data: { note: String(fd.get('note') || '').slice(0, 5000) || null } });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: 'Note saved.' };
}

export async function reverifyPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const ref = String(fd.get('reference'));
  try {
    const r = await confirmPayment(ref);
    revalidatePath(`/admin/orders/${r.order.id}`);
    return { ok: `Paystack says: ${r.status.toLowerCase()}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
