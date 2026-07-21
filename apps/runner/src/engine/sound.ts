// No art/audio pipeline for this prototype — WebAudio oscillator beeps
// instead of an mp3 asset bundle (native platform feature over shipping
// binary assets we'd have to source). Swap for @pixi/sound + real sfx when a
// client's brand audio is ready.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

// Unlocks on first user gesture (the "Играть" click) — matches the autoplay
// workaround used in prototype 1.
export function unlockAudio(): void {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

function beep(freq: number, durationMs: number, type: OscillatorType = 'sine') {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

export const sfx = {
  jump: () => beep(520, 90, 'triangle'),
  coin: (combo = 1) => beep(880 + Math.min(combo, 8) * 40, 120, 'square'),
  nearMiss: () => beep(660, 80, 'triangle'),
  hit: () => beep(120, 220, 'sawtooth'),
};
