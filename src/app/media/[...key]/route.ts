import { readLocal } from '@/lib/storage';

const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif', gif: 'image/gif' };

/** Serves locally stored uploads (used when no S3 bucket is configured). */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (!TYPES[ext]) return new Response('Not found', { status: 404 });
  try {
    const buf = await readLocal(key);
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': TYPES[ext], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
