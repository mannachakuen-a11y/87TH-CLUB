import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { asset, callouts } from "../data";
import NotFound from "./NotFound";

function useHashScroll() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }, [hash, pathname]);
}

function Support() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <h1>Support</h1>
      <section id="faq">
        <h2>FAQ</h2>
        <p>Where is my order? Tracking details are emailed as soon as your order leaves the warehouse.</p>
        <p>Can I change my order? Orders can be edited within one hour of being placed by contacting us below.</p>
        <p>Do you restock? Core styles such as the Heavyweight Blank Tee and Heavyweight Hoodie are restocked seasonally.</p>
      </section>
      <section id="shipping">
        <h2>Shipping</h2>
        <p>Standard shipping: 3-7 business days, free on orders over $200 USD.</p>
        <p>Express shipping: 1-3 business days, $25 USD.</p>
      </section>
      <section id="returns">
        <h2>Returns</h2>
        <p>Unworn items with tags attached may be returned within 30 days of delivery. Sale items are final.</p>
      </section>
      <section id="size-guide">
        <h2>Size Guide</h2>
        <p>Tops are cut with a relaxed, unisex fit. If you are between sizes, size down for a closer fit.</p>
        <p>Bottoms use waist sizes (28-38). Headwear, sunglasses and accessories are one size.</p>
      </section>
      <section id="contact">
        <h2>Contact</h2>
        {sent ? (
          <p>Thanks, we have received your message and will reply within two business days.</p>
        ) : (
          <form className="form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <input type="email" required placeholder="Email" />
            <input required placeholder="Order number (optional)" />
            <textarea required placeholder="Message" rows={4} />
            <button className="btn btn--black" type="submit">Send</button>
          </form>
        )}
      </section>
    </>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(() => !!localStorage.getItem("87c.newsletter"));
  return (
    <>
      <h1>Newsletter</h1>
      <p>Sign up for early access to new arrivals, collaborations and events.</p>
      {done ? (
        <p>You are subscribed. Thank you.</p>
      ) : (
        <form
          className="form form--inline"
          onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem("87c.newsletter", email);
            setDone(true);
          }}
        >
          <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn--black" type="submit">Subscribe</button>
        </form>
      )}
    </>
  );
}

function Account() {
  const [msg, setMsg] = useState("");
  return (
    <>
      <h1>Account</h1>
      <form className="form" onSubmit={(e) => { e.preventDefault(); setMsg("Accounts are not enabled in this prototype. Your bag is saved on this device."); }}>
        <input type="email" required placeholder="Email" autoComplete="email" />
        <input type="password" required placeholder="Password" autoComplete="current-password" />
        <button className="btn btn--black" type="submit">Sign In</button>
      </form>
      {msg && <p>{msg}</p>}
      <p className="grey">Don't have an account? Create one at checkout.</p>
    </>
  );
}

function Legal() {
  return (
    <>
      <h1>Legal</h1>
      <section>
        <h2>About this site</h2>
        <p>87TH CLUB is a fictional brand. This website is an internal design prototype. Products, prices and orders are not real.</p>
      </section>
      <section>
        <h2>Photography</h2>
        <p>
          All photographs are from Unsplash and used under the Unsplash License. A full list of images and their sources is in the
          project's asset manifest (<a className="u" href={asset("/images/manifest.json")}>manifest.json</a>).
        </p>
      </section>
      <section>
        <h2>Privacy</h2>
        <p>Your bag, currency and newsletter preference are stored only in your browser's local storage.</p>
      </section>
    </>
  );
}

function Chapters() {
  const imgs = [...["/images/editorial/campaign-02.jpg", "/images/editorial/campaign-03.jpg", "/images/editorial/campaign-04.jpg"].map(asset), ...callouts];
  return (
    <>
      <h1>Chapters</h1>
      <p>Chapter 01 — Fall / Winter. Shot on the streets around the club.</p>
      <ul className="chapters-grid">
        {imgs.map((src, i) => (
          <li key={src}>
            <img src={src} alt={`Chapter 01 look ${i + 1}`} loading="lazy" />
            <p>Look {String(i + 1).padStart(2, "0")}</p>
          </li>
        ))}
      </ul>
      <p>
        <Link to="/collections/new-arrivals" className="u">Shop New Arrivals</Link>
      </p>
    </>
  );
}

const PAGES: Record<string, () => JSX.Element> = { support: Support, newsletter: Newsletter, legal: Legal, chapters: Chapters, account: Account };

export default function Info({ page }: { page?: string }) {
  const params = useParams();
  useHashScroll();
  const key = page ?? params.page ?? "";
  const Page = PAGES[key];
  useEffect(() => {
    document.title = `${key.charAt(0).toUpperCase() + key.slice(1)} | 87TH CLUB`;
  }, [key]);
  if (!Page) return <NotFound />;
  return (
    <main className={`main page page--${key}`} id="main">
      <Page />
    </main>
  );
}
