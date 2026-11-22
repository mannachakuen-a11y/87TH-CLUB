import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { paystackConfigured } from '@/lib/paystack';
import CheckoutForm from './CheckoutForm';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage() {
  const methods = await prisma.shippingMethod.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }], select: { id: true, name: true, description: true, price: true } });
  return (
    <div className="wrap pb-10 pt-8">
      <h1 className="t-display mb-8 text-[18vw] sm:text-9xl">Checkout</h1>
      <CheckoutForm methods={methods} paymentsEnabled={paystackConfigured()} />
    </div>
  );
}
