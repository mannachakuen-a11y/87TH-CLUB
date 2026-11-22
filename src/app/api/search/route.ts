import { listProducts, productSoldOut } from '@/lib/catalog';
import { formatMoney } from '@/lib/money';
import { json } from '@/lib/http';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < 2) return json({ results: [] });
  const { items } = await listProducts({ q, page: 1 });
  return json({
    results: items.slice(0, 12).map((p) => ({ slug: p.slug, title: p.title, price: formatMoney(p.price), image: p.images[0]?.srcset ? ((p.images[0].srcset as Record<string, string>)['480'] ?? p.images[0].url) : (p.images[0]?.url ?? null), soldOut: productSoldOut(p) })),
  });
}
