import 'server-only';
import crypto from 'node:crypto';

/**
 * Paystack — supports cards, M-Pesa (Kenya), mobile money, bank transfer and Apple Pay
 * depending on the merchant's country. Docs: https://paystack.com/docs/api/transaction/
 * Secrets are read from the server environment only.
 */
const API = () => (process.env.PAYSTACK_API_BASE || 'https://api.paystack.co').replace(/\/$/, '');

export function paystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API() + path, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: unknown } | null;
  if (!res.ok || !body?.status) throw new Error(`Paystack: ${body?.message || res.statusText}`);
  return body.data as T;
}

export async function initializeTransaction(input: {
  email: string;
  amount: number; // minor units
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export type PaystackVerification = {
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'processing' | 'queued' | 'reversed' | string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string | null;
  gateway_response?: string;
  id?: number;
};

export async function verifyTransaction(reference: string) {
  return call<PaystackVerification>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Validates the x-paystack-signature header (HMAC SHA512 of the raw body with the secret key). */
export function validWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
