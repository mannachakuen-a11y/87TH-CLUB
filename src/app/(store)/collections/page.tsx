import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { visibleProductWhere } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Collections', description: 'Collections and drops from THE 87TH CLUB.' };

export default async function CollectionsPage() {
  const where = visibleProductWhere();
  const collections = await prisma.collection.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { products: { where: { product: where } } } },
      products: { where: { product: where }, take: 1, orderBy: { position: 'asc' }, include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } } },
    },
  });
  return (
    <div className="wrap pb-10 pt-8">
      <h1 className="t-display mb-10 text-[18vw] sm:text-9xl">Collections</h1>
      {collections.length === 0 ? (
        <p className="t-ui py-20 text-center text-ink/60">No collections published yet.</p>
      ) : (
        <ul className="border-t-2 border-ink">
          {collections.map((c, i) => {
            const img = c.imageUrl || c.products[0]?.product.images[0]?.url;
            const upcoming = c.isDrop && c.launchAt && c.launchAt > new Date();
            return (
              <li key={c.id} className="border-b border-ink/15">
                <Link href={`/collections/${c.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-8">
                  <span className="t-micro w-8 text-ink/40">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t-display text-5xl transition-colors group-hover:text-signal sm:text-8xl">{c.title}</span>
                  <span className="flex items-center gap-4">
                    <span className="t-micro hidden text-ink/50 sm:inline">{upcoming ? 'Coming soon' : `${c._count.products} pieces`}</span>
                    <span className="hidden h-24 w-20 overflow-hidden bg-[#f2f2f0] md:block">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
