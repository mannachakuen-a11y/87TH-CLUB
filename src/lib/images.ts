import sharp from 'sharp';
import { putObject, deleteByUrl } from './storage';
import { randomToken } from './utils';

export const IMAGE_WIDTHS = [480, 960, 1600] as const;
const MAX_BYTES = 25 * 1024 * 1024;

export type StoredImage = { url: string; srcset: Record<string, string>; width: number; height: number };

/**
 * Validate and optimise an image: keeps the original aspect ratio, never upscales,
 * writes WebP renditions for responsive delivery and strips metadata (EXIF/GPS).
 */
export async function storeImage(buffer: Buffer, folder: string): Promise<StoredImage> {
  if (buffer.length > MAX_BYTES) throw new Error('Image is larger than 25 MB');
  const img = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height || !['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif'].includes(meta.format || '')) {
    throw new Error('Unsupported image file');
  }
  // dimensions after EXIF rotation
  const rotated = meta.orientation && meta.orientation >= 5;
  const w = rotated ? meta.height : meta.width;
  const h = rotated ? meta.width : meta.height;
  const id = randomToken(9);
  const srcset: Record<string, string> = {};
  let master = '';
  const widths: number[] = [...IMAGE_WIDTHS.filter((x) => x < w), ...(w <= 1600 ? [w] : [])];
  const unique = [...new Set(widths.length ? widths : [w])].sort((a, b) => a - b);
  for (const width of unique) {
    const out = await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    const url = await putObject(`${folder}/${id}-${width}.webp`, out, 'image/webp');
    srcset[String(width)] = url;
    master = url;
  }
  return { url: master, srcset, width: w, height: h };
}

export async function deleteStoredImage(image: { url: string; srcset: unknown }) {
  const urls = new Set<string>([image.url]);
  if (image.srcset && typeof image.srcset === 'object') for (const u of Object.values(image.srcset as Record<string, string>)) urls.add(u);
  await Promise.all([...urls].map(deleteByUrl));
}
