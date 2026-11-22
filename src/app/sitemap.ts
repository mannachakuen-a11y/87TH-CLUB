import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { visibleProductWhere } from '@/lib/catalog';
import { siteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, categories] = await Promise.all([
    prisma.product.findMany({ where: visibleProductWhere(), select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { isVisible: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { products: { some: visibleProductWhere() } }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: siteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: siteUrl('/shop'), changeFrequency: 'daily', priority: 0.9 },
    { url: siteUrl('/collections'), changeFrequency: 'weekly', priority: 0.7 },
    { url: siteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    { url: siteUrl('/contact'), changeFrequency: 'monthly', priority: 0.4 },
    ...categories.map((c) => ({ url: siteUrl(`/shop?category=${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
    ...collections.map((c) => ({ url: siteUrl(`/collections/${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: siteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
  ];
}
