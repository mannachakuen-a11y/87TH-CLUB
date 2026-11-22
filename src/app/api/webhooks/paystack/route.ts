import { prisma } from '@/lib/db';
import { confirmPayment } from '@/lib/orders';
import { validWebhookSignature, type PaystackVerification } from '@/lib/paystack';

/**
 * Paystack webhook (set the URL to https://<your-domain>/api/webhooks/paystack in the Paystack dashboard).
 * The signature is verified, then the transaction is re-verified with the Paystack API before the order is marked paid.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) return new Response('invalid signature', { status: 401 });
  let event: { event?: string; data?: PaystackVerification };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('bad payload', { status: 400 });
  }
  if (event.event === 'charge.success' && event.data?.reference) {
    const exists = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
    if (exists) {
      try {
        await confirmPayment(event.data.reference); // re-verifies with the API; does not trust the payload alone
      } catch (e) {
        console.error('[paystack webhook]', e);
        return new Response('retry', { status: 500 });
      }
    }
  }
  return new Response('ok');
}
