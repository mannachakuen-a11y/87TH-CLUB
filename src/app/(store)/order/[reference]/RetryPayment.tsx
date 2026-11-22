'use client';
import { useState } from 'react';

export default function RetryPayment({ reference }: { reference: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch('/api/checkout/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.authorizationUrl) window.location.href = d.authorizationUrl;
    else {
      setErr(d.error || 'Could not start payment');
      setBusy(false);
    }
  };
  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 bg-sand p-4">
      <p className="t-ui flex-1">Payment not received yet. Your items are held for a short time.</p>
      <button onClick={go} disabled={busy} className="btn-red">{busy ? 'Opening Paystack…' : 'Complete payment'}</button>
      {err && <p className="t-micro w-full text-signal">{err}</p>}
    </div>
  );
}
