import type { Metadata } from 'next';
import Link from 'next/link';
import Mascot from '@/components/Mascot';
import AdminNav from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/auth';
import { logoutAction } from '../actions/auth';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · THE 87TH CLUB' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-neutral-50 font-body text-neutral-900 lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-b border-neutral-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Mascot size={32} />
            <span className="font-cond text-sm font-bold uppercase leading-tight">The 87th Club<br /><span className="text-neutral-500">Admin</span></span>
          </Link>
          <Link href="/" target="_blank" className="text-xs text-neutral-500 hover:text-neutral-900">View store ↗</Link>
        </div>
        <AdminNav />
        <div className="hidden border-t border-neutral-200 px-4 py-4 text-xs text-neutral-500 lg:block">
          <p className="truncate">{admin.email}</p>
          <form action={logoutAction}>
            <button className="mt-2 underline hover:text-neutral-900">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex justify-end border-b border-neutral-200 bg-white px-4 py-2 text-xs lg:hidden">
          <form action={logoutAction}><button className="underline">Sign out</button></form>
        </div>
        <main className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
