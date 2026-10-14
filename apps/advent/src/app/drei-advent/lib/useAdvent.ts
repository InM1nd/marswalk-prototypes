'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CAMPAIGN, DOORS, type DoorConfig } from '../data/doors-config';

export type SimDate = 'real' | '1' | '6' | '24';
export type DoorState = 'locked' | 'today' | 'available' | 'opened';

export interface Lead {
  email: string;
  consent: boolean;
}

interface Stored {
  opened: number[];
  lead: Lead | null;
  demoMode: boolean;
  simDate: SimDate;
}

const DEFAULTS: Stored = { opened: [], lead: null, demoMode: true, simDate: 'real' };

function load(): Stored {
  try {
    const raw = localStorage.getItem(CAMPAIGN.storageKey);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

// Real dates only count in December; any other month means "not started yet" (day 0).
function dayFor(simDate: SimDate): number {
  if (simDate !== 'real') return Number(simDate);
  const now = new Date();
  return now.getMonth() === 11 ? now.getDate() : 0;
}

export function useAdvent() {
  const [state, setState] = useState<Stored>(DEFAULTS);
  // Static export prerenders once: never touch Date/localStorage until mounted.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CAMPAIGN.storageKey, JSON.stringify(state));
  }, [state, hydrated]);

  const currentDay = useMemo(() => (hydrated ? dayFor(state.simDate) : 0), [hydrated, state.simDate]);

  const doorState = useCallback(
    (door: DoorConfig): DoorState => {
      if (state.opened.includes(door.day)) return 'opened';
      if (door.day === currentDay) return 'today';
      if (!state.demoMode && door.day > currentDay) return 'locked';
      return 'available';
    },
    [state.opened, state.demoMode, currentDay],
  );

  const tickets = useMemo(
    () => DOORS.filter((d) => state.opened.includes(d.day)).reduce((sum, d) => sum + d.prize.tickets, 0),
    [state.opened],
  );

  return {
    hydrated,
    demoMode: state.demoMode,
    simDate: state.simDate,
    lead: state.lead,
    openedCount: state.opened.length,
    tickets,
    currentDay,
    doorState,
    completeDoor: (day: number, lead: Lead) =>
      setState((s) => ({ ...s, lead, opened: s.opened.includes(day) ? s.opened : [...s.opened, day] })),
    setDemoMode: (demoMode: boolean) => setState((s) => ({ ...s, demoMode })),
    setSimDate: (simDate: SimDate) => setState((s) => ({ ...s, simDate })),
    // Remove only our own key: other prototypes share this origin's localStorage.
    reset: () => {
      localStorage.removeItem(CAMPAIGN.storageKey);
      setState(DEFAULTS);
    },
  };
}
