import Link from 'next/link';
import Mascot from '@/components/Mascot';

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <Mascot size={256} className="h-32 w-32" />
      <h1 className="t-display text-7xl sm:text-9xl">Lost?</h1>
      <p className="t-ui text-ink/60">This page doesn’t exist. Perfection is overrated anyway.</p>
      <Link href="/shop" className="btn-red">Back to the shop</Link>
    </div>
  );
}
