'use client';

import { Ticket } from 'lucide-react';
import { AdventGrid } from './components/AdventGrid';
import { Asset } from './components/Asset';
import { PitchControls } from './components/PitchControls';
import { Snowfall } from './components/Snowfall';
import { StatsBar } from './components/StatsBar';
import { CAMPAIGN } from './data/doors-config';
import { useAdvent } from './lib/useAdvent';

export default function DreiAdventPage() {
  const advent = useAdvent();

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <Asset file="bg-desktop.webp" className="hidden h-full w-full object-cover lg:block" />
        <Asset file="bg-mobile.webp" className="h-full w-full object-cover lg:hidden" />
      </div>
      <Snowfall />

      <div className="relative z-10">
        <PitchControls
          demoMode={advent.demoMode}
          simDate={advent.simDate}
          onDemoMode={advent.setDemoMode}
          onSimDate={advent.setSimDate}
          onReset={advent.reset}
        />

        <header className="border-b border-ice-2 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:h-20">
            <span className="text-3xl font-bold tracking-tighter lg:text-4xl">{CAMPAIGN.brand}</span>
            <span className="h-6 w-px bg-ice-2" aria-hidden />
            <span className="text-sm font-bold lg:text-base">Adventskalender</span>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-drei px-4 py-2 text-sm font-bold text-white lg:text-base">
              <Ticket size={18} /> {advent.tickets} {advent.tickets === 1 ? 'Los' : 'Lose'}
            </span>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-16 lg:pt-14">
          <aside className="self-start lg:sticky lg:top-28">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-drei-deep shadow-sm">Advent {CAMPAIGN.year}</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.02] font-bold tracking-tight lg:text-6xl">
              {CAMPAIGN.headline[0]}
              <span className="block font-script text-[1.2em] leading-[1.05] font-normal tracking-normal text-drei">{CAMPAIGN.headline[1]}</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-navy/70 lg:text-lg">{CAMPAIGN.intro}</p>
            <div className="mt-6">
              <StatsBar opened={advent.openedCount} tickets={advent.tickets} />
            </div>
          </aside>

          <section aria-label="Adventskalender">
            <AdventGrid advent={advent} />
          </section>
        </main>

        <footer className="px-4 pb-10 text-center text-xs text-navy/45">
          Prototyp von marswalk.media für {CAMPAIGN.brand}. Gewinne und Codes sind fiktiv. Teilnahmebedingungen &amp; Datenschutz gelten.
        </footer>
      </div>
    </div>
  );
}
