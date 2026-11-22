import path from 'node:path';
import fs from 'node:fs/promises';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Image storage.
 * - Default: local disk under UPLOAD_DIR, served by /media/[...key] with long cache headers.
 * - Production: any S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces) when S3_BUCKET is set.
 */
const useS3 = !!process.env.S3_BUCKET;
let s3: S3Client | null = null;
function client() {
  if (!s3)
    s3 = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY_ID
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' }
        : undefined,
    });
  return s3;
}

export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR || './storage');
}

function safeKey(key: string) {
  const k = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (k.split('/').some((p) => p === '..' || p === '')) throw new Error('Invalid storage key');
  return k;
}

export function publicUrl(key: string) {
  const k = safeKey(key);
  if (useS3 && process.env.S3_PUBLIC_BASE_URL) return `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${k}`;
  return `/media/${k}`;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const k = safeKey(key);
  if (useS3) {
    await client().send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: k, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
  } else {
    const file = path.join(uploadDir(), k);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  return publicUrl(k);
}

export async function deleteByUrl(url: string) {
  try {
    if (url.startsWith('/media/')) {
      await fs.unlink(path.join(uploadDir(), safeKey(url.slice('/media/'.length))));
    } else if (useS3 && process.env.S3_PUBLIC_BASE_URL && url.startsWith(process.env.S3_PUBLIC_BASE_URL)) {
      const key = url.slice(process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '').length + 1);
      await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: safeKey(key) }));
    }
  } catch {
    /* already gone */
  }
}

export async function readLocal(key: string) {
  return fs.readFile(path.join(uploadDir(), safeKey(key)));
}
