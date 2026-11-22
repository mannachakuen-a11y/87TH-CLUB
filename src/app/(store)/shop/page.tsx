import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShopFilters from '@/components/store/ShopFilters';
import Pagination from '@/components/store/Pagination';
import { ProductGrid } from '@/components/store/ProductCard';
import { getFilterFacets, listProducts, type ListParams } from '@/lib/catalog';
import { prisma } from '@/lib/db';

type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.category) {
    const c = await prisma.category.findUnique({ where: { slug: sp.category } });
    if (c) return { title: c.name, description: c.description ?? `Shop ${c.name} from THE 87TH CLUB.`, alternates: { canonical: `/shop?category=${c.slug}` } };
  }
  return { title: sp.q ? `Search: ${sp.q}` : 'Shop all', description: 'Shop every piece from THE 87TH CLUB.', alternates: { canonical: '/shop' } };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params: ListParams = {
    q: sp.q,
    category: sp.category,
    size: sp.size,
    color: sp.color,
    availability: sp.availability === 'in-stock' ? 'in-stock' : '',
    sort: (sp.sort as ListParams['sort']) || 'newest',
    page: Number(sp.page) || 1,
  };
  const [{ items, total, page, pages }, facets] = await Promise.all([listProducts(params), getFilterFacets()]);
  const category = sp.category ? facets.categories.find((c) => c.slug === sp.category) : null;
  return (
    <div className="wrap pb-10 pt-8">
      <h1 className="t-display mb-6 text-[18vw] sm:text-9xl">{category ? category.name : sp.q ? 'Search' : 'Shop all'}</h1>
      <Suspense>
        <ShopFilters facets={facets} total={total} />
      </Suspense>
      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <div className="py-24 text-center">
          <p className="t-display text-5xl">{total === 0 && !sp.q && !sp.category && !sp.size && !sp.color ? 'Nothing here yet.' : 'No matches.'}</p>
          <p className="t-ui mt-3 text-ink/60">{sp.q || sp.category || sp.size || sp.color ? 'Try removing a filter.' : 'New pieces land here as soon as they drop.'}</p>
        </div>
      )}
      <Pagination page={page} pages={pages} basePath="/shop" params={sp} />
    </div>
  );
}
