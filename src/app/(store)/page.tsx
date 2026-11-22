import Link from 'next/link';
import Mascot from '@/components/Mascot';
import Countdown from '@/components/store/Countdown';
import NewsletterForm from '@/components/store/NewsletterForm';
import ProductCard, { ProductGrid } from '@/components/store/ProductCard';
import { prisma } from '@/lib/db';
import { cardInclude, getBestSellers, getNextDrop, visibleProductWhere } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';

// Copy below is taken from THE ULTIMATE 87TH CLUB BRAND IDENTITY BOOK (Canva).
const PHILOSOPHY = ['Life is short.', 'Style is personal.', 'Art is everywhere.', 'Perfection is overrated.', 'Expression matters.', 'Experience everything.', 'Create something.', 'Wear what feels like you.', 'Find your people.', 'Make memories.', 'Live fully.'];
const PERSONALITY = ['Expressive', 'Curious', 'Rebellious', 'Artistic', 'Authentic', 'Youthful', 'Culturally aware', 'Unconventional'];

export default async function Home() {
  const where = visibleProductWhere();
  const [settings, drop, featuredCollection, newArrivals, featured, bestSellers, total] = await Promise.all([
    getSettings(),
    getNextDrop(),
    prisma.collection.findFirst({
      where: { isVisible: true, isDrop: false, slug: { not: 'new-arrivals' }, products: { some: { product: where } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { products: { where: { product: where }, orderBy: { position: 'asc' }, take: 8, include: { product: { include: cardInclude } } } },
    }),
    prisma.product.findMany({ where: { ...where, newArrival: true }, include: cardInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.product.findMany({ where: { ...where, featured: true }, include: cardInclude, orderBy: { updatedAt: 'desc' }, take: 1 }),
    getBestSellers(4),
    prisma.product.count({ where }),
  ]);
  const latest = newArrivals.length ? newArrivals : await prisma.product.findMany({ where, include: cardInclude, orderBy: { createdAt: 'desc' }, take: 8 });
  const hero = featured[0];

  return (
    <>
      {drop?.launchAt ? (
        <section className="relative overflow-hidden bg-ink text-paper grain" aria-labelledby="drop-title">
          <div className="wrap flex min-h-[calc(100svh-var(--header-h)-32px)] flex-col items-center justify-center gap-8 py-16 text-center">
            <Mascot size={600} priority className="h-40 w-40 sm:h-56 sm:w-56" />
            <div>
              <p className="t-micro text-paper/60">Next drop</p>
              <h1 id="drop-title" className="t-display mt-2 text-[16vw] sm:text-[9rem]">
                [{drop.title}]
              </h1>
              <p className="t-ui mt-3 text-paper/70">
                {drop.launchAt.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
              </p>
            </div>
            <Countdown to={drop.launchAt.toISOString()} />
            <div className="w-full max-w-md">
              <p className="t-ui mb-2">Sign up for early access.</p>
              <NewsletterForm dark source={`drop:${drop.slug}`} cta="Sign up" />
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden bg-ink text-paper" aria-labelledby="hero-title">
          {settings.heroImage ? (
            <div className="relative min-h-[calc(100svh-var(--header-h)-32px)] grain">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.heroImage} alt="THE 87TH CLUB campaign" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="wrap relative flex min-h-[calc(100svh-var(--header-h)-32px)] flex-col justify-end pb-10">
                <h1 id="hero-title" className="t-display text-[22vw] md:text-[14vw]">{settings.heroHeadline}</h1>
                <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                  <p className="max-w-sm font-didot text-2xl">{settings.heroSubline}</p>
                  <Link href="/shop" className="btn-red">Shop the Club</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="wrap relative grid min-h-[calc(100svh-var(--header-h)-32px)] grid-cols-12 items-center gap-y-8 py-12">
              <div className="col-span-12 md:col-span-7">
                <p className="t-micro mb-6 text-paper/60">Street / Culture / Community</p>
                <h1 id="hero-title" className="t-display text-[27vw] md:text-[15.5vw]">
                  The
                  <br />
                  87th
                  <br />
                  Club
                </h1>
              </div>
              <div className="relative col-span-12 flex flex-col items-start gap-8 md:col-span-5 md:items-end">
                <div className="relative w-[70vw] max-w-[520px] md:w-full">
                  {/* one red thread — brand kit cover motif; stops behind the mascot so text stays legible */}
                  <div className="absolute -top-[60vh] bottom-[12%] right-[14%] hidden w-[20%] bg-signal md:block" aria-hidden />
                  <Mascot size={600} priority className="relative h-auto w-full" />
                </div>
                <div className="relative md:text-right">
                  <p className="font-didot text-3xl sm:text-4xl">{settings.heroHeadline === 'LIFE IS ART.' ? 'Life is art.' : settings.heroHeadline}</p>
                  <p className="t-ui mt-2 max-w-xs text-paper/70 md:ml-auto">{settings.heroSubline}</p>
                  <Link href="/shop" className="btn-red mt-6">Shop the Club</Link>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* FEATURED COLLECTION */}
      {featuredCollection && featuredCollection.products.length > 0 && (
        <section className="wrap pt-16" aria-labelledby="featured-title">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <div>
              <p className="t-micro text-signal">Featured collection</p>
              <h2 id="featured-title" className="t-display mt-1 text-6xl sm:text-8xl">{featuredCollection.title}</h2>
            </div>
            <Link href={`/collections/${featuredCollection.slug}`} className="t-ui link-u">View collection</Link>
          </div>
          <ProductGrid products={featuredCollection.products.map((cp) => cp.product)} />
        </section>
      )}

      {/* FEATURED PRODUCT — asymmetric editorial split */}
      {hero && hero.images[0] && (
        <section className="mt-20 grid md:grid-cols-12" aria-label="Featured product">
          <Link href={`/products/${hero.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-[#f2f2f0] md:col-span-7 md:aspect-auto md:min-h-[80vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.images[0].url} alt={hero.images[0].alt || hero.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          </Link>
          <div className="flex flex-col justify-between gap-10 bg-sand p-6 sm:p-10 md:col-span-5">
            <p className="t-micro">Wear the attitude</p>
            <div>
              <h2 className="t-display text-6xl sm:text-8xl">{hero.title}</h2>
              {hero.description && <p className="mt-6 max-w-md text-[15px] leading-relaxed">{hero.description.slice(0, 220)}</p>}
              <Link href={`/products/${hero.slug}`} className="btn-ink mt-8">Shop now</Link>
            </div>
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      {latest.length > 0 ? (
        <section className="wrap pt-20" aria-labelledby="new-title">
          <div className="mb-8 flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <h2 id="new-title" className="t-display text-6xl sm:text-8xl">New arrivals</h2>
            <Link href="/shop?sort=newest" className="t-ui link-u shrink-0">Shop all ({total})</Link>
          </div>
          <ProductGrid products={latest} priorityCount={featuredCollection ? 0 : 4} />
        </section>
      ) : (
        <section className="wrap pt-20">
          <div className="flex flex-col items-start gap-6 border-y-2 border-ink py-16">
            <p className="t-display text-6xl sm:text-8xl">The first drop is coming.</p>
            <p className="t-ui max-w-md text-ink/60">Products appear here as soon as they are published from the dashboard. Get on the list to hear first.</p>
            <div className="w-full max-w-md">
              <NewsletterForm source="home-empty" cta="Notify me" />
            </div>
          </div>
        </section>
      )}

      {/* BEST SELLERS — only real sales data */}
      {bestSellers.length > 0 && (
        <section className="wrap pt-20" aria-labelledby="best-title">
          <div className="mb-8 flex items-end justify-between border-b-2 border-ink pb-3">
            <h2 id="best-title" className="t-display text-6xl sm:text-8xl">Best sellers</h2>
            <Link href="/shop?sort=best-selling" className="t-ui link-u">View all</Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-4">
            {bestSellers.map((p, i) => (
              <li key={p.id} className="relative">
                <span className="t-display absolute -top-3 left-2 z-10 text-6xl text-signal" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CAMPAIGN / EDITORIAL */}
      <section className="mt-24 bg-ink text-paper" aria-labelledby="culture-title">
        <div className="wrap grid gap-10 py-20 md:grid-cols-12">
          <div className="relative md:col-span-7">
            {settings.editorialImage ? (
              <div className="relative aspect-[4/5] overflow-hidden grain md:aspect-[5/6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.editorialImage} alt="THE 87TH CLUB editorial" className="h-full w-full object-cover" loading="lazy" />
                <p className="t-display absolute bottom-4 left-4 right-4 text-[16vw] text-paper mix-blend-difference md:text-[9vw]">Raw walls. Real voices.</p>
              </div>
            ) : (
              <h2 id="culture-title" className="t-display text-[18vw] md:text-[10vw]">
                Culture
                <br />
                <span className="text-signal">in</span> motion
              </h2>
            )}
          </div>
          <div className="flex flex-col justify-end md:col-span-5">
            {settings.editorialImage && <h2 id="culture-title" className="t-display mb-6 text-6xl">Culture in motion</h2>}
            <p className="text-[17px] leading-relaxed text-paper/85">
              From graffiti, where walls became canvases, to dance, where movement became expression. From skateboarding, where the streets became a playground, to music, where sound became identity. Streetwear sits at the center of this
              intersection.
            </p>
            <p className="mt-6 font-didot text-3xl">Style isn’t just what you wear. It’s everything that inspires you.</p>
            <Link href="/about" className="btn-line-light mt-10 self-start">Enter the Club</Link>
          </div>
        </div>
      </section>

      {/* BRAND / COMMUNITY */}
      <section className="overflow-hidden py-20" aria-labelledby="philosophy-title">
        <div className="wrap mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 id="philosophy-title" className="t-micro text-signal">The 87th Club — the philosophy</h2>
          <p className="t-micro text-ink/50">Nothing for us without us</p>
        </div>
        <ul className="wrap">
          {PHILOSOPHY.map((line, i) => (
            <li key={line} className="group flex items-baseline justify-between gap-4 border-t border-ink/15 py-1.5 last:border-b">
              <span className="t-display text-[10vw] transition-colors duration-200 group-hover:text-signal sm:text-7xl lg:text-8xl">{line}</span>
              <span className="t-micro text-ink/40">{String(i + 1).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
        <div className="wrap mt-12 flex flex-wrap gap-2">
          {PERSONALITY.map((p) => (
            <span key={p} className="t-micro border border-ink px-3 py-2">{p}</span>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-signal text-white" aria-labelledby="nl-title">
        <div className="wrap grid items-center gap-10 py-16 md:grid-cols-2">
          <div className="flex items-center gap-6">
            <Mascot reversed size={160} className="hidden h-28 w-28 shrink-0 sm:block" />
            <h2 id="nl-title" className="t-display text-6xl sm:text-8xl">Stay real.</h2>
          </div>
          <div>
            <p className="t-ui mb-3">Get the drop before everyone else.</p>
            <NewsletterForm dark source="home" cta="Join the Club" />
          </div>
        </div>
      </section>
    </>
  );
}
