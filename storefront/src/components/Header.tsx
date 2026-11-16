import { useEffect, useRef } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from "./Icons";
import Logo from "./Logo";

export default function Header() {
  const s = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const isCollection = !!matchPath("/collections/:handle", pathname) || pathname === "/";

  useEffect(() => {
    if (s.searchOpen) input.current?.focus();
  }, [s.searchOpen]);

  const closeAll = () => {
    s.setMenuOpen(false);
    s.setSearchOpen(false);
    s.setFilterOpen(false);
    s.setQuery("");
  };

  return (
    <header className="header">
      <div className="topline" aria-hidden="true" />
      <button type="button" className="menu-btn mobile-only" aria-label={s.menuOpen ? "Close menu" : "Open menu"} aria-expanded={s.menuOpen} onClick={() => { s.setSearchOpen(false); s.setMenuOpen(!s.menuOpen); }}>
        {s.menuOpen ? <CloseIcon size={22} /> : <MenuIcon />}
      </button>
      <Logo onClick={closeAll} />
      <div className="topbar">
        {isCollection && (
          <button type="button" className="tb-link" onClick={() => { s.setMenuOpen(false); s.setFilterOpen(true); }} aria-haspopup="dialog">
            Filter
          </button>
        )}
        <form
          className="search-form desktop-only"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (s.query.trim()) {
              navigate(`/search?q=${encodeURIComponent(s.query.trim())}`);
              s.setSearchOpen(false);
            }
          }}
        >
          <button type="submit" aria-label="Search">
            <SearchIcon />
          </button>
          <label htmlFor="search-input" className="visually-hidden">Search</label>
          <input
            id="search-input"
            ref={input}
            value={s.query}
            onChange={(e) => { s.setQuery(e.target.value); s.setSearchOpen(e.target.value.trim() !== ""); }}
            onKeyDown={(e) => e.key === "Escape" && closeAll()}
            placeholder="Search"
            autoComplete="off"
            spellCheck={false}
          />
          {s.searchOpen && (
            <button type="button" className="tb-link" onClick={closeAll}>Clear</button>
          )}
        </form>
        <button type="button" className="tb-link mobile-only" aria-label="Search" onClick={() => { s.setMenuOpen(false); s.setSearchOpen(!s.searchOpen); }}>
          <SearchIcon />
        </button>
        <button type="button" className="tb-link cart-link" onClick={() => { s.setMenuOpen(false); s.setBagOpen(true); }} aria-haspopup="dialog">
          <CartIcon />
          <span className="desktop-only">Cart ({s.count})</span>
          <span className="mobile-only cart-count">{s.count > 0 ? s.count : ""}</span>
        </button>
        <Link to="/checkout" className="tb-link desktop-only" onClick={closeAll}>Checkout</Link>
      </div>
      {s.searchOpen && (
        <form className="search-form search-form--mobile mobile-only" role="search" onSubmit={(e) => { e.preventDefault(); if (s.query.trim()) { navigate(`/search?q=${encodeURIComponent(s.query.trim())}`); s.setSearchOpen(false); } }}>
          <input aria-label="Search" value={s.query} autoFocus onChange={(e) => s.setQuery(e.target.value)} placeholder="Search" />
          <button type="button" className="tb-link" onClick={closeAll}>Close</button>
        </form>
      )}
    </header>
  );
}
