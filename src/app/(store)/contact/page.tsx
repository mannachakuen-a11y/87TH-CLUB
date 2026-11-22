import type { Metadata } from 'next';
import ContactForm from './ContactForm';
import { getSettings, parseFaq } from '@/lib/settings';

export const metadata: Metadata = { title: 'Contact', description: 'Contact THE 87TH CLUB — questions, orders and collaborations.' };

export default async function ContactPage() {
  const s = await getSettings();
  const faq = parseFaq(s.faq);
  const socials = [
    ['Instagram', s.instagram],
    ['TikTok', s.tiktok],
    ['X', s.x],
    ['YouTube', s.youtube],
  ].filter(([, u]) => u) as [string, string][];
  return (
    <div className="wrap pb-10 pt-8">
      <h1 className="t-display mb-12 text-[18vw] sm:text-9xl">Contact</h1>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          {s.supportEmail && (
            <div>
              <p className="t-micro mb-2 text-ink/50">Email</p>
              <a href={`mailto:${s.supportEmail}`} className="t-display text-3xl hover:text-signal">{s.supportEmail}</a>
            </div>
          )}
          {s.supportPhone && (
            <div>
              <p className="t-micro mb-2 text-ink/50">Phone / WhatsApp</p>
              <a href={`tel:${s.supportPhone.replace(/\s/g, '')}`} className="t-display text-3xl hover:text-signal">{s.supportPhone}</a>
            </div>
          )}
          {s.businessLocation && (
            <div>
              <p className="t-micro mb-2 text-ink/50">Based in</p>
              <p className="t-ui">{s.businessLocation}</p>
            </div>
          )}
          {socials.length > 0 && (
            <div>
              <p className="t-micro mb-2 text-ink/50">Follow</p>
              <ul className="space-y-1">
                {socials.map(([n, u]) => (
                  <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="t-ui hover:text-signal">{n} ↗</a></li>
                ))}
              </ul>
            </div>
          )}
          <p className="font-didot text-2xl">Spread love. Stay real.</p>
        </aside>
      </div>
      {faq.length > 0 && (
        <section id="faq" className="mt-24 scroll-mt-24">
          <h2 className="t-display mb-6 border-b-2 border-ink pb-3 text-6xl sm:text-8xl">FAQ</h2>
          <div className="divide-y divide-ink/15">
            {faq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="t-ui flex cursor-pointer list-none items-center justify-between gap-4 text-[15px]">
                  {f.q}
                  <span className="text-xl transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink/80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
