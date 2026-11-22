'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CartView } from '@/lib/cart';

type Ctx = {
  cart: CartView | null;
  loading: boolean;
  bagOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  bump: number;
  setBagOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  refresh: () => Promise<void>;
  add: (variantId: string, quantity: number) => Promise<string | null>;
  update: (itemId: string, quantity: number) => Promise<string | null>;
  remove: (itemId: string) => Promise<string | null>;
};

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}

async function send(url: string, method: string, body?: unknown): Promise<{ cart?: CartView; error?: string }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || 'Something went wrong', cart: data.cart };
    return data;
  } catch {
    return { error: 'Network error — check your connection' };
  }
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bump, setBump] = useState(0);

  const refresh = useCallback(async () => {
    const r = await send('/api/cart', 'GET');
    if (r.cart) setCart(r.cart);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // lock page scroll while an overlay is open
  useEffect(() => {
    const open = bagOpen || searchOpen || menuOpen;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBagOpen(false);
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bagOpen, searchOpen, menuOpen]);

  const run = useCallback(async (p: Promise<{ cart?: CartView; error?: string }>) => {
    setLoading(true);
    const r = await p;
    setLoading(false);
    if (r.cart) setCart(r.cart);
    return r.error ?? null;
  }, []);

  const add = useCallback(
    async (variantId: string, quantity: number) => {
      const err = await run(send('/api/cart', 'POST', { variantId, quantity }));
      if (!err) {
        setBump((b) => b + 1);
        setBagOpen(true);
      }
      return err;
    },
    [run],
  );
  const update = useCallback((itemId: string, quantity: number) => run(send(`/api/cart/${itemId}`, 'PATCH', { quantity })), [run]);
  const remove = useCallback((itemId: string) => run(send(`/api/cart/${itemId}`, 'DELETE')), [run]);

  return (
    <StoreCtx.Provider value={{ cart, loading, bagOpen, searchOpen, menuOpen, bump, setBagOpen, setSearchOpen, setMenuOpen, refresh, add, update, remove }}>
      {children}
    </StoreCtx.Provider>
  );
}
