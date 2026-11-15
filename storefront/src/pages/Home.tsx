import { useEffect } from "react";
import { Link } from "react-router-dom";

const BLOCKS = [
  { to: "/collections/new-arrivals", desktop: "/images/editorial/campaign-01.jpg", mobile: "/images/editorial/campaign-01.jpg", label: "New Arrivals", wide: true },
  { to: "/collections/tees", desktop: "/images/editorial/campaign-02.jpg", mobile: "/images/editorial/campaign-02.jpg", label: "Tees" },
  { to: "/collections/outerwear", desktop: "/images/editorial/campaign-03.jpg", mobile: "/images/editorial/campaign-03.jpg", label: "Outerwear" },
  { to: "/collections/sweats", desktop: "/images/editorial/campaign-04.jpg", mobile: "/images/editorial/campaign-04.jpg", label: "Sweats" },
];

export default function Home() {
  useEffect(() => {
    document.title = "87TH CLUB";
  }, []);
  return (
    <main className="home" id="main">
      <h1 className="visually-hidden">87TH CLUB</h1>
      {BLOCKS.map((b, i) => (
        <section className={`feature${b.wide ? " feature--wide" : ""}`} key={b.to}>
          <Link to={b.to} className="feature-link" aria-label={b.label}>
            <picture>
              <source media="(max-width: 1099px)" srcSet={b.mobile} />
              <img src={b.desktop} alt={`${b.label} campaign`} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} />
            </picture>
          </Link>
        </section>
      ))}
    </main>
  );
}
