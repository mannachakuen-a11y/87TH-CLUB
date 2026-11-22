import Link from 'next/link';
import Mascot from '../Mascot';
import NewsletterForm from './NewsletterForm';
import type { Settings } from '@/lib/settings';

export default function Footer({ settings, categories }: { settings: Settings; categories: { name: string; slug: string }[] }) {
  const socials = [
    ['Instagram', settings.instagram],
    ['TikTok', settings.tiktok],
    ['X', settings.x],
    ['YouTube', settings.youtube],
  ].filter(([, u]) => u) as [string, string][];
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="wrap grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="t-display text-6xl sm:text-7xl">
            Find your
            <br />
            people.
          </p>
          <p className="t-micro mt-4 max-w-sm text-paper/60">Drops, restocks and club news first. No noise.</p>
          <div className="mt-6 max-w-md">
            <NewsletterForm dark source="footer" />
          </div>
        </div>
        <nav aria-label="Footer shop" className="md:col-span-2">
          <p className="t-micro mb-4 text-paper/50">Shop</p>
          <ul className="space-y-2">
            <li><Link href="/shop" className="t-ui hover:text-signal">All products</Link></li>
            {categories.slice(0, 8).map((c) => (
              <li key={c.slug}><Link href={`/shop?category=${c.slug}`} className="t-ui hover:text-signal">{c.name}</Link></li>
            ))}
            <li><Link href="/collections" className="t-ui hover:text-signal">Collections</Link></li>
          </ul>
        </nav>
        <nav aria-label="Footer club" className="md:col-span-2">
          <p className="t-micro mb-4 text-paper/50">Club</p>
          <ul className="space-y-2">
            <li><Link href="/about" className="t-ui hover:text-signal">The Club</Link></li>
            <li><Link href="/contact" className="t-ui hover:text-signal">Contact</Link></li>
            <li><Link href="/contact#faq" className="t-ui hover:text-signal">FAQ</Link></li>
            <li><Link href="/bag" className="t-ui hover:text-signal">Bag</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-3">
          {socials.length > 0 && <p className="t-micro mb-4 text-paper/50">Follow</p>}
          {socials.length ? (
            <ul className="space-y-2">
              {socials.map(([n, u]) => (
                <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="t-ui hover:text-signal">{n} ↗</a></li>
              ))}
            </ul>
          ) : null}
          {settings.supportEmail && (
            <a href={`mailto:${settings.supportEmail}`} className="t-ui mt-6 block hover:text-signal">{settings.supportEmail}</a>
          )}
        </div>
      </div>
      <div className="relative overflow-hidden border-t border-paper/10">
        <div className="wrap flex items-end justify-between gap-6 pb-6 pt-10">
          <p className="t-display select-none text-[22vw] leading-[0.78] text-paper md:text-[17vw]" aria-hidden>
            87TH
          </p>
          <Mascot size={180} className="mb-3 hidden h-28 w-28 shrink-0 sm:block md:h-44 md:w-44" />
        </div>
        <div className="wrap flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 py-5">
          <span className="t-micro text-paper/50">© {new Date().getFullYear()} THE 87TH CLUB</span>
          <span className="font-didot text-base text-paper/80">Perfection in every flaw.</span>
        </div>
      </div>
    </footer>
  );
}
