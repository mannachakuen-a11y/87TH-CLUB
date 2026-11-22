import 'server-only';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ZodError, ZodSchema } from 'zod';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fieldErrors(e: ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? 'form');
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ data: T } | { error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: json({ error: 'Invalid request body' }, 400) };
  }
  const r = schema.safeParse(body);
  if (!r.success) return { error: json({ error: 'Please check the highlighted fields', fieldErrors: fieldErrors(r.error) }, 422) };
  return { data: r.data };
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Basic per-IP rate limiting (per server instance). */
export async function rateLimit(name: string, limit: number, windowMs: number) {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'local';
  const key = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= limit;
}

/** Reject cross-site POSTs to JSON endpoints (defence in depth on top of SameSite cookies). */
export async function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
