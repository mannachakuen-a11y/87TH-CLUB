import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENCIES, type Currency, getProduct } from "./data";

export type BagLine = { handle: string; size: string; qty: number };

type Store = {
  bag: BagLine[];
  add: (handle: string, size: string) => void;
  setQty: (handle: string, size: string, qty: number) => void;
  remove: (handle: string, size: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  bagOpen: boolean;
  setBagOpen: (v: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  bannerHidden: boolean;
  hideBanner: () => void;
  currency: Currency;
  setCurrency: (code: string) => void;
};

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<BagLine[]>(() => load<BagLine[]>("87c.bag", []).filter((l) => getProduct(l.handle)));
  const [bagOpen, setBagOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(() => sessionStorage.getItem("87c.banner") === "1");
  const [currencyCode, setCurrencyCode] = useState(() => load("87c.currency", "USD"));

  useEffect(() => localStorage.setItem("87c.bag", JSON.stringify(bag)), [bag]);
  useEffect(() => localStorage.setItem("87c.currency", JSON.stringify(currencyCode)), [currencyCode]);

  // lock page scroll behind overlays
  useEffect(() => {
    const lock = bagOpen || menuOpen || filterOpen;
    document.documentElement.style.overflow = lock ? "hidden" : "";
  }, [bagOpen, menuOpen, filterOpen]);

  const value = useMemo<Store>(() => {
    const add = (handle: string, size: string) =>
      setBag((b) => {
        const i = b.findIndex((l) => l.handle === handle && l.size === size);
        if (i >= 0) return b.map((l, j) => (j === i ? { ...l, qty: Math.min(l.qty + 1, 10) } : l));
        return [...b, { handle, size, qty: 1 }];
      });
    const setQty = (handle: string, size: string, qty: number) =>
      setBag((b) =>
        qty <= 0
          ? b.filter((l) => !(l.handle === handle && l.size === size))
          : b.map((l) => (l.handle === handle && l.size === size ? { ...l, qty: Math.min(qty, 10) } : l))
      );
    const remove = (handle: string, size: string) => setBag((b) => b.filter((l) => !(l.handle === handle && l.size === size)));
    return {
      bag,
      add,
      setQty,
      remove,
      clear: () => setBag([]),
      count: bag.reduce((n, l) => n + l.qty, 0),
      subtotal: bag.reduce((n, l) => n + (getProduct(l.handle)?.price ?? 0) * l.qty, 0),
      bagOpen,
      setBagOpen,
      menuOpen,
      setMenuOpen,
      searchOpen,
      setSearchOpen,
      query,
      setQuery,
      filterOpen,
      setFilterOpen,
      bannerHidden,
      hideBanner: () => {
        sessionStorage.setItem("87c.banner", "1");
        setBannerHidden(true);
      },
      currency: CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0],
      setCurrency: setCurrencyCode,
    };
  }, [bag, bagOpen, menuOpen, searchOpen, query, filterOpen, bannerHidden, currencyCode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
