import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/store/ProductGallery';
import ProductForm from '@/components/store/ProductForm';
import ProductCard from '@/components/store/ProductCard';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { CURRENCY, currencyDigits } from '@/lib/money';
import { siteUrl } from '@/lib/utils';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: 'Not found' };
  const description = p.seoDescription || p.description?.slice(0, 160) || `${p.title} — THE 87TH CLUB`;
  const img = p.images[0];
  return {
    title: p.seoTitle || p.title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.title, description, type: 'website', images: img ? [{ url: img.url, width: img.width ?? undefined, height: img.height ?? undefined, alt: img.alt || p.title }] : undefined },
  };
}

export default async function ProductPage({ params }: P) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [related, settings] = await Promise.all([getRelatedProducts(product), getSettings()]);
  const variants = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    price: v.price ?? product.price,
    stock: Math.max(0, v.inventory?.quantity ?? 0),
    lowStock: v.inventory?.lowStockThreshold ?? 3,
  }));
  const inStock = variants.some((v) => v.stock > 0) && product.price !== null;
  const digits = currencyDigits();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.images.map((i) => (i.url.startsWith('/') ? siteUrl(i.url) : i.url)),
    sku: product.sku ?? undefined,
    brand: { '@type': 'Brand', name: 'THE 87TH CLUB' },
    category: product.category?.name,
    offers:
      product.price !== null
        ? { '@type': 'Offer', price: (product.price / 10 ** digits).toFixed(digits), priceCurrency: CURRENCY, availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: siteUrl(`/products/${product.slug}`) }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="md:grid md:grid-cols-12">
        <div className="md:col-span-7 lg:col-span-8">
          <ProductGallery images={product.images} title={product.title} />
        </div>
        <div className="md:col-span-5 lg:col-span-4">
          <div className="px-4 pb-10 pt-6 sm:px-6 md:sticky md:top-[var(--header-h)] md:px-8 md:pt-10">
            <nav aria-label="Breadcrumb" className="t-micro mb-4 text-ink/50">
              <Link href="/shop" className="hover:text-signal">Shop</Link>
              {product.category && (
                <>
                  {' / '}
                  <Link href={`/shop?category=${product.category.slug}`} className="hover:text-signal">{product.category.name}</Link>
                </>
              )}
            </nav>
            <div className="flex flex-wrap gap-2">
              {product.newArrival && <span className="t-micro bg-signal px-2 py-1 text-white">New</span>}
              {!inStock && <span className="t-micro bg-ink px-2 py-1 text-white">Sold out</span>}
            </div>
            <h1 className="t-display mt-3 text-5xl sm:text-6xl">{product.title}</h1>
            <div className="mt-6">
              <ProductForm variants={variants} basePrice={product.price} currency={CURRENCY} />
            </div>
            <div className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
              {product.description && (
                <details open className="group py-4">
                  <summary className="t-ui flex cursor-pointer list-none items-center justify-between">Description <span className="transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{product.description}</p>
                </details>
              )}
              {product.details && (
                <details className="group py-4">
                  <summary className="t-ui flex cursor-pointer list-none items-center justify-between">Details <span className="transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{product.details}</p>
                  {product.sku && <p className="t-micro mt-3 text-ink/50">SKU {product.sku}</p>}
                </details>
              )}
              <details className="group py-4">
                <summary className="t-ui flex cursor-pointer list-none items-center justify-between">Shipping &amp; returns <span className="transition-transform group-open:rotate-45">+</span></summary>
                <div className="mt-3 space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">
                  {settings.shippingInfo || settings.returnsInfo ? (
                    <>
                      {settings.shippingInfo && <p>{settings.shippingInfo}</p>}
                      {settings.returnsInfo && <p>{settings.returnsInfo}</p>}
                    </>
                  ) : (
                    <p>Delivery options and costs are shown at checkout. <Link href="/contact" className="link-u">Contact us</Link> with any question.</p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="wrap pt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="t-display mb-8 border-b-2 border-ink pb-3 text-5xl sm:text-7xl">You may also like</h2>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}><ProductCard product={p} /></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
