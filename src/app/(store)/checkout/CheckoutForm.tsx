'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from '@/components/store/StoreProvider';
import { formatMoney } from '@/lib/money';
import { cx } from '@/lib/utils';

type Method = { id: string; name: string; description: string | null; price: number };
type Totals = { subtotal: number; shippingTotal: number; discountTotal: number; total: number };

const FIELDS: { name: string; label: string; type?: string; auto?: string; half?: boolean; optional?: boolean }[] = [
  { name: 'email', label: 'Email', type: 'email', auto: 'email' },
  { name: 'phone', label: 'Phone (for delivery & M-Pesa)', type: 'tel', auto: 'tel' },
  { name: 'firstName', label: 'First name', auto: 'given-name', half: true },
  { name: 'lastName', label: 'Last name', auto: 'family-name', half: true },
  { name: 'line1', label: 'Address', auto: 'address-line1' },
  { name: 'line2', label: 'Apartment, building, etc.', auto: 'address-line2', optional: true },
  { name: 'city', label: 'City / Town', auto: 'address-level2', half: true },
  { name: 'region', label: 'County / Region', auto: 'address-level1', half: true, optional: true },
  { name: 'postalCode', label: 'Postal code', auto: 'postal-code', half: true, optional: true },
  { name: 'country', label: 'Country', auto: 'country-name', half: true },
];

