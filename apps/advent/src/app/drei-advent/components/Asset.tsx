'use client';

import {
  BatteryCharging, CardSim, Cloud, Coins, CreditCard, Headphones, type LucideIcon, Music, Plane,
  Router, Signal, Smartphone, Tablet, Truck, Watch,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PrizeIconName } from '../data/doors-config';
import { asset } from '../lib/assets';

// Generated art lives in public/assets (see ASSET_BRIEF.md). Until a file exists,
// the fallback renders instead, so the prototype works with or without the art.
export function Asset({ file, className, fallback = null }: { file: string; className?: string; fallback?: React.ReactNode }) {
  const [ok, setOk] = useState(true);
  const ref = useRef<HTMLImageElement>(null);

  // A prerendered <img> can fail before hydration attaches onError: check once on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setOk(false);
  }, []);

  if (!ok) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={asset(file)} alt="" draggable={false} onError={() => setOk(false)} className={className} />;
}

const ICONS: Record<PrizeIconName, LucideIcon> = {
  data: Signal, headphones: Headphones, music: Music, plane: Plane, giftcard: CreditCard,
  smartwatch: Watch, smartphone: Smartphone, sim: CardSim, powerbank: BatteryCharging,
  coins: Coins, cloud: Cloud, delivery: Truck, tablet: Tablet, router: Router,
};

export function PrizeIcon({ icon, className = '' }: { icon: PrizeIconName; className?: string }) {
  const Icon = ICONS[icon];
  return (
    <Asset
      file={`icon-${icon}.webp`}
      className={`object-contain drop-shadow-[0_8px_14px_rgb(15_39_59/0.18)] ${className}`}
      fallback={
        <span className={`grid place-items-center rounded-[30%] bg-gradient-to-br from-drei-sky to-drei-deep text-white shadow-[0_8px_18px_rgb(0_119_157/0.3)] ${className}`}>
          <Icon className="h-1/2 w-1/2" strokeWidth={1.75} />
        </span>
      }
    />
  );
}
