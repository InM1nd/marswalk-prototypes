import { Howl, Howler } from 'howler';

let unlocked = false;
let muted = false;
let unlockHowl: Howl | null = null;

/** Must run inside a user-gesture handler (Spin click) for iOS Safari. */
export function unlockAudio(): void {
  if (!unlockHowl) {
    // Creating a Howl initializes Howler.ctx; empty wav keeps it silent.
    unlockHowl = new Howl({
      src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='],
      volume: 0,
    });
  }
  void Howler.ctx?.resume?.();
  unlocked = true;
}

export function setMuted(next: boolean): void {
  muted = next;
  Howler.mute(next);
}

export function isMuted(): boolean {
  return muted;
}

function beep(freq: number, duration: number, volume: number): void {
  if (muted || !unlocked) return;
  const ctx = Howler.ctx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  osc.start(now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.stop(now + duration);
}

export function playTick(): void {
  beep(920, 0.04, 0.06);
}

export function playWin(): void {
  beep(523, 0.08, 0.1);
  window.setTimeout(() => beep(784, 0.12, 0.1), 90);
}
