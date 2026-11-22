'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { decimalToMinor } from '@/lib/money';
import { slugify } from '@/lib/utils';
import { storeImage } from '@/lib/images';
import { SETTING_DEFAULTS, type SettingKey } from '@/lib/settings';
import { fetchSource, reportToMarkdown, runImport, type ImportReport } from '@/lib/importer';
import type { ActionState } from '@/components/admin/ActionForm';

const done = (paths: string[]) => {
  for (const p of paths) revalidatePath(p);
  revalidatePath('/', 'layout');
};

// ------------------------------------------------------------------ collections
export async function saveCollectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = z
    .object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Title is required').max(120),
      slug: z.string().trim().max(90).optional(),
      description: z.string().trim().max(2000).optional(),
      sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
      launchAt: z.string().optional(),
      tz: z.coerce.number().int().min(-900).max(900).default(0),
    })
    .safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')));
  if (!p.success) return { error: p.error.issues[0].message };
  const slug = slugify(p.data.slug || p.data.title);
  const clash = await prisma.collection.findUnique({ where: { slug } });
  if (clash && clash.id !== p.data.id) return { error: `The URL "${slug}" is already used` };
  const isDrop = fd.get('isDrop') === 'on';
  // datetime-local has no zone: convert using the admin browser's offset (minutes)
  const launchAt = p.data.launchAt ? new Date(new Date(p.data.launchAt + 'Z').getTime() + p.data.tz * 60_000) : null;
  if (isDrop && !launchAt) return { error: 'A drop needs a launch date and time' };
  let imageUrl: string | undefined;
  const file = fd.get('image');
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = (await storeImage(Buffer.from(await file.arrayBuffer()), 'collections')).url;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  const data = { title: p.data.title, slug, description: p.data.description || null, sortOrder: p.data.sortOrder, isVisible: fd.get('isVisible') === 'on', isDrop, launchAt: isDrop ? launchAt : null, ...(imageUrl ? { imageUrl } : {}), ...(fd.get('removeImage') === 'on' ? { imageUrl: null } : {}) };
  const productIds = fd.getAll('products').map(String);
  const col = p.data.id ? await prisma.collection.update({ where: { id: p.data.id }, data }) : await prisma.collection.create({ data });
  await prisma.collectionProduct.deleteMany({ where: { collectionId: col.id, productId: { notIn: productIds } } });
  let pos = 0;
  for (const pid of productIds) {
    await prisma.collectionProduct.upsert({ where: { collectionId_productId: { collectionId: col.id, productId: pid } }, create: { collectionId: col.id, productId: pid, position: pos }, update: { position: pos } });
    pos++;
  }
  done(['/admin/collections']);
  if (!p.data.id) redirect(`/admin/collections/${col.id}?created=1`);
  return { ok: 'Collection saved.' };
}

export async function deleteCollectionAction(fd: FormData) {
  await requireAdmin();
  await prisma.collection.delete({ where: { id: String(fd.get('id')) } });
  done(['/admin/collections']);
  redirect('/admin/collections');
}

// ------------------------------------------------------------------ categories
export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id') || '') || undefined;
  const name = String(fd.get('name') || '').trim();
  if (!name) return { error: 'Name is required' };
  const slug = slugify(String(fd.get('slug') || '') || name);
  const clash = await prisma.category.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return { error: `A category with URL "${slug}" exists` };
  const data = { name, slug, description: String(fd.get('description') || '').trim() || null, sortOrder: Number(fd.get('sortOrder')) || 0 };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  done(['/admin/categories']);
  return { ok: id ? 'Category updated.' : `Category “${name}” created.` };
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  await prisma.category.delete({ where: { id: String(fd.get('id')) } });
  done(['/admin/categories']);
}

