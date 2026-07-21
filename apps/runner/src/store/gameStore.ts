import { create } from 'zustand';

// Written only by RunnerEngine's game loop (60fps score/time updates) — a
// reducer-dispatch round trip through React for every tick would be wasted
// work. React components only ever read via selectors (see HUD.tsx).
export interface GameStore {
  status: 'idle' | 'playing' | 'gameover';
  score: number;
  combo: number;
  timeLeft: number;
  muted: boolean;
  addScore: (points: number) => void;
  bumpCombo: () => number;
  resetCombo: () => void;
  tickTime: (deltaSeconds: number) => void;
  setStatus: (status: GameStore['status']) => void;
  toggleMuted: () => void;
  reset: (durationSeconds: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  score: 0,
  combo: 0,
  timeLeft: 0,
  muted: false,
  addScore: (points) => set((s) => ({ score: s.score + points })),
  bumpCombo: () => {
    const combo = get().combo + 1;
    set({ combo });
    return combo;
  },
  resetCombo: () => set({ combo: 0 }),
  tickTime: (deltaSeconds) =>
    set((s) => ({ timeLeft: Math.max(0, s.timeLeft - deltaSeconds) })),
  setStatus: (status) => set({ status }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  reset: (durationSeconds) =>
    set({ status: 'idle', score: 0, combo: 0, timeLeft: durationSeconds }),
}));

export function comboMultiplier(combo: number): number {
  return 1 + Math.floor(Math.max(0, combo - 1) / 3);
}
