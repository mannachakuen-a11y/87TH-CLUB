import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Mascot from '@/components/Mascot';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { input, label } from '@/components/admin/ui';
import { getAdmin } from '@/lib/auth';
import { loginAction } from '../actions/auth';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdmin()) redirect('/admin');
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm rounded border border-neutral-200 bg-white p-8">
        <div className="mb-6 flex items-center gap-3">
          <Mascot size={44} priority />
          <div>
            <p className="font-cond text-lg font-bold uppercase leading-none">The 87th Club</p>
            <p className="text-xs text-neutral-500">Store admin</p>
          </div>
        </div>
        <ActionForm action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? '/admin'} />
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className={input} />
          </div>
          <div>
            <label htmlFor="password" className={label}>Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
          </div>
          <Submit className="w-full">Sign in</Submit>
        </ActionForm>
      </div>
    </div>
  );
}
