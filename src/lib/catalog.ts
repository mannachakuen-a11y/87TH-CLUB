import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';

export const PAGE_SIZE = 24;

/** A product is visible on the storefront when it is ACTIVE and not part of a drop that has not launched yet. */
export function visibleProductWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    collections: { none: { collection: { isDrop: true, launchAt: { gt: now } } } },
  };
}

export const cardInclude = {
  images: { orderBy: { position: 'asc' }, take: 2 },
  variants: { orderBy: { position: 'asc' }, include: { inventory: true } },
  category: true,
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function variantAvailable(v: { inventory: { quantity: number | null } | null }) {
  return (v.inventory?.quantity ?? 0) > 0;
}

export function productSoldOut(p: { price: number | null; variants: { inventory: { quantity: number | null } | null }[] }) {
  return p.price === null || p.variants.length === 0 || !p.variants.some(variantAvailable);
}

export function uniqueOptions(p: { variants: { size: string | null; color: string | null }[] }) {
  const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))] as string[];
  return { sizes, colors };
}

export type ListParams = {
  q?: string;
  category?: string;
  collection?: string;
  size?: string;
  color?: string;
  availability?: 'in-stock' | '';
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'featured' | '';
  page?: number;
};

export async function listProducts(params: ListParams) {
  const now = new Date();
  const and: Prisma.ProductWhereInput[] = [visibleProductWhere(now)];
  const q = params.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
        { variants: { some: { color: { contains: q, mode: 'insensitive' } } } },
      ],
    });
  }
  if (params.category) and.push({ category: { slug: params.category } });
  if (params.collection) and.push({ collections: { some: { collection: { slug: params.collection, isVisible: true } } } });
  if (params.size) and.push({ variants: { some: { size: { equals: params.size, mode: 'insensitive' } } } });
  if (params.color) and.push({ variants: { some: { color: { equals: params.color, mode: 'insensitive' } } } });
  if (params.availability === 'in-stock') and.push({ price: { not: null }, variants: { some: { inventory: { quantity: { gt: 0 } } } } });

  const where: Prisma.ProductWhereInput = { AND: and };
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
  switch (params.sort) {
    case 'price-asc':
      orderBy = [{ price: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
      break;
    case 'price-desc':
      orderBy = [{ price: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      break;
    case 'best-selling':
      orderBy = [{ orderItems: { _count: 'desc' } }, { createdAt: 'desc' }];
      break;
    case 'featured':
      orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
      break;
  }
  const page = Math.max(1, params.page || 1);
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, include: cardInclude, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFilterFacets() {
  const now = new Date();
  const [categories, variants] = await Promise.all([
    prisma.category.findMany({ where: { products: { some: visibleProductWhere(now) } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.productVariant.findMany({ where: { product: visibleProductWhere(now) }, select: { size: true, color: true } }),
  ]);
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', 'OS', 'ONE SIZE'];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  sizes.sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  const colors = ([...new Set(variants.map((v) => v.color).filter(Boolean))] as string[]).sort();
  return { categories, sizes, colors };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...visibleProductWhere() },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { position: 'asc' }, include: { inventory: true } },
      category: true,
      collections: { include: { collection: true } },
    },
  });
}

export async function getRelatedProducts(product: { id: string; categoryId: string | null }, take = 4) {
  const base = visibleProductWhere();
  const related = await prisma.product.findMany({
    where: { AND: [base, { id: { not: product.id } }, product.categoryId ? { categoryId: product.categoryId } : {}] },
    include: cardInclude,
    orderBy: { createdAt: 'desc' },
    take,
  });
  if (related.length >= take) return related;
  const more = await prisma.product.findMany({
    where: { AND: [base, { id: { notIn: [product.id, ...related.map((r) => r.id)] } }] },
    include: cardInclude,
    orderBy: { createdAt: 'desc' },
    take: take - related.length,
  });
  return [...related, ...more];
}

/** Best sellers are computed from real paid orders only — never invented. */
export async function getBestSellers(take = 8) {
  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { productId: { not: null }, order: { paymentStatus: 'SUCCESS' } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: take * 2,
  });
  const ids = grouped.map((g) => g.productId!).filter(Boolean);
  if (!ids.length) return [];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, ...visibleProductWhere() }, include: cardInclude });
  return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, take) as CardProduct[];
}

export async function getNextDrop() {
  return prisma.collection.findFirst({
    where: { isDrop: true, isVisible: true, launchAt: { gt: new Date() } },
    orderBy: { launchAt: 'asc' },
  });
}
