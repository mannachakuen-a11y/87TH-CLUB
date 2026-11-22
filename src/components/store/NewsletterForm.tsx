'use client';
import { useState } from 'react';
import { cx } from '@/lib/utils';

export default function NewsletterForm({ dark = false, source = 'footer', cta = 'Join' }: { dark?: boolean; source?: string; cta?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    try {
      const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, source }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not subscribe');
      setState('ok');
      setMsg(d.message || 'You’re in the Club.');
      setEmail('');
    } catch (err) {
      setState('err');
      setMsg((err as Error).message);
    }
  };
  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className={cx('flex border-b-2', dark ? 'border-paper' : 'border-ink')}>
        <label htmlFor={`nl-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`nl-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="EMAIL ADDRESS"
          autoComplete="email"
          className={cx('t-ui min-w-0 flex-1 bg-transparent py-3 outline-none', dark ? 'text-paper placeholder:text-paper/40' : 'placeholder:text-ink/35')}
        />
        <button className={cx('t-ui px-2 transition-colors hover:text-signal disabled:opacity-40')} disabled={state === 'busy'}>
          {state === 'busy' ? '…' : cta}
        </button>
      </div>
      <p role="status" className={cx('t-micro mt-2 min-h-[1.2em]', state === 'err' ? (dark ? 'text-paper underline' : 'text-signal') : dark ? 'text-paper/80' : 'text-ink/60')}>
        {state === 'ok' || state === 'err' ? msg : ''}
      </p>
    </form>
  );
}
