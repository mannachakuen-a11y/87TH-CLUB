import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { confirmPayment } from '@/lib/orders';

export const metadata: Metadata = { title: 'Confirming payment', robots: { index: false } };

/** Paystack redirects here. We never trust the redirect itself — the payment is verified server-side with Paystack. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const ref = sp.reference || sp.trxref;
  if (!ref) redirect('/');
  let result: Awaited<ReturnType<typeof confirmPayment>> | null = null;
  let error: string | null = null;
  try {
    result = await confirmPayment(ref);
  } catch (e) {
    error = (e as Error).message;
  }
  if (result?.status === 'SUCCESS') redirect(`/order/${result.order.reference}?paid=1`);
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-start justify-center gap-6 py-16">
      <h1 className="t-display text-6xl sm:text-8xl">{result?.status === 'PENDING' ? 'Payment processing' : 'Payment not completed'}</h1>
      <p className="max-w-lg text-[15px] text-ink/80">
        {error
          ? `We couldn’t confirm this payment: ${error}`
          : result?.status === 'PENDING'
            ? 'Your payment is still being processed. This page will show the result once Paystack confirms it — you will also get an email.'
            : 'Your payment was not completed and you have not been charged. Your items are held for a short time — you can try again.'}
      </p>
      {result && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/order/${result.order.reference}`} className="btn-ink">{result.status === 'PENDING' ? 'Check status' : 'Try payment again'}</Link>
          <Link href="/bag" className="btn-line">Back to bag</Link>
        </div>
      )}
    </div>
  );
}
