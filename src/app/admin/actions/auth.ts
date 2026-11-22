'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkPassword, clearThrottle, createAdminSession, destroyAdminSession, hashPassword, requireAdmin, throttle } from '@/lib/auth';
import type { ActionState } from '@/components/admin/ActionForm';

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const ip = ((await headers()).get('x-forwarded-for') || 'local').split(',')[0];
  const key = `${ip}:${email}`;
  if (!throttle(key)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const admin = email ? await prisma.adminUser.findUnique({ where: { email } }) : null;
  // constant-ish time: always run a bcrypt compare
  const ok = await checkPassword(password, admin?.passwordHash ?? '$2b$12$XF8JYeza5pPhkcVdUwNrWOlAhP5UyUCCDhnvdB5iU83JDGiy.kUPK');
  if (!admin || !ok) return { error: 'Email or password is incorrect.' };
  clearThrottle(key);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession(admin.id);
  const next = String(fd.get('next') || '/admin');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect('/admin/login');
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const current = String(fd.get('current') || '');
  const next = String(fd.get('next') || '');
  if (next.length < 10) return { error: 'New password must be at least 10 characters.' };
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await checkPassword(current, user.passwordHash))) return { error: 'Current password is incorrect.' };
  await prisma.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: 'Password updated.' };
}

export async function createAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  if (me.role !== 'OWNER') return { error: 'Only owners can add admins.' };
  const p = z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().max(80).optional(), password: z.string().min(10), role: z.enum(['OWNER', 'STAFF']) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: 'Enter a valid email and a password of at least 10 characters.' };
  if (await prisma.adminUser.findUnique({ where: { email: p.data.email } })) return { error: 'An admin with this email already exists.' };
  await prisma.adminUser.create({ data: { email: p.data.email, name: p.data.name || null, role: p.data.role, passwordHash: await hashPassword(p.data.password) } });
  return { ok: `Admin ${p.data.email} created.` };
}

export async function deleteAdminAction(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get('id'));
  if (me.role !== 'OWNER' || id === me.id) return;
  await prisma.adminUser.delete({ where: { id } });
  redirect('/admin/settings');
}
