'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { decimalToMinor } from '@/lib/money';
import { slugify } from '@/lib/utils';
import { storeImage, deleteStoredImage } from '@/lib/images';
import type { ActionState } from '@/components/admin/ActionForm';

const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().trim().max(40).optional().default(''),
  color: z.string().trim().max(60).optional().default(''),
  sku: z.string().trim().max(80).optional().default(''),
  price: z.string().trim().max(20).optional().default(''),
  quantity: z.string().trim().max(10).optional().default(''),
  lowStockThreshold: z.string().trim().max(5).optional().default('3'),
});

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(160),
  slug: z.string().trim().max(90).optional(),
  description: z.string().trim().max(10000).optional(),
  details: z.string().trim().max(10000).optional(),
  price: z.string().trim().max(20).optional(),
  compareAtPrice: z.string().trim().max(20).optional(),
  sku: z.string().trim().max(80).optional(),
  categoryId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = productSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([k]) => !['variants', 'collections', 'featured', 'newArrival'].includes(k))));
  if (!p.success) return { error: p.error.issues[0].message };
  let variants: z.infer<typeof variantSchema>[];
  try {
    variants = z.array(variantSchema).parse(JSON.parse(String(fd.get('variants') || '[]')));
  } catch {
    return { error: 'Variant data is invalid' };
  }
  if (!variants.length) return { error: 'Add at least one variant (use one row with no size/colour for single-option products).' };

  let price: number | null, compareAtPrice: number | null;
  try {
    price = decimalToMinor(p.data.price);
    compareAtPrice = decimalToMinor(p.data.compareAtPrice);
  } catch {
    return { error: 'Prices must be numbers' };
  }
  if (p.data.status === 'ACTIVE' && price === null) return { error: 'Set a price before publishing.' };

  const combos = new Set<string>();
  const rows: { id?: string; size: string | null; color: string | null; sku: string | null; price: number | null; quantity: number | null; lowStockThreshold: number }[] = [];
  for (const v of variants) {
    const key = `${v.size.toLowerCase()}|${v.color.toLowerCase()}`;
    if (combos.has(key)) return { error: `Duplicate variant: ${[v.size, v.color].filter(Boolean).join(' / ') || 'default'}` };
    combos.add(key);
    if (v.quantity !== '' && !/^\d+$/.test(v.quantity)) return { error: 'Stock must be a whole number (or empty if unknown)' };
    let vp: number | null;
    try {
      vp = decimalToMinor(v.price);
    } catch {
      return { error: 'Variant prices must be numbers' };
    }
    rows.push({ id: v.id, size: v.size || null, color: v.color || null, sku: v.sku || null, price: vp, quantity: v.quantity === '' ? null : Number(v.quantity), lowStockThreshold: Number(v.lowStockThreshold) || 3 });
  }
  const skus = rows.map((r) => r.sku).filter(Boolean) as string[];
  if (new Set(skus).size !== skus.length) return { error: 'Variant SKUs must be unique' };
  if (skus.length) {
    const clash = await prisma.productVariant.findFirst({ where: { sku: { in: skus }, ...(p.data.id ? { productId: { not: p.data.id } } : {}) } });
    if (clash) return { error: `SKU ${clash.sku} is already used by another product` };
  }

  const slug = slugify(p.data.slug || p.data.title);
  const slugOwner = await prisma.product.findUnique({ where: { slug } });
  if (slugOwner && slugOwner.id !== p.data.id) return { error: `The URL "${slug}" is already used by another product` };

  const collectionIds = fd.getAll('collections').map(String);
  const data = {
    title: p.data.title,
    slug,
    description: p.data.description || null,
    details: p.data.details || null,
    price,
    compareAtPrice,
    sku: p.data.sku || null,
    categoryId: p.data.categoryId || null,
    status: p.data.status,
    featured: fd.get('featured') === 'on',
    newArrival: fd.get('newArrival') === 'on',
    seoTitle: p.data.seoTitle || null,
    seoDescription: p.data.seoDescription || null,
  };

  const id = await prisma.$transaction(async (tx) => {
    const existing = p.data.id ? await tx.product.findUnique({ where: { id: p.data.id } }) : null;
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: { ...data, publishedAt: data.status === 'ACTIVE' && !existing.publishedAt ? new Date() : existing.publishedAt } })
      : await tx.product.create({ data: { ...data, publishedAt: data.status === 'ACTIVE' ? new Date() : null } });
    const keepIds = rows.map((r) => r.id).filter(Boolean) as string[];
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });
    let position = 0;
    for (const r of rows) {
      const vdata = { size: r.size, color: r.color, sku: r.sku, price: r.price, position: position++ };
      const variant = r.id
        ? await tx.productVariant.update({ where: { id: r.id, productId: product.id }, data: vdata })
        : await tx.productVariant.create({ data: { ...vdata, productId: product.id } });
      const inv = await tx.inventory.findUnique({ where: { variantId: variant.id } });
      if (!inv) {
        const created = await tx.inventory.create({ data: { variantId: variant.id, quantity: r.quantity, lowStockThreshold: r.lowStockThreshold } });
        if (r.quantity) await tx.inventoryMovement.create({ data: { inventoryId: created.id, change: r.quantity, reason: 'initial stock (admin)' } });
      } else {
        if (inv.quantity !== r.quantity) await tx.inventoryMovement.create({ data: { inventoryId: inv.id, change: (r.quantity ?? 0) - (inv.quantity ?? 0), reason: 'admin adjustment' } });
        await tx.inventory.update({ where: { id: inv.id }, data: { quantity: r.quantity, lowStockThreshold: r.lowStockThreshold } });
      }
    }
    await tx.collectionProduct.deleteMany({ where: { productId: product.id, collectionId: { notIn: collectionIds } } });
    for (const cid of collectionIds) {
      await tx.collectionProduct.upsert({ where: { collectionId_productId: { collectionId: cid, productId: product.id } }, create: { collectionId: cid, productId: product.id }, update: {} });
    }
    return { id: product.id, created: !existing };
  });
  revalidatePath('/', 'layout');
  if (id.created) redirect(`/admin/products/${id.id}?created=1`);
  return { ok: 'Product saved.' };
}

