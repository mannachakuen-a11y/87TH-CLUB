import catalog from "./data/catalog.json";

/** Resolve a public asset path ("/images/..") against the build base (relative in the static preview build). */
export const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, "");

export type Product = {
  handle: string;
  family: string;
  title: string;
  colour: string;
  colourGroup: string;
  category: string;
  price: number;
  sizes: string[];
  soldOut: string[];
  newArrival: boolean;
  position: number;
  images: string[];
  description: string;
  details: string[];
};

export const products: Product[] = (catalog.products as Product[]).map((p) => ({ ...p, images: p.images.map(asset) }));
export const collections: { handle: string; title: string }[] = catalog.collections;
export const categoryImages: Record<string, string> = Object.fromEntries(Object.entries(catalog.categoryImages).map(([k, v]) => [k, asset(v)]));
export const callouts: string[] = catalog.callouts.map((c) => asset(`/images/${c}`));

export const NAV = collections; // New Arrivals ... Accessories, in sidebar order

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  collections.filter((c) => c.handle !== "new-arrivals").map((c) => [c.handle, c.title])
);

export function getProduct(handle: string) {
  return products.find((p) => p.handle === handle);
}

export function familyOf(p: Product) {
  return products.filter((q) => q.family === p.family);
}

export function isAvailable(p: Product) {
  return p.soldOut.length < p.sizes.length;
}

export function collectionProducts(handle: string): { title: string; items: Product[] } | null {
  if (handle === "new-arrivals") return { title: "New Arrivals", items: products.filter((p) => p.newArrival) };
  if (handle === "all") return { title: "View All", items: [...products] };
  if (handle === "archive") return { title: "Archive", items: products.filter((p) => !p.newArrival) };
  const c = collections.find((x) => x.handle === handle);
  if (!c) return null;
  return { title: c.title, items: products.filter((p) => p.category === handle) };
}

export function searchProducts(q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const hay = `${p.title} ${p.colour} ${p.colourGroup} ${CATEGORY_LABEL[p.category] ?? ""} ${p.category} ${p.description}`.toLowerCase();
    return terms.every((t) => hay.includes(t) || hay.includes(t.replace(/s$/, "")));
  });
}

export const CURRENCIES = [
  { code: "USD", region: "US", symbol: "$", rate: 1 },
  { code: "GBP", region: "UK", symbol: "£", rate: 0.79 },
  { code: "EUR", region: "EU", symbol: "€", rate: 0.93 },
  { code: "JPY", region: "JP", symbol: "¥", rate: 150 },
  { code: "AUD", region: "AU", symbol: "$", rate: 1.52 },
] as const;
export type Currency = (typeof CURRENCIES)[number];

export function formatPrice(usd: number, c: Currency) {
  const v = usd * c.rate;
  const rounded = c.code === "JPY" ? Math.round(v / 100) * 100 : Math.round(v);
  return `${c.symbol}${rounded.toLocaleString("en-US")}`;
}

export const FREE_SHIPPING_USD = 200;
