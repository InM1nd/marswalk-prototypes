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

let noise: AudioBuffer | null = null;

/** Scratch grit — a band-passed white-noise burst sounds like a coin on foil. */
export function playGrit(): void {
  if (muted || !unlocked) return;
  const ctx = Howler.ctx;
  if (!ctx) return;
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.5;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2500 + Math.random() * 1500;
  filter.Q.value = 0.9;
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.08);
}

export function playWin(): void {
  // C major arpeggio up to the octave, with a soft shimmer on top.
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.35, 0.12, 'triangle', i * 0.09));
  tone(2093, 0.6, 0.03, 'sine', 0.36);
}
