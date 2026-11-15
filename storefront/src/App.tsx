import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import BagDrawer from "./components/BagDrawer";
import Header from "./components/Header";
import NavList from "./components/NavList";
import Checkout from "./pages/Checkout";
import Collection from "./pages/Collection";
import Home from "./pages/Home";
import Info from "./pages/Info";
import NotFound from "./pages/NotFound";
import Product from "./pages/Product";
import Search, { SearchResults } from "./pages/Search";
import { collectionProducts } from "./data";
import { useStore } from "./store";

function CollectionTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = pathname.match(/^\/collections\/([^/]+)$/);
    const c = m && collectionProducts(m[1]);
    if (c) document.title = `${c.title} | 87TH CLUB`;
  }, [pathname]);
  return null;
}

export default function App() {
  const s = useStore();
  const { pathname, search } = useLocation();

  // close transient UI on navigation
  useEffect(() => {
    s.setMenuOpen(false);
    s.setFilterOpen(false);
    s.setSearchOpen(false);
    if (!pathname.startsWith("/pages/")) window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => s.setFilterOpen(false), [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`app${pathname === "/" ? " is-home" : ""}`}>
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <aside className="sidebar desktop-only">
        <NavList />
      </aside>
      <p className="copyright desktop-only">© 2026 87th Club</p>
      <div className={`mobile-menu${s.menuOpen ? " is-open" : ""}`} aria-hidden={!s.menuOpen}>
        <NavList mobile onNavigate={() => s.setMenuOpen(false)} />
        <p className="copyright">© 2026 87th Club</p>
      </div>
      <CollectionTitle />
      {s.searchOpen ? (
        <SearchResults q={s.query} />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections/:handle" element={<Collection />} />
          <Route path="/collections/:collection/products/:handle" element={<Product />} />
          <Route path="/products/:handle" element={<Product />} />
          <Route path="/search" element={<Search />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Info page="account" />} />
          <Route path="/pages/:page" element={<Info />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
      <BagDrawer />
    </div>
  );
}
