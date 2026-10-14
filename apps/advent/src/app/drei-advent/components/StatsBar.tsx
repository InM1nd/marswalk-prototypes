import { Gift } from 'lucide-react';
import { CAMPAIGN, DOORS, MAX_TICKETS } from '../data/doors-config';
import { Asset } from './Asset';

export function StatsBar({ opened, tickets }: { opened: number; tickets: number }) {
  return (
    <div className="grid gap-3">
      <section aria-label="Dein Fortschritt" className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgb(15_39_59/0.08)]">
        <div className="grid grid-cols-2 divide-x divide-ice-2">
          <div>
            <p className="text-4xl font-bold tracking-tighter">
              {opened}
              <span className="text-navy/25">/{DOORS.length}</span>
            </p>
            <p className="mt-1 text-sm text-navy/60">Türchen geöffnet</p>
          </div>
          <div className="pl-5">
            <p className="text-4xl font-bold tracking-tighter text-drei">{tickets}</p>
            <p className="mt-1 text-sm text-navy/60">Glückslose gesammelt</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ice-2" role="progressbar" aria-label="Lose gesammelt" aria-valuenow={tickets} aria-valuemin={0} aria-valuemax={MAX_TICKETS}>
          <div className="h-full rounded-full bg-gradient-to-r from-drei to-lime transition-[width] duration-700" style={{ width: `${(tickets / MAX_TICKETS) * 100}%` }} />
        </div>
      </section>

      <section aria-label="Hauptpreis" className="relative flex min-h-40 items-center overflow-hidden rounded-2xl bg-gradient-to-br from-drei-sky via-drei to-drei-deep p-5 text-white shadow-[0_10px_28px_rgb(0_119_157/0.3)]">
        <Asset
          file="hero.webp"
          className="absolute inset-0 h-full w-full object-cover object-right"
          fallback={
            <span className="diamond absolute top-1/2 right-3 h-28 w-28 -translate-y-1/2 text-navy [--diamond:var(--color-lime)]">
              <Gift size={40} strokeWidth={1.75} />
            </span>
          }
        />
        <span className="absolute inset-0 bg-gradient-to-r from-drei-deep via-drei/85 to-transparent" aria-hidden />
        <div className="relative z-10 max-w-[60%]">
          <p className="font-script text-3xl leading-none text-lime">Weihnachts-Jackpot</p>
          <p className="mt-2 text-lg leading-tight font-bold">{CAMPAIGN.grandPrize}</p>
          <p className="mt-1.5 text-xs text-white/85">Jedes Türchen = mehr Lose für die Verlosung am 24.12.</p>
        </div>
      </section>
    </div>
  );
}
