import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CURRENCIES, NAV } from "../data";
import { useStore } from "../store";

const ARCHIVE = [
  { to: "/collections/archive", label: "View Archive" },
  { to: "/collections/archive?category=outerwear", label: "Outerwear" },
  { to: "/collections/archive?category=tops-shirts", label: "Tops & Shirts" },
  { to: "/collections/archive?category=accessories", label: "Accessories" },
];
const SUPPORT = [
  { to: "/pages/support#faq", label: "FAQ" },
  { to: "/pages/support#shipping", label: "Shipping" },
  { to: "/pages/support#returns", label: "Returns" },
  { to: "/pages/support#size-guide", label: "Size Guide" },
  { to: "/pages/support#contact", label: "Contact" },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`chev${open ? " is-open" : ""}`} width="6" height="9" viewBox="0 0 6 9" aria-hidden="true">
      <path d="M1 1l3.5 3.5L1 8" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default function NavList({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const { currency, setCurrency } = useStore();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<string | null>(pathname.startsWith("/collections/archive") ? "archive" : null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const go = () => onNavigate?.();

  const Group = ({ id, label, items }: { id: string; label: string; items: { to: string; label: string }[] }) => (
    <li>
      <button type="button" className="nav-link nav-toggle" aria-expanded={open === id} onClick={() => toggle(id)}>
        {label} <Chevron open={open === id} />
      </button>
      <ul className={`nav-sub${open === id ? " is-open" : ""}`}>
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} className="nav-link" onClick={go} end>
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  );

  return (
    <nav className={`navlist${mobile ? " navlist--mobile" : ""}`} aria-label="Main">
      <ul>
        {NAV.map((c) => (
          <li key={c.handle}>
            <NavLink to={`/collections/${c.handle}`} className="nav-link" onClick={go}>
              {c.title}
            </NavLink>
          </li>
        ))}
        <li className="nav-sep" aria-hidden="true">
          –
        </li>
        {Group({ id: "archive", label: "Archive", items: ARCHIVE })}
        <li>
          <NavLink to="/pages/chapters" className="nav-link" onClick={go}>
            Chapters
          </NavLink>
        </li>
        {Group({ id: "support", label: "Support", items: SUPPORT })}
        <li>
          <NavLink to="/account" className="nav-link" onClick={go}>
            Account
          </NavLink>
        </li>
        <li>
          <NavLink to="/pages/newsletter" className="nav-link" onClick={go}>
            Newsletter
          </NavLink>
        </li>
        <li>
          <NavLink to="/pages/legal" className="nav-link" onClick={go}>
            Legal
          </NavLink>
        </li>
        <li>
          <button type="button" className="nav-link nav-toggle" aria-expanded={open === "currency"} onClick={() => toggle("currency")}>
            {mobile ? currency.code : currency.region} / {currency.symbol}
          </button>
          <ul className={`nav-sub${open === "currency" ? " is-open" : ""}`}>
            {CURRENCIES.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className={`nav-link${c.code === currency.code ? " active" : ""}`}
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(null);
                  }}
                >
                  {c.region} / {c.symbol} {c.code}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
