'use client';
import Link from 'next/link';
import { BagLines } from '@/components/store/Overlays';
import { useStore } from '@/components/store/StoreProvider';
import { formatMoney } from '@/lib/money';

export default function BagPage() {
  const { cart } = useStore();
  return (
    <div className="wrap pb-10 pt-8">
      <h1 className="t-display mb-8 text-[18vw] sm:text-9xl">Bag</h1>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="border-t-2 border-ink lg:col-span-8">
          <BagLines />
        </div>
        {cart && cart.lines.length > 0 && (
          <aside className="lg:col-span-4">
            <div className="bg-[#f2f2f0] p-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
              <h2 className="t-ui mb-4">Summary</h2>
              <div className="t-ui flex justify-between border-b border-ink/15 pb-3">
                <span>Subtotal ({cart.count})</span>
                <span>{formatMoney(cart.subtotal, cart.currency)}</span>
              </div>
              <p className="t-micro mt-3 text-ink/60">Delivery and discount codes are applied at checkout.</p>
              {cart.purchasable ? (
                <Link href="/checkout" className="btn-red mt-6 w-full">Checkout</Link>
              ) : (
                <p className="t-micro mt-6 bg-signal px-3 py-2 text-white">Some items need attention before checkout.</p>
              )}
              <Link href="/shop" className="btn-line mt-2 w-full">Continue shopping</Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
