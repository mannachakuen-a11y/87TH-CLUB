import Link from 'next/link';
import { cx } from '@/lib/utils';

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-cond text-3xl font-bold uppercase tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-neutral-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cx('rounded border border-neutral-200 bg-white', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 font-cond text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded border border-neutral-200 bg-white p-4 hover:border-neutral-400">{inner}</Link>
  ) : (
    <div className="rounded border border-neutral-200 bg-white p-4">{inner}</div>
  );
}

const BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-neutral-100 text-neutral-700',
  ARCHIVED: 'bg-neutral-200 text-neutral-500',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-red-100 text-red-700',
  SUCCESS: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-700',
  ABANDONED: 'bg-neutral-100 text-neutral-600',
  UNFULFILLED: 'bg-amber-100 text-amber-800',
  RETURNED: 'bg-red-100 text-red-700',
};

export function Badge({ value }: { value: string }) {
  return <span className={cx('inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold uppercase', BADGE[value] ?? 'bg-neutral-100')}>{value.replace(/_/g, ' ').toLowerCase()}</span>;
}

export const input = 'w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900';
export const label = 'mb-1 block text-xs font-medium text-neutral-600';
export const btn = 'inline-flex items-center justify-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-[#E31B23] disabled:opacity-40';
export const btnGhost = 'inline-flex items-center justify-center rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:border-neutral-900 disabled:opacity-40';
export const btnDanger = 'inline-flex items-center justify-center rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50';
export const th = 'border-b border-neutral-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500';
export const td = 'border-b border-neutral-100 px-3 py-2.5 align-middle text-sm';

export function Field({ name, title, defaultValue, type = 'text', required, placeholder, hint, step, min }: { name: string; title: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; hint?: string; step?: string; min?: number }) {
  return (
    <div>
      <label htmlFor={name} className={label}>{title}{required && ' *'}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} step={step} min={min} className={input} />
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-neutral-500">{children}</p>;
}
