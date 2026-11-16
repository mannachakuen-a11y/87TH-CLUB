import { useState } from "react";
import { NavLink } from "react-router-dom";
import { CURRENCIES, NAV } from "../data";
import { useStore } from "../store";
import { lockStore } from "./Gate";

export default function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { currency, setCurrency } = useStore();
  const [curOpen, setCurOpen] = useState(false);
  const go = () => onNavigate?.();
  return (
    <nav className="navlist" aria-label="Main">
      <ul className="nav-main">
        {NAV.map((c) => (
          <li key={c.handle}>
            <NavLink to={`/collections/${c.handle}`} className="nav-link" onClick={go}>
              {c.title}
            </NavLink>
          </li>
        ))}
      </ul>
      <ul className="nav-foot">
        <li><NavLink to="/collections/archive" className="nav-link" onClick={go}>Archive</NavLink></li>
        <li><NavLink to="/pages/newsletter" className="nav-link" onClick={go}>Newsletter</NavLink></li>
        <li><NavLink to="/pages/support" className="nav-link" onClick={go}>Shipping & Returns</NavLink></li>
        <li><NavLink to="/account" className="nav-link" onClick={go}>Account</NavLink></li>
        <li><NavLink to="/pages/legal" className="nav-link" onClick={go}>Terms of Service</NavLink></li>
        <li>
          <button type="button" className="nav-link" aria-expanded={curOpen} onClick={() => setCurOpen(!curOpen)}>
            Currency: {currency.code} {currency.symbol}
          </button>
          {curOpen && (
            <ul className="nav-cur">
              {CURRENCIES.map((c) => (
                <li key={c.code}>
                  <button type="button" className={`nav-link${c.code === currency.code ? " active" : ""}`} onClick={() => { setCurrency(c.code); setCurOpen(false); }}>
                    {c.code} {c.symbol}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li><button type="button" className="nav-link" onClick={lockStore}>Lock store</button></li>
      </ul>
    </nav>
  );
}
