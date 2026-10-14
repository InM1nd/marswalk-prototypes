import type { Metadata, Viewport } from 'next';
import { Caveat_Brush, Inter_Tight } from 'next/font/google';
import './globals.css';

// Helvetica Neue (Drei's face) is used where installed; Inter Tight is the closest free fallback.
const body = Inter_Tight({ subsets: ['latin'], variable: '--nf-body' });
// Stand-in for the proprietary DreiScript brush face.
const script = Caveat_Brush({ subsets: ['latin'], weight: '400', variable: '--nf-script' });

export const metadata: Metadata = {
  title: 'Drei Adventskalender · Prototyp by marswalk',
  description: '24 Türchen, 24 Überraschungen, 1 Jackpot. Interaktiver Adventskalender-Prototyp für Drei Austria.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f2fafd',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${body.variable} ${script.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
