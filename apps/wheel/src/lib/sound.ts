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

/** Short enveloped tone — soft attack, exponential tail. Sine/triangle read as "chime", not "buzzer". */
function tone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0): void {
  if (muted || !unlocked) return;
  const ctx = Howler.ctx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function playTick(): void {
  // Wooden-ish click: a high triangle blip plus a lower body.
  tone(1800, 0.03, 0.05, 'triangle');
  tone(420, 0.05, 0.05, 'sine');
}

export function playWin(): void {
  // C major arpeggio up to the octave, with a soft shimmer on top.
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.35, 0.12, 'triangle', i * 0.09));
  tone(2093, 0.6, 0.03, 'sine', 0.36);
}
