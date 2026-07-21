import { create } from 'zustand';
import type { PlinkoSlot } from '../config/schema';

export type PlinkoStatus = 'idle' | 'dropping' | 'result';

export interface PlinkoStore {
  status: PlinkoStatus;
  dropId: number;
  result: PlinkoSlot | null;
  muted: boolean;
  startDrop: () => void;
  setResult: (slot: PlinkoSlot) => void;
  reset: () => void;
  toggleMuted: () => void;
}

export const usePlinkoStore = create<PlinkoStore>((set, get) => ({
  status: 'idle',
  dropId: 0,
  result: null,
  muted: false,
  startDrop: () => {
    if (get().status === 'dropping') return;
    set((s) => ({ status: 'dropping', result: null, dropId: s.dropId + 1 }));
  },
  setResult: (slot) => {
    if (get().status !== 'dropping') return;
    set({ status: 'result', result: slot });
  },
  reset: () => set({ status: 'idle', result: null }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
}));
