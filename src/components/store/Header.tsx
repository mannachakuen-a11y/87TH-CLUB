'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Mascot from '../Mascot';
import { useStore } from './StoreProvider';
import { cx } from '@/lib/utils';

export type NavData = {
  categories: { name: string; slug: string }[];
  collections: { title: string; slug: string }[];
  announcement: string;
};

const primary = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections/new-arrivals', label: 'New', fallback: '/shop?sort=newest' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'The Club' },
];

export default function Header({ nav }: { nav: NavData }) {
  const { cart, setBagOpen, setSearchOpen, setMenuOpen, menuOpen, bump } = useStore();
  const pathname = usePathname();
  const hasNew = nav.collections.some((c) => c.slug === 'new-arrivals');
  const links = primary.map((l) => ({ ...l, href: l.fallback && !hasNew ? l.fallback : l.href }));

  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);

  return (
    <>
      {nav.announcement && (
        <div className="relative overflow-hidden bg-ink text-paper" role="region" aria-label="Announcement">
          <div className="flex w-max animate-marquee whitespace-nowrap py-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="t-micro mx-6 flex items-center gap-6" aria-hidden={i > 0}>
                {nav.announcement}
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
            ))}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="wrap grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center">
          <nav aria-label="Primary" className="flex items-center gap-6">
            <button className="t-ui -ml-2 flex h-11 items-center px-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-menu">
              {menuOpen ? 'Close' : 'Menu'}
            </button>
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={cx('t-ui hidden transition-colors hover:text-signal lg:inline', pathname === l.href.split('?')[0] && 'text-signal')}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="group flex items-center gap-2" aria-label="THE 87TH CLUB — home">
            <Mascot size={46} priority className="h-[46px] w-[46px] transition-transform duration-300 group-hover:-rotate-6" />
          </Link>
          <div className="flex items-center justify-end gap-1 sm:gap-5">
            <button className="t-ui flex h-11 items-center px-2 hover:text-signal" onClick={() => setSearchOpen(true)} aria-label="Search products">
              Search
            </button>
            <button className="t-ui flex h-11 items-center px-2 hover:text-signal" onClick={() => setBagOpen(true)} aria-label={`Open bag, ${cart?.count ?? 0} items`}>
              Bag&nbsp;
              <span key={bump} className={cx('inline-block min-w-[2.2ch] text-center', bump > 0 && 'animate-bump text-signal')}>
                ({cart?.count ?? 0})
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu nav={nav} links={links} />
    </>
  );
}

function MobileMenu({ nav, links }: { nav: NavData; links: { href: string; label: string }[] }) {
  const { menuOpen, setMenuOpen } = useStore();
  return (
    <div
      id="mobile-menu"
      className={cx('fixed inset-0 top-[var(--header-h)] z-30 overflow-y-auto bg-ink text-paper transition-[opacity,visibility] duration-200 lg:hidden', menuOpen ? 'visible opacity-100' : 'invisible opacity-0')}
      aria-hidden={!menuOpen}
    >
      <nav className="wrap flex min-h-full flex-col py-8" aria-label="Mobile">
        {links.map((l) => (
          <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="t-display border-b border-paper/10 py-3 text-[15vw] leading-none hover:text-signal xs:text-6xl">
            {l.label}
          </Link>
        ))}
        {nav.categories.length > 0 && (
          <div className="mt-8">
            <p className="t-micro mb-3 text-paper/50">Shop by category</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {nav.categories.map((c) => (
                <Link key={c.slug} href={`/shop?category=${c.slug}`} onClick={() => setMenuOpen(false)} className="t-ui hover:text-signal">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-10">
          <Link href="/contact" onClick={() => setMenuOpen(false)} className="t-ui">
            Contact
          </Link>
          <span className="font-didot text-lg">Life is art.</span>
        </div>
      </nav>
    </div>
  );
}
