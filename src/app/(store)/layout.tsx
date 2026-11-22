import StoreProvider from '@/components/store/StoreProvider';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import { BagDrawer, SearchOverlay } from '@/components/store/Overlays';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { visibleProductWhere } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, collections] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { products: { some: visibleProductWhere() } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { name: true, slug: true } }),
    prisma.collection.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], select: { title: true, slug: true } }),
  ]);
  return (
    <StoreProvider>
      <a href="#main" className="t-ui sr-only z-[60] bg-signal px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Skip to content
      </a>
      <Header nav={{ categories, collections, announcement: settings.announcement }} />
      <main id="main">{children}</main>
      <Footer settings={settings} categories={categories} />
      <BagDrawer />
      <SearchOverlay />
    </StoreProvider>
  );
}
