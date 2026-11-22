import type { Metadata } from 'next';
import BagPage from './BagPage';

export const metadata: Metadata = { title: 'Bag', robots: { index: false } };

export default function Page() {
  return <BagPage />;
}
