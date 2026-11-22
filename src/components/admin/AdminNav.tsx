'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/utils';

const NAV = [
  ['/admin', 'Overview'],
  ['/admin/orders', 'Orders'],
  ['/admin/products', 'Products'],
  ['/admin/collections', 'Collections & drops'],
  ['/admin/categories', 'Categories'],
  ['/admin/customers', 'Customers'],
  ['/admin/discounts', 'Discounts'],
  ['/admin/shipping', 'Delivery options'],
  ['/admin/subscribers', 'Newsletter'],
  ['/admin/messages', 'Messages'],
  ['/admin/import', 'Import products'],
  ['/admin/settings', 'Settings'],
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible" aria-label="Admin">
      {NAV.map(([href, label]) => {
        const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={cx('whitespace-nowrap rounded px-3 py-2 text-sm', active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100')}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
