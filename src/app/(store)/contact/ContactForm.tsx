'use client';
import { useState } from 'react';
import { cx } from '@/lib/utils';

export default function ContactForm() {
  const [v, setV] = useState({ name: '', email: '', subject: '', message: '', company: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setErrors({});
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : { error: 'Network error' };
    if (r?.ok) {
      setState('ok');
      setMsg('Message received. We’ll get back to you soon.');
      setV({ name: '', email: '', subject: '', message: '', company: '' });
    } else {
      setState('err');
      setErrors(d.fieldErrors || {});
      setMsg(d.error || 'Could not send your message');
    }
  };

  if (state === 'ok')
    return (
      <div className="border-2 border-ink p-8">
        <p className="t-display text-5xl">Thank you.</p>
        <p className="t-ui mt-3 text-ink/70">{msg}</p>
        <button className="t-micro link-u mt-6" onClick={() => setState('idle')}>Send another message</button>
      </div>
    );

  const F = ({ k, label, type = 'text', area = false }: { k: 'name' | 'email' | 'subject' | 'message'; label: string; type?: string; area?: boolean }) => (
    <div>
      <label htmlFor={`c-${k}`} className="field-label">{label}</label>
      {area ? (
        <textarea id={`c-${k}`} rows={7} value={v[k]} onChange={set(k)} className={cx('field resize-y', errors[k] && 'border-signal')} aria-invalid={!!errors[k]} />
      ) : (
        <input id={`c-${k}`} type={type} value={v[k]} onChange={set(k)} className={cx('field', errors[k] && 'border-signal')} aria-invalid={!!errors[k]} autoComplete={k === 'email' ? 'email' : k === 'name' ? 'name' : 'off'} />
      )}
      {errors[k] && <p className="t-micro mt-1 text-signal">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {F({ k: 'name', label: 'Name' })}
        {F({ k: 'email', label: 'Email', type: 'email' })}
      </div>
      {F({ k: 'subject', label: 'Subject (optional)' })}
      {F({ k: 'message', label: 'Message', area: true })}
      {/* honeypot */}
      <input type="text" name="company" value={v.company} onChange={set('company')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === 'err' && <p role="alert" className="t-micro bg-signal px-3 py-2 text-white">{msg}</p>}
      <button className="btn-ink" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
