import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const ADMIN_COOKIE = 'club_admin';
const MAX_AGE = 60 * 60 * 12; // 12h

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set (32+ chars)');
  return new TextEncoder().encode(s);
}

export async function createAdminSession(adminId: string) {
  const token = await new SignJWT({ sub: adminId, typ: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function verifyAdminToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== 'admin' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** Returns the signed-in admin or null. Always re-checks the database. */
export async function getAdmin() {
  const id = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!id) return null;
  return prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Simple in-memory login throttle (per process). Use a shared store if you run several instances.
const attempts = new Map<string, { n: number; until: number }>();
export function throttle(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= 5) return false;
  if (!a || a.until <= now) attempts.set(key, { n: 1, until: now + 15 * 60_000 });
  else a.n++;
  return true;
}
export function clearThrottle(key: string) {
  attempts.delete(key);
}