export default function CheckoutForm({ methods, paymentsEnabled }: { methods: Method[]; paymentsEnabled: boolean }) {
  const { cart } = useStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [method, setMethod] = useState(methods[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!cart || !cart.lines.length) return;
    const ctl = new AbortController();
    fetch('/api/checkout/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shippingMethodId: method, discountCode: applied }), signal: ctl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setTotals(d.totals);
        else if (applied) {
          setCodeMsg(d.error);
          setApplied('');
        }
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [cart, method, applied]);

  if (!cart) return <p className="t-ui py-20 text-center text-ink/50">Loading…</p>;
  if (!cart.lines.length)
    return (
      <div className="py-20 text-center">
        <p className="t-display text-5xl">Your bag is empty.</p>
        <Link href="/shop" className="btn-ink mt-6">Shop</Link>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, shippingMethodId: method, discountCode: applied, acceptsMarketing: marketing, paymentProvider: 'paystack' }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.fieldErrors) setErrors(d.fieldErrors);
        setFormError(d.error || 'Please check your details');
        setBusy(false);
        return;
      }
      window.location.href = d.authorizationUrl; // Paystack hosted payment page
    } catch {
      setFormError('Network error — please try again');
      setBusy(false);
    }
  };

  const t = totals ?? { subtotal: cart.subtotal, shippingTotal: methods.find((m) => m.id === method)?.price ?? 0, discountTotal: 0, total: cart.subtotal + (methods.find((m) => m.id === method)?.price ?? 0) };

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-7">
        <section aria-labelledby="c-info">
          <h2 id="c-info" className="t-ui mb-4 border-b-2 border-ink pb-2">01 — Contact &amp; delivery address</h2>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.name} className={f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                <label htmlFor={`f-${f.name}`} className="field-label">
                  {f.label} {f.optional && <span className="text-ink/40">(optional)</span>}
                </label>
                <input
                  id={`f-${f.name}`}
                  name={f.name}
                  type={f.type ?? 'text'}
                  autoComplete={f.auto}
                  required={!f.optional}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  aria-invalid={!!errors[f.name]}
                  aria-describedby={errors[f.name] ? `e-${f.name}` : undefined}
                  className={cx('field', errors[f.name] && 'border-signal')}
                />
                {errors[f.name] && <p id={`e-${f.name}`} className="t-micro mt-1 text-signal">{errors[f.name]}</p>}
              </div>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3 text-[14px]">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="h-4 w-4 accent-signal" />
            Email me about drops and restocks
          </label>
        </section>

        <section aria-labelledby="c-ship">
          <h2 id="c-ship" className="t-ui mb-4 border-b-2 border-ink pb-2">02 — Delivery</h2>
          {methods.length === 0 ? (
            <p className="t-micro bg-signal px-3 py-3 text-white">Delivery options have not been set up yet. Please contact us to order.</p>
          ) : (
            <div className="divide-y divide-ink/15 border border-ink/15">
              {methods.map((m) => (
                <label key={m.id} className={cx('flex cursor-pointer items-center gap-4 p-4', method === m.id && 'bg-[#f2f2f0]')}>
                  <input type="radio" name="shipping" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 accent-signal" />
                  <span className="flex-1">
                    <span className="t-ui block">{m.name}</span>
                    {m.description && <span className="text-[13px] text-ink/60">{m.description}</span>}
                  </span>
                  <span className="t-ui">{m.price === 0 ? 'Free' : formatMoney(m.price, cart.currency)}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="c-pay">
          <h2 id="c-pay" className="t-ui mb-4 border-b-2 border-ink pb-2">03 — Payment</h2>
          {paymentsEnabled ? (
            <label className="flex items-center gap-4 border border-ink bg-[#f2f2f0] p-4">
              <input type="radio" checked readOnly className="h-4 w-4 accent-signal" />
              <span>
                <span className="t-ui block">Pay with Paystack</span>
                <span className="text-[13px] text-ink/60">Card, M-Pesa and other local methods on Paystack’s secure page. Card details never touch our servers.</span>
              </span>
            </label>
          ) : (
            <p className="t-micro bg-ink px-3 py-3 text-white">Online payment is not switched on yet. Your order cannot be placed online until it is.</p>
          )}
        </section>
      </div>

      <aside className="lg:col-span-5">
        <div className="bg-[#f2f2f0] p-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <h2 className="t-ui mb-4">Order summary</h2>
          <ul className="max-h-[40vh] space-y-3 overflow-y-auto">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 bg-white">
                  {l.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="t-micro absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white">{l.quantity}</span>
                </div>
                <div className="flex-1">
                  <p className="t-ui">{l.title}</p>
                  <p className="t-micro text-ink/60">{[l.size, l.color].filter(Boolean).join(' / ')}</p>
                  {l.issue && <p className="t-micro text-signal">{l.issue}</p>}
                </div>
                <p className="t-ui">{formatMoney(l.lineTotal, cart.currency)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <label htmlFor="code" className="sr-only">Discount code</label>
            <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DISCOUNT CODE" className="field t-ui" />
            <button
              type="button"
              className="btn-line shrink-0"
              onClick={() => {
                setCodeMsg(null);
                setApplied(code.trim());
              }}
              disabled={!code.trim()}
            >
              Apply
            </button>
          </div>
          {codeMsg && <p className="t-micro mt-2 text-signal">{codeMsg}</p>}
          {applied && totals && totals.discountTotal > 0 && <p className="t-micro mt-2 text-ink/70">Code {applied} applied</p>}
          <dl className="mt-5 space-y-2 border-t border-ink/15 pt-4">
            <div className="t-ui flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(t.subtotal, cart.currency)}</dd></div>
            {t.discountTotal > 0 && <div className="t-ui flex justify-between text-signal"><dt>Discount</dt><dd>−{formatMoney(t.discountTotal, cart.currency)}</dd></div>}
            <div className="t-ui flex justify-between"><dt>Delivery</dt><dd>{methods.length ? formatMoney(t.shippingTotal, cart.currency) : '—'}</dd></div>
            <div className="t-display flex justify-between border-t border-ink/15 pt-3 text-3xl"><dt>Total</dt><dd>{formatMoney(t.total, cart.currency)}</dd></div>
          </dl>
          {formError && <p role="alert" className="t-micro mt-4 bg-signal px-3 py-2 text-white">{formError}</p>}
          <button type="submit" className="btn-red mt-5 w-full" disabled={busy || !paymentsEnabled || !methods.length || !cart.purchasable}>
            {busy ? 'Starting secure payment…' : `Pay ${formatMoney(t.total, cart.currency)}`}
          </button>
          <p className="t-micro mt-3 text-center text-ink/50">Items are held for 30 minutes while you pay.</p>
        </div>
      </aside>
    </form>
  );
}
