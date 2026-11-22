import Link from 'next/link';
import Img from '../Img';
import { formatMoney } from '@/lib/money';
import { productSoldOut, uniqueOptions, type CardProduct } from '@/lib/catalog';

export default function ProductCard({ product: p, priority = false, sizes = '(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw' }: { product: CardProduct; priority?: boolean; sizes?: string }) {
  const [a, b] = p.images;
  const soldOut = productSoldOut(p);
  const { colors } = uniqueOptions(p);
  const sizesAvail = p.variants.filter((v) => v.size);
  return (
    <Link href={`/products/${p.slug}`} className="group block focus-visible:outline-offset-4">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f2f0]">
        {a ? (
          <>
            <Img src={a.url} srcset={a.srcset} alt={a.alt || p.title} sizes={sizes} priority={priority} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500" />
            {b && <Img src={b.url} srcset={b.srcset} alt="" sizes={sizes} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <span className="t-micro text-ink/40">Image coming soon</span>
          </div>
        )}
        <div className="absolute left-0 top-0 flex flex-col items-start gap-1 p-2">
          {soldOut && <span className="t-micro bg-ink px-2 py-1 text-white">Sold out</span>}
          {!soldOut && p.newArrival && <span className="t-micro bg-signal px-2 py-1 text-white">New</span>}
        </div>
        {sizesAvail.length > 0 && !soldOut && (
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full flex-wrap gap-x-3 gap-y-1 bg-white/95 px-3 py-2 transition-transform duration-300 group-hover:translate-y-0 md:flex">
            {sizesAvail.map((v) => (
              <span key={v.id} className={`t-micro ${(v.inventory?.quantity ?? 0) > 0 ? '' : 'text-ink/30 line-through'}`}>
                {v.size}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <h3 className="t-ui leading-tight group-hover:text-signal">{p.title}</h3>
        <p className="t-ui shrink-0 sm:text-right">
          {p.compareAtPrice && p.price !== null && p.compareAtPrice > p.price && <s className="mr-1.5 text-ink/40">{formatMoney(p.compareAtPrice)}</s>}
          {formatMoney(p.price)}
        </p>
      </div>
      {colors.length > 1 && <p className="t-micro mt-0.5 text-ink/50">{colors.length} colours</p>}
      {colors.length === 1 && <p className="t-micro mt-0.5 text-ink/50">{colors[0]}</p>}
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 4 }: { products: CardProduct[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
