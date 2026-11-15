import { useEffect, useRef } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import Logo from "./Logo";

export default function Header() {
  const s = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const isHome = pathname === "/";
  const coll = matchPath("/collections/:handle", pathname);
  const isCollection = !!coll;

  useEffect(() => {
    if (s.searchOpen) input.current?.focus();
  }, [s.searchOpen]);

  const closeAll = () => {
    s.setMenuOpen(false);
    s.setSearchOpen(false);
    s.setFilterOpen(false);
  };
  const openSearch = () => {
    s.setMenuOpen(false);
    s.setFilterOpen(false);
    s.setSearchOpen(true);
  };
  const closeSearch = () => {
    s.setSearchOpen(false);
    s.setQuery("");
  };
  const bagLabel = s.count > 0 ? `Bag (${s.count})` : "Bag";

  return (
    <header className={`header${isHome && !s.searchOpen ? " header--clear" : ""}${s.menuOpen ? " header--menu" : ""}`}>
      <Logo onClick={closeAll} />
      <div className="topbar">
        {s.searchOpen ? (
          <form
            className="topbar-left search-form"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (s.query.trim()) {
                navigate(`/search?q=${encodeURIComponent(s.query.trim())}`);
                s.setSearchOpen(false);
              }
            }}
          >
            <label htmlFor="search-input" className="visually-hidden">
              Search
            </label>
            <input
              id="search-input"
              ref={input}
              value={s.query}
              onChange={(e) => s.setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder="Search"
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        ) : (
          <div className="topbar-left desktop-only">
            {isCollection && (
              <>
                <Link to="/collections/all" className={coll?.params.handle === "all" ? "u" : ""}>
                  View All
                </Link>
                <button type="button" onClick={() => s.setFilterOpen(true)} aria-haspopup="dialog" aria-expanded={s.filterOpen}>
                  Filter
                </button>
              </>
            )}
          </div>
        )}
        {!s.searchOpen && !s.bannerHidden && (
          <p className="banner desktop-only">
            Free standard shipping on orders over $200 USD&nbsp;&nbsp;-&nbsp;&nbsp;
            <button type="button" onClick={s.hideBanner}>
              Hide
            </button>
          </p>
        )}
        <div className="topbar-right">
          {s.searchOpen ? (
            <>
              <button
                type="button"
                className="desktop-only"
                disabled={!s.query.trim()}
                onClick={() => {
                  navigate(`/search?q=${encodeURIComponent(s.query.trim())}`);
                  s.setSearchOpen(false);
                }}
              >
                View All Results
              </button>
              <button type="button" onClick={() => { s.setQuery(""); input.current?.focus(); }}>
                Clear
              </button>
              <button type="button" className="u" onClick={closeSearch}>
                Close
              </button>
            </>
          ) : (
            <>
              {isCollection && (
                <button type="button" className="mobile-only" onClick={() => { s.setMenuOpen(false); s.setFilterOpen(true); }}>
                  Filter
                </button>
              )}
              <button type="button" onClick={openSearch}>
                Search
              </button>
            </>
          )}
          <button type="button" onClick={() => { s.setMenuOpen(false); s.setBagOpen(true); }} aria-haspopup="dialog">
            {bagLabel}
          </button>
          <button type="button" className="mobile-only" aria-expanded={s.menuOpen} onClick={() => { s.setSearchOpen(false); s.setMenuOpen(!s.menuOpen); }}>
            {s.menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
    </header>
  );
}
