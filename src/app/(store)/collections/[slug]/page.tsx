import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { getFilterFacets, listProducts, type ListParams } from '@/lib/catalog';
import { ProductGrid } from '@/components/store/ProductCard';
import ShopFilters from '@/components/store/ShopFilters';
import Pagination from '@/components/store/Pagination';
import Countdown from '@/components/store/Countdown';
import NewsletterForm from '@/components/store/NewsletterForm';

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.collection.findFirst({ where: { slug, isVisible: true } });
  if (!c) return { title: 'Not found' };
  return { title: c.title, description: c.description ?? `${c.title} — THE 87TH CLUB`, alternates: { canonical: `/collections/${c.slug}` }, openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = await prisma.collection.findFirst({ where: { slug, isVisible: true } });
  if (!c) notFound();
  if (c.isDrop && c.launchAt && c.launchAt > new Date()) {
    return (
      <section className="bg-ink text-paper">
        <div className="wrap flex min-h-[80vh] flex-col items-center justify-center gap-8 py-20 text-center">
          <p className="t-micro text-paper/60">Drop</p>
          <h1 className="t-display text-[16vw] sm:text-[9rem]">[{c.title}]</h1>
          {c.description && <p className="max-w-lg text-paper/80">{c.description}</p>}
          <Countdown to={c.launchAt.toISOString()} />
          <div className="w-full max-w-md">
            <NewsletterForm dark source={`drop:${c.slug}`} cta="Sign up" />
          </div>
        </div>
      </section>
    );
  }
  const lp: ListParams = { collection: c.slug, size: sp.size, color: sp.color, category: sp.category, q: sp.q, availability: sp.availability === 'in-stock' ? 'in-stock' : '', sort: (sp.sort as ListParams['sort']) || 'featured', page: Number(sp.page) || 1 };
  const [{ items, total, page, pages }, facets] = await Promise.all([listProducts(lp), getFilterFacets()]);
  return (
    <div>
      {c.imageUrl && (
        <div className="relative h-[55vh] min-h-[320px] overflow-hidden bg-ink grain">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover opacity-90" fetchPriority="high" />
        </div>
      )}
      <div className="wrap pb-10 pt-8">
        <div className="mb-6 grid gap-4 md:grid-cols-12 md:items-end">
          <h1 className="t-display text-[17vw] sm:text-9xl md:col-span-8">{c.title}</h1>
          {c.description && <p className="max-w-md text-[15px] leading-relaxed text-ink/80 md:col-span-4 md:justify-self-end">{c.description}</p>}
        </div>
        <Suspense>
          <ShopFilters facets={facets} total={total} />
        </Suspense>
        {items.length ? <ProductGrid products={items} /> : <p className="t-ui py-24 text-center text-ink/60">No products in this collection yet.</p>}
        <Pagination page={page} pages={pages} basePath={`/collections/${c.slug}`} params={sp} />
      </div>
    </div>
  );
}
