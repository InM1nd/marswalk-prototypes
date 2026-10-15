import { create } from 'zustand';

export interface GameStore {
  status: 'idle' | 'playing' | 'gameover';
  score: number;
  combo: number;
  lives: number;
  slowLeft: number;
  godMode: boolean;
  timeLeft: number;
  muted: boolean;
  prizeUnlocked: boolean;
  unlockPrize: () => void;
  addScore: (points: number) => void;
  bumpCombo: () => number;
  resetCombo: () => void;
  loseLife: () => boolean;
  slow: () => boolean;
  finishRound: (minimumScore: number) => void;
  demoWin: (target: number) => void;
  toggleGodMode: () => void;
  tickTime: (deltaSeconds: number) => void;
  setStatus: (status: GameStore['status']) => void;
  toggleMuted: () => void;
  reset: (durationSeconds: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  score: 0,
  combo: 0,
  lives: 3,
  slowLeft: 0,
  godMode: false,
  timeLeft: 0,
  muted: false,
  prizeUnlocked: false,
  unlockPrize: () => set({ prizeUnlocked: true }),
  addScore: (points) => set((s) => ({ score: Math.max(0, s.score + points) })),
  bumpCombo: () => {
    const combo = get().combo + 1;
    set({ combo });
    return combo;
  },
  resetCombo: () => set({ combo: 0 }),
  loseLife: () => {
    if (get().godMode) return false;
    const lives = Math.max(0, get().lives - 1);
    set({
      lives,
      combo: 0,
      ...(lives === 0 ? { status: 'gameover' as const } : {}),
    });
    return true;
  },
  slow: () => {
    if (get().godMode) return false;
    set({ slowLeft: 2.5, combo: 0 });
    return true;
  },
  finishRound: (minimumScore) =>
    set((s) => ({
      status: 'gameover',
      prizeUnlocked: s.lives > 0 && s.score >= minimumScore,
    })),
  demoWin: (target) => set({ score: target, prizeUnlocked: true, status: 'gameover', lives: 3 }),
  toggleGodMode: () => set((s) => ({ godMode: !s.godMode, slowLeft: 0 })),
  tickTime: (delta) =>
    set((s) => ({
      timeLeft: Math.max(0, s.timeLeft - delta),
      slowLeft: Math.max(0, s.slowLeft - delta),
    })),
  setStatus: (status) => set({ status }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  reset: (duration) =>
    set({
      status: 'idle',
      score: 0,
      combo: 0,
      lives: 3,
      slowLeft: 0,
      timeLeft: duration,
      prizeUnlocked: false,
    }),
}));

export function comboMultiplier(combo: number): number {
  return combo >= 5 ? 2 : 1;
}
