import type { Metadata, Viewport } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter_Tight({ subsets: ['latin'], variable: '--nf-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--nf-mono' });

// Shared beat links unfurl with this card. Vercel sets the production host at build time.
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5191';
const OG = { url: '/yamaha-beats/og.jpg', width: 1200, height: 630, alt: 'Yamaha SQ-16 Beat Studio' };
const TITLE = 'Yamaha Beat Studio · Bau deinen Beat';
const DESCRIPTION = 'Bau deinen Beat auf einer Groovebox im Browser und hol dir -10% im Yamaha Music Store.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', locale: 'de_DE', images: [OG] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG.url] },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0b0d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
