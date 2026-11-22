'use client';
import { createContext, startTransition, useActionState, useContext, useRef } from 'react';
import { cx } from '@/lib/utils';

export type ActionState = { error?: string; ok?: string } | undefined;
type Action<S> = (prev: S, fd: FormData) => Promise<S>;

const Pending = createContext(false);

/**
 * Runs a server action without React 19's automatic form reset, so typed values survive validation errors.
 * Returns [state, onSubmit, pending].
 */
export function useKeepAction<S>(action: Action<S>, opts: { confirm?: string; resetOnSuccess?: boolean } = {}) {
  const [state, run, pending] = useActionState(action as unknown as (s: Awaited<S>, fd: FormData) => Promise<S>, undefined as Awaited<S>);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    const form = e.currentTarget;
    const fd = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(async () => {
      await run(fd);
      if (opts.resetOnSuccess) form.dataset.reset = String(Date.now());
    });
  };
  return [state, onSubmit, pending] as const;
}

export function PendingProvider({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <Pending.Provider value={pending}>{children}</Pending.Provider>;
}

export default function ActionForm({ action, children, className, resetOnSuccess = false, confirm }: { action: Action<ActionState>; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; confirm?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useKeepAction(async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r?.ok && resetOnSuccess) ref.current?.reset();
    return r;
  }, { confirm });
  return (
    <form ref={ref} onSubmit={onSubmit} className={className} noValidate={false}>
      <PendingProvider pending={pending}>{children}</PendingProvider>
      {state?.error && <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p role="status" className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className, variant = 'primary' }: { children: React.ReactNode; className?: string; variant?: 'primary' | 'ghost' | 'danger' }) {
  const pending = useContext(Pending);
  const base =
    variant === 'primary'
      ? 'bg-neutral-900 text-white hover:bg-[#E31B23]'
      : variant === 'danger'
        ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
        : 'border border-neutral-300 bg-white hover:border-neutral-900';
  return (
    <button type="submit" disabled={pending} className={cx('inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium disabled:opacity-50', base, className)}>
      {pending ? 'Working…' : children}
    </button>
  );
}
