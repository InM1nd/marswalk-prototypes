'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const VERSIONS = [
  { href: '/', label: 'Studio', on: (path: string) => path === '/' },
  { href: '/mini/', label: 'Mini', on: (path: string) => path.startsWith('/mini') },
  { href: '/drums/', label: 'Drums', on: (path: string) => path.startsWith('/drums') },
];

/** Switch between the three Yamaha pitches. Embed is a static product-page mock, so it is a full navigation. */
export function VersionNav({ sticky = false }: { sticky?: boolean }) {
  const path = usePathname() ?? '/';
  const pills = (
    <nav aria-label="Yamaha-Versionen" className="flex min-w-0 items-center gap-1">
      {VERSIONS.map((v) => {
        const current = v.on(path);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={current ? 'page' : undefined}
            className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${current ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            {v.label}
          </Link>
        );
      })}
      <a href="/yamaha-beats/embed-demo.html" className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-white/60 hover:bg-white/10 hover:text-white">
        Embed
      </a>
    </nav>
  );

  if (!sticky) return pills;
  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b0d]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center px-3 py-1.5">{pills}</div>
    </div>
  );
}
