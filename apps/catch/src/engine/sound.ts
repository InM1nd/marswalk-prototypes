// WebAudio synthesis instead of an audio asset bundle. Enveloped sine/triangle tones read
// as "chime", not "buzzer"; impacts are band-passed noise. Callers check the mute flag.
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function getCtx(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

/** Must run inside a user gesture (the Start click) for iOS Safari. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
}

function tone(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
  slideTo?: number,
): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function burst(duration: number, volume: number, freq: number, q = 1): void {
  const c = getCtx();
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const t = c.currentTime;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + duration);
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export const sfx = {
  beat: (step: number) => {
    const notes = [130.81, 164.81, 196, 164.81, 130.81, 196, 220, 196];
    tone(notes[step % notes.length], 0.12, 0.028, 'triangle');
    if (step % 2 === 0) tone(65.4, 0.08, 0.04, 'sine', 0, 40);
  },
  catch: (combo = 1) => {
    const n = NOTES[Math.min(combo - 1, NOTES.length - 2)];
    tone(n, 0.09, 0.1, 'sine');
    tone(n * 1.5, 0.22, 0.09, 'sine', 0.06);
  },
  golden: () => [1046.5, 1318.51, 1567.98].forEach((f, i) => tone(f, 0.25, 0.09, 'sine', i * 0.05)),
  miss: () => tone(240, 0.16, 0.06, 'triangle', 0, 170),
  bad: () => {
    tone(180, 0.32, 0.2, 'triangle', 0, 60);
    burst(0.22, 0.3, 600, 0.7);
  },
  prize: () =>
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.3, 0.12, 'triangle', i * 0.08)),
  win: () =>
    [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => tone(f, 0.45, 0.1, 'sine', i * 0.11)),
};