export async function uploadImagesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const productId = String(fd.get('productId'));
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { images: true } });
  if (!product) return { error: 'Product not found' };
  const files = fd.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: 'Choose one or more images' };
  let position = product.images.reduce((m, i) => Math.max(m, i.position + 1), 0);
  const failed: string[] = [];
  for (const f of files) {
    try {
      const stored = await storeImage(Buffer.from(await f.arrayBuffer()), `products/${product.id}`);
      await prisma.productImage.create({ data: { productId, url: stored.url, srcset: stored.srcset, width: stored.width, height: stored.height, position: position++, alt: product.title, sourceUrl: `upload:${f.name}` } });
    } catch (e) {
      failed.push(`${f.name}: ${(e as Error).message}`);
    }
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/', 'layout');
  if (failed.length) return { error: `Some images failed — ${failed.join('; ')}` };
  return { ok: `${files.length} image${files.length > 1 ? 's' : ''} uploaded.` };
}

export async function imageAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('imageId'));
  const op = String(fd.get('op'));
  const img = await prisma.productImage.findUnique({ where: { id } });
  if (!img) return;
  if (op === 'delete') {
    await prisma.productImage.delete({ where: { id } });
    await deleteStoredImage(img);
  } else if (op === 'alt') {
    await prisma.productImage.update({ where: { id }, data: { alt: String(fd.get('alt') || '').slice(0, 200) || null } });
  } else if (op === 'up' || op === 'down' || op === 'first') {
    const all = await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    const i = all.findIndex((x) => x.id === id);
    const j = op === 'first' ? 0 : op === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < all.length && i !== j) {
      const [moved] = all.splice(i, 1);
      all.splice(j, 0, moved);
      await prisma.$transaction(all.map((x, k) => prisma.productImage.update({ where: { id: x.id }, data: { position: k } })));
    }
  }
  revalidatePath(`/admin/products/${img.productId}`);
  revalidatePath('/', 'layout');
}

export async function deleteProductAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) redirect('/admin/products');
  await prisma.product.delete({ where: { id } });
  for (const img of product.images) await deleteStoredImage(img);
  revalidatePath('/', 'layout');
  redirect('/admin/products?deleted=1');
}

export async function setProductStatusAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  const status = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).parse(fd.get('status'));
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  if (status === 'ACTIVE' && product.price === null) return; // cannot publish without a price
  await prisma.product.update({ where: { id }, data: { status, publishedAt: status === 'ACTIVE' && !product.publishedAt ? new Date() : product.publishedAt } });
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
}
