import type { Metadata, Viewport } from 'next';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import '@fontsource/archivo-narrow/400.css';
import '@fontsource/archivo-narrow/700.css';
import '@fontsource/gfs-didot/400.css';
import './globals.css';
import { siteUrl } from '@/lib/utils';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'THE 87TH CLUB — Life is art.', template: '%s — THE 87TH CLUB' },
  description: 'THE 87TH CLUB. Street / Culture / Community. Life is art. You are the artist. Make something beautiful of it.',
  openGraph: { type: 'website', siteName: 'THE 87TH CLUB', images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'THE 87TH CLUB' }] },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#0A0A0A', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
