import type { Metadata } from 'next';
import Link from 'next/link';
import Mascot from '@/components/Mascot';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'The Club',
  description: 'THE 87TH CLUB is a celebration of life, creativity, individuality and the beautiful impermanence of human existence.',
};

// All copy on this page is taken from THE ULTIMATE 87TH CLUB BRAND IDENTITY BOOK.
const VALUES: [string, string][] = [
  ['Authenticity', 'Genuine expression beyond trends'],
  ['Individuality', 'Celebrate uniqueness in style'],
  ['Expression', 'Fashion as a personal language'],
  ['Creativity', 'Experimentation and artfulness'],
  ['Curiosity', 'Open to new ideas and influences'],
  ['Culture', 'Rooted in music, art, community'],
  ['Experience', 'Living fully through style and life'],
];
const TAGLINES = ['Life is art', 'Spread love', 'Style yours', 'Stay real'];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="wrap grid min-h-[80vh] items-end gap-10 py-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="t-micro mb-6 text-paper/60">Street / Culture / Community</p>
            <h1 className="t-display text-[20vw] md:text-[12vw]">
              Life is
              <br />
              <span className="text-signal">art.</span>
            </h1>
          </div>
          <div className="md:col-span-4">
            <Mascot size={600} priority className="mb-8 h-auto w-48 md:ml-auto md:w-full md:max-w-[340px]" />
            <p className="font-didot text-2xl leading-snug">You are the artist. Make something beautiful of it.</p>
          </div>
        </div>
      </section>

      <section className="wrap grid gap-10 py-20 md:grid-cols-12">
        <h2 className="t-micro text-signal md:col-span-3">Brand introduction</h2>
        <div className="space-y-6 text-[18px] leading-relaxed md:col-span-8 md:col-start-5">
          <p className="t-display text-4xl leading-[0.95] sm:text-6xl">A celebration of life, creativity, individuality, and the beautiful impermanence of human existence.</p>
          <p>
            The 87th Club exists to inspire people to create, build, grow, dream, and leave the world a little better than they found it — through love, kindness, and the courage to believe in what seems impossible.
          </p>
          <p>
            The Club celebrates the beauty of sonder, authenticity, individuality, and imperfection, embracing every strange, beautiful, painful, and unforgettable part of being human. We believe life itself is the greatest art form, and every human
            being is an artist — expressing themselves through fashion, music, dance, skating, cooking, drawing, design, film, entrepreneurship, charity, and every form of creation yet to be imagined.
          </p>
          <p>
            Because life is temporary, we believe in making the most of our freedom while we have it: chase your dreams, fall in love, make mistakes, learn, grow, take risks, give kindness, and live fully. And beneath it all is love — for people, for
            creation, for possibility, and for the privilege of being alive.
          </p>
        </div>
      </section>

      <section className="bg-sand">
        <div className="wrap grid gap-10 py-20 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="t-display text-7xl sm:text-9xl">The Club</h2>
          </div>
          <p className="text-[18px] leading-relaxed md:col-span-6 md:col-start-7">
            THE CLUB is more than a store. It is a shared cultural space where fashion, art, music, creativity, individuality, and life intersect. A place where people come together not just to buy clothes, but to belong to something — a community
            built on expression, curiosity, and the belief that style is a living, breathing form of art.
          </p>
        </div>
      </section>

      {settings.editorialImage && (
        <section className="relative h-[80vh] overflow-hidden bg-ink grain">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.editorialImage} alt="THE 87TH CLUB" className="h-full w-full object-cover" loading="lazy" />
          <p className="t-display absolute bottom-6 left-6 right-6 text-[14vw] text-white mix-blend-difference">Raw walls. Real voices.</p>
        </section>
      )}

      <section className="wrap py-20">
        <h2 className="t-micro mb-8 text-signal">Brand values</h2>
        <ul className="border-t-2 border-ink">
          {VALUES.map(([v, d]) => (
            <li key={v} className="grid gap-2 border-b border-ink/15 py-4 sm:grid-cols-2 sm:items-baseline">
              <span className="t-display text-5xl sm:text-7xl">{v}</span>
              <span className="t-ui text-ink/70">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-ink text-paper">
        <div className="wrap py-20">
          <h2 className="t-micro mb-6 text-paper/60">Culture in motion</h2>
          <p className="max-w-4xl text-[20px] leading-relaxed sm:text-[24px]">
            The 87TH Club is inspired by art in all its forms — and streetwear is where they meet. A graphic can feel like a piece of art. A sneaker can carry the history of a sport. A photograph can capture an entire generation. An outfit can say
            something before a person ever speaks.
          </p>
          <p className="mt-8 font-didot text-3xl">We believe there is no single way to create, no single way to look, and no single way to live.</p>
          <div className="mt-16 grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-4">
            {TAGLINES.map((t, i) => (
              <div key={t} className={`t-display flex aspect-square items-end p-4 text-4xl sm:text-5xl ${i === 0 ? 'bg-signal' : 'bg-ink'}`}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap flex flex-col items-start gap-6 py-20">
        <p className="t-display text-6xl sm:text-8xl">Perfection in every flaw.</p>
        <p className="t-ui max-w-xl text-ink/70">The medium may change, but the philosophy remains. Clothing and resale are simply the Club’s first expression.</p>
        <Link href="/shop" className="btn-red">Shop the Club</Link>
      </section>
    </>
  );
}