// ------------------------------------------------------------------ discounts
export async function saveDiscountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = z
    .object({
      code: z.string().trim().min(3, 'Code must be at least 3 characters').max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
      type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
      value: z.string().trim().min(1, 'Enter a value'),
      minSubtotal: z.string().trim().optional(),
      usageLimit: z.string().trim().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  let value: number;
  try {
    value = p.data.type === 'PERCENTAGE' ? Math.round(Number(p.data.value)) : decimalToMinor(p.data.value)!;
  } catch {
    return { error: 'Value must be a number' };
  }
  if (!Number.isFinite(value) || value <= 0 || (p.data.type === 'PERCENTAGE' && value > 100)) return { error: 'Enter a valid value (percentage 1–100)' };
  const code = p.data.code.toUpperCase();
  if (await prisma.discount.findUnique({ where: { code } })) return { error: 'That code already exists' };
  await prisma.discount.create({
    data: {
      code,
      type: p.data.type,
      value,
      minSubtotal: p.data.minSubtotal ? decimalToMinor(p.data.minSubtotal) : null,
      usageLimit: p.data.usageLimit ? Number(p.data.usageLimit) : null,
      startsAt: p.data.startsAt ? new Date(p.data.startsAt) : null,
      endsAt: p.data.endsAt ? new Date(p.data.endsAt) : null,
    },
  });
  done(['/admin/discounts']);
  return { ok: `Discount ${code} created.` };
}

export async function toggleDiscountAction(fd: FormData) {
  await requireAdmin();
  const d = await prisma.discount.findUnique({ where: { id: String(fd.get('id')) } });
  if (!d) return;
  if (fd.get('op') === 'delete') await prisma.discount.delete({ where: { id: d.id } });
  else await prisma.discount.update({ where: { id: d.id }, data: { active: !d.active } });
  done(['/admin/discounts']);
}

// ------------------------------------------------------------------ shipping
export async function saveShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get('id') || '') || undefined;
  const name = String(fd.get('name') || '').trim();
  if (!name) return { error: 'Name is required' };
  let price: number | null;
  try {
    price = decimalToMinor(String(fd.get('price') ?? ''));
  } catch {
    return { error: 'Price must be a number' };
  }
  if (price === null) return { error: 'Enter a price (0 for free delivery)' };
  const data = { name, description: String(fd.get('description') || '').trim() || null, price, sortOrder: Number(fd.get('sortOrder')) || 0, active: fd.get('active') === 'on' };
  if (id) await prisma.shippingMethod.update({ where: { id }, data });
  else await prisma.shippingMethod.create({ data });
  done(['/admin/shipping']);
  return { ok: 'Delivery option saved.' };
}

export async function deleteShippingAction(fd: FormData) {
  await requireAdmin();
  await prisma.shippingMethod.delete({ where: { id: String(fd.get('id')) } });
  done(['/admin/shipping']);
}

// ------------------------------------------------------------------ settings
export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  for (const key of keys) {
    const f = fd.get(`${key}__file`);
    let value: string | null = null;
    if (f instanceof File && f.size > 0) {
      try {
        value = (await storeImage(Buffer.from(await f.arrayBuffer()), 'site')).url;
      } catch (e) {
        return { error: `${key}: ${(e as Error).message}` };
      }
    } else if (fd.get(`${key}__clear`) === 'on') value = '';
    else if (fd.has(key)) value = String(fd.get(key) ?? '').slice(0, 20000);
    if (value === null) continue;
    if (['instagram', 'tiktok', 'x', 'youtube'].includes(key) && value && !/^https?:\/\//.test(value)) return { error: `${key} must be a full link starting with https://` };
    if (key === 'supportEmail' && value && !z.string().email().safeParse(value).success) return { error: 'Support email is not valid' };
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  revalidatePath('/', 'layout');
  return { ok: 'Settings saved.' };
}

// ------------------------------------------------------------------ messages
export async function messageAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  if (fd.get('op') === 'delete') await prisma.contactMessage.delete({ where: { id } });
  else await prisma.contactMessage.update({ where: { id }, data: { handled: fd.get('op') === 'handled' } });
  revalidatePath('/admin/messages');
}

export async function deleteSubscriberAction(fd: FormData) {
  await requireAdmin();
  await prisma.newsletterSubscriber.delete({ where: { id: String(fd.get('id')) } });
  revalidatePath('/admin/subscribers');
}

// ------------------------------------------------------------------ import
type ImportState = { error?: string; ok?: string; report?: ImportReport } | undefined;
export async function importAction(_: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const url = String(fd.get('url') || '').trim();
  const file = fd.get('file');
  let text: string;
  let source: string;
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > 20 * 1024 * 1024) return { error: 'CSV is larger than 20 MB' };
      text = await file.text();
      source = `upload:${file.name}`;
    } else if (url) {
      if (!/^https:\/\//.test(url)) return { error: 'Enter an https:// link' };
      text = await fetchSource(url);
      source = url;
    } else return { error: 'Upload a CSV file or paste a Google Sheets link' };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const report = await runImport(prisma, text, source, { dryRun: fd.get('dryRun') === 'on', publish: fd.get('publish') === 'on', downloadImages: fd.get('noImages') !== 'on' });
  if (!report.dryRun) {
    await prisma.importRun.create({ data: { source, report: report as object } });
    try {
      const dir = path.resolve('import-reports');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `import-${report.startedAt.replace(/[:.]/g, '-')}.md`), reportToMarkdown(report));
    } catch {
      /* read-only filesystem in some hosts — report is still stored in the database */
    }
  }
  revalidatePath('/', 'layout');
  return { ok: report.dryRun ? 'Dry run finished — nothing was written.' : 'Import finished.', report };
}
