// Zero-dependency groovebox engine on the native Web Audio API: four procedural
// voices with selectable patches, a lookahead step scheduler, a resonant master low-pass and an analyser.
//
// Signal path: voices -> bus -> master LPF -> compressor -> master gain -> analyser -> out

export const STEPS = 16;

export const TRACKS = [
  { id: 'lead', name: 'LEAD', pad: 'LEAD', color: '#9D4EDD' },
  { id: 'bass', name: 'SUB BASS', pad: 'BASS', color: '#00F5D4' },
  { id: 'snare', name: 'SNARE', pad: 'SNARE', color: '#FF5500' },
  { id: 'hat', name: 'HI-HAT', pad: 'HAT', color: '#10B981' },
] as const;

/** pattern[track][step] */
export type Pattern = boolean[][];

/** Pitches per step, so presets can carry their own chords and bass line (MIDI note numbers). */
export interface Sound {
  lead: number[][];
  bass: number[];
}

export const emptyPattern = (): Pattern => TRACKS.map(() => Array<boolean>(STEPS).fill(false));

export const CUTOFF_MIN = 200;
export const CUTOFF_MAX = 18000;
/** 0..1 knob position -> Hz on a log scale, so the sweep sounds even. */
export const cutoffFromNorm = (n: number) => CUTOFF_MIN * (CUTOFF_MAX / CUTOFF_MIN) ** n;

// Voice patches: parameter sets for the four synth voices. Hardware-style "voice select" per track.
export type LeadKind = 'fm' | 'supersaw' | 'chip' | 'vox' | 'wobble' | 'zap';
export interface FmParams {
  /** modulator:carrier frequency ratio */
  ratio: number;
  /** modulation index at drive 0, plus extra index at full drive */
  index: number;
  driveIndex: number;
  indexDecay: number;
  /** optional second modulator [ratio, index, decay], e.g. the DX7 e-piano "tine" */
  tine: readonly [number, number, number] | null;
}
export interface LeadPatch {
  name: string;
  kind: LeadKind;
  attack: number;
  decay: number;
  gain: number;
  /** send into the tempo-synced dotted-8th delay, 0..1 */
  delay: number;
  fm?: FmParams;
}
export interface BassPatch {
  name: string;
  wave: OscillatorType;
  /** cents for each body oscillator; two detuned saws = Reese */
  detune: readonly number[];
  bodyGain: number;
  filterPeak: number;
  filterDecay: number;
  q: number;
  /** sine sub starts at f * punch and drops to f: the kick-like thump */
  punch: number;
  punchDecay: number;
  sub: number;
  decay: number;
}
export interface SnarePatch {
  name: string;
  hp: number;
  lp: number;
  noiseGain: number;
  noiseDecay: number;
  /** clap = several short noise bursts */
  bursts: number;
  body: readonly [number, number, number, number] | null; // [startHz, endHz, decay, gain]
}
export interface HatPatch {
  name: string;
  metallic: boolean;
  bp: number;
  hp: number;
  attack: number;
  decay: number;
  gain: number;
}

// Order matters: patch indices are stored in shared links, so only append.
export const LEAD_PATCHES: LeadPatch[] = [
  { name: 'DX E.PIANO', kind: 'fm', attack: 0.004, decay: 1.1, gain: 0.22, delay: 0.1, fm: { ratio: 1, index: 1.5, driveIndex: 5, indexDecay: 0.9, tine: [14, 0.7, 0.08] } },
  { name: 'FM BELLS', kind: 'fm', attack: 0.002, decay: 2.2, gain: 0.13, delay: 0.3, fm: { ratio: 3.5, index: 2.5, driveIndex: 4, indexDecay: 1.6, tine: null } },
  { name: 'SYNTH BRASS', kind: 'fm', attack: 0.05, decay: 0.55, gain: 0.15, delay: 0.1, fm: { ratio: 1, index: 2, driveIndex: 3, indexDecay: 0.35, tine: null } },
  { name: 'PLUCK', kind: 'fm', attack: 0.002, decay: 0.3, gain: 0.22, delay: 0.3, fm: { ratio: 2, index: 2, driveIndex: 4, indexDecay: 0.12, tine: null } },
  { name: 'MARIMBA', kind: 'fm', attack: 0.002, decay: 0.38, gain: 0.26, delay: 0.15, fm: { ratio: 4, index: 1.2, driveIndex: 2, indexDecay: 0.05, tine: null } },
  { name: 'ORGAN', kind: 'fm', attack: 0.012, decay: 0.7, gain: 0.15, delay: 0, fm: { ratio: 2, index: 0.6, driveIndex: 1.5, indexDecay: 1, tine: [3, 0.35, 1] } },
  { name: 'SUPERSAW', kind: 'supersaw', attack: 0.01, decay: 0.6, gain: 0.16, delay: 0.25 },
  { name: 'CHIP ARP', kind: 'chip', attack: 0.002, decay: 0.42, gain: 0.1, delay: 0.3 },
  { name: 'VOX CHOIR', kind: 'vox', attack: 0.07, decay: 0.9, gain: 0.3, delay: 0.2 },
  { name: 'WOBBLE', kind: 'wobble', attack: 0.005, decay: 0.55, gain: 0.2, delay: 0 },
  { name: 'LASER ZAP', kind: 'zap', attack: 0.002, decay: 0.2, gain: 0.13, delay: 0.4 },
];
export const BASS_PATCHES: BassPatch[] = [
  { name: 'SUB BASS', wave: 'sawtooth', detune: [0], bodyGain: 0.35, filterPeak: 300, filterDecay: 0.25, q: 5, punch: 4, punchDecay: 0.045, sub: 1, decay: 0.38 },
  { name: 'ACID 303', wave: 'square', detune: [0], bodyGain: 0.5, filterPeak: 700, filterDecay: 0.18, q: 17, punch: 1, punchDecay: 0.01, sub: 0.2, decay: 0.24 },
  { name: 'REESE', wave: 'sawtooth', detune: [-14, 14], bodyGain: 0.3, filterPeak: 500, filterDecay: 0.7, q: 3, punch: 1, punchDecay: 0.01, sub: 0.6, decay: 0.5 },
  { name: '808 BOOM', wave: 'sine', detune: [0], bodyGain: 0, filterPeak: 200, filterDecay: 0.2, q: 1, punch: 3.5, punchDecay: 0.07, sub: 1.15, decay: 0.95 },
  { name: 'SLAP BASS', wave: 'square', detune: [0], bodyGain: 0.4, filterPeak: 1400, filterDecay: 0.1, q: 8, punch: 2, punchDecay: 0.02, sub: 0.7, decay: 0.3 },
];
export const SNARE_PATCHES: SnarePatch[] = [
  { name: 'SNARE', hp: 1300, lp: 16000, noiseGain: 0.42, noiseDecay: 0.17, bursts: 1, body: [260, 140, 0.11, 0.38] },
  { name: 'CLAP', hp: 900, lp: 9000, noiseGain: 0.5, noiseDecay: 0.2, bursts: 3, body: null },
  { name: 'RIMSHOT', hp: 2200, lp: 12000, noiseGain: 0.22, noiseDecay: 0.03, bursts: 1, body: [900, 780, 0.045, 0.32] },
  { name: 'LO-FI SNARE', hp: 600, lp: 3200, noiseGain: 0.36, noiseDecay: 0.26, bursts: 1, body: [200, 160, 0.14, 0.3] },
];
export const HAT_PATCHES: HatPatch[] = [
  { name: 'CLOSED HAT', metallic: true, bp: 10000, hp: 7000, attack: 0.001, decay: 0.05, gain: 0.16 },
  { name: 'OPEN HAT', metallic: true, bp: 10000, hp: 7000, attack: 0.001, decay: 0.32, gain: 0.11 },
  { name: 'SHAKER', metallic: false, bp: 6500, hp: 4000, attack: 0.018, decay: 0.07, gain: 0.24 },
  { name: 'RIDE', metallic: true, bp: 6000, hp: 3500, attack: 0.001, decay: 0.9, gain: 0.06 },
];
/** In TRACKS order. */
export const PATCHES = [LEAD_PATCHES, BASS_PATCHES, SNARE_PATCHES, HAT_PATCHES] as const;

/** 80s PCM-style drum voices for the pocket drum machine (synthesized, no samples). */
export type RxName = 'kick' | 'snare' | 'clap' | 'rim' | 'chat' | 'ohat' | 'tom' | 'cow';

/** Sound-set tweaks for the drum voices: tuning and length of the body, snap of the noise, hat length. */
export interface RxKit {
  kickTune: number;
  kickDecay: number;
  snareTune: number;
  snareSnap: number;
  hatDecay: number;
  tomTune: number;
}
export const CLASSIC_KIT: RxKit = { kickTune: 1, kickDecay: 1, snareTune: 1, snareSnap: 1, hatDecay: 1, tomTune: 1 };

/** Knob bank values, all 0..1. */
export interface Mix {
  reso: number;
  echo: number;
  space: number;
  crush: number;
  level: number;
}
export const DEFAULT_MIX: Mix = { reso: 0.3, echo: 0.45, space: 0.2, crush: 0, level: 0.8 };
/** RESO knob -> filter Q */
export const qFromReso = (n: number) => 0.7 + n * 17;

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead of the clock
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

export class YamahaAudioEngine {
  pattern: Pattern = emptyPattern();
  sound: Sound = { lead: Array.from({ length: STEPS }, () => [69]), bass: Array(STEPS).fill(33) };
  bpm = 124;
  swing = 0.15;
  /** 0..1, scales the FM modulation index and the bass filter envelope. */
  drive = 0.5;
  /** Selected patch index per track (into PATCHES). */
  patches = [0, 0, 0, 0];
  playing = false;
  /** Sound set used by the 'rx' drum voices. */
  rxKit: RxKit = CLASSIC_KIT;
  /** Tracks silenced by the DROP effect (sequencer only; live pads still play). */
  muted = [false, false, false, false];
  /** Fires on the audio clock (not the scheduling clock) with the step that is sounding; -1 on stop. */
  onStep?: (step: number) => void;
  /** Fires from the scheduler for every step it queues, with the exact audio time: lets a caller layer its own voices on the clock. */
  onSchedule?: (step: number, time: number) => void;

  private ctx: AudioContext | null = null;
  private bus!: GainNode;
  private filter!: BiquadFilterNode;
  private hp!: BiquadFilterNode;
  private master!: GainNode;
  private delaySend!: GainNode;
  private delay!: DelayNode;
  private echoWet!: GainNode;
  private echoFb!: GainNode;
  private reverbWet!: GainNode;
  private crusher!: WaveShaperNode;
  mix: Mix = { ...DEFAULT_MIX };
  private recorder: MediaStreamAudioDestinationNode | null = null;
  private riser: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private stutter: { from: number; len: number } | null = null;
  /** <1 while TAPE STOP winds the sequencer down */
  private tempoFactor = 1;
  private tapeStop = false;
  analyser: AnalyserNode | null = null;
  private noise!: AudioBuffer;
  private cutoff = CUTOFF_MAX;
  private step = 0;
  private nextTime = 0;
  private raf = 0;
  private ui: { step: number; time: number }[] = [];
  private current = 0;
  private currentStart = 0;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();

    this.bus = ctx.createGain();
    this.bus.gain.value = 0.8;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = qFromReso(this.mix.reso);
    this.filter.frequency.value = this.cutoff;
    this.hp = ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 20;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.78;
    // bit-crusher sits first so everything after it (filter, reverb) colours the crushed signal
    this.crusher = ctx.createWaveShaper();
    this.bus.connect(this.crusher).connect(this.hp).connect(this.filter).connect(comp).connect(this.master).connect(this.analyser).connect(ctx.destination);

    // dotted-8th feedback delay for leads, darkened on every repeat
    this.delaySend = ctx.createGain();
    this.delay = ctx.createDelay(2);
    const fb = (this.echoFb = ctx.createGain());
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 3200;
    const wet = (this.echoWet = ctx.createGain());
    this.delaySend.connect(this.delay).connect(dark).connect(fb).connect(this.delay);
    dark.connect(wet).connect(this.hp);

    // SPACE: convolution reverb on a generated 2.6 s stereo noise tail, fed post-crusher
    const reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    reverb.buffer = ir;
    this.reverbWet = ctx.createGain();
    this.crusher.connect(reverb).connect(this.reverbWet).connect(this.hp);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx;
    this.setMix(this.mix);
    return ctx;
  }

  /** Apply the knob bank. Safe before audio starts: values are kept and applied on first use. */
  setMix(mix: Mix) {
    this.mix = mix;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.filter.Q.setTargetAtTime(qFromReso(mix.reso), now, 0.03);
    this.echoWet.gain.setTargetAtTime(mix.echo * 1.1, now, 0.05);
    this.echoFb.gain.setTargetAtTime(0.15 + mix.echo * 0.45, now, 0.05);
    this.reverbWet.gain.setTargetAtTime(mix.space * 1.4, now, 0.05);
    if (!this.tapeStop) this.master.gain.setTargetAtTime(mix.level * 1.1, now, 0.03);
    this.crusher.curve = crushCurve(mix.crush);
  }

  /** iOS/Safari only allow audio after a user gesture: resume and play one silent sample. */
  async unlock() {
    const ctx = this.ensure();
    if (ctx.state !== 'running') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  }

  async start() {
    await this.unlock();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx!.currentTime + 0.06;
    this.loop();
  }

  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.ui = [];
    this.onStep?.(-1);
  }

  /** Smoothly move the master low-pass; a long glide is used for the "VIP room" muffle. */
  setCutoff(hz: number, glide = 0.03) {
    this.cutoff = hz;
    if (this.ctx) this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, glide);
  }

  /** Live audio of the master output, for recording the beat as a video. */
  recordStream(): MediaStream {
    const ctx = this.ensure();
    if (!this.recorder) {
      this.recorder = ctx.createMediaStreamDestination();
      this.analyser!.connect(this.recorder);
    }
    return this.recorder.stream;
  }

  get currentStep() {
    return this.playing ? this.current : -1;
  }

  /** Playhead as a fractional step (0..16), -1 when stopped. Round it to quantize a live tap. */
  get position() {
    if (!this.playing || !this.ctx) return -1;
    const dur = 60 / this.bpm / 4;
    return this.current + Math.min(1, Math.max(0, (this.ctx.currentTime - this.currentStart) / dur));
  }

  /** Restart the pattern from step 1 (used to start a recording on the downbeat). */
  restart() {
    if (!this.ctx) return;
    this.step = 0;
    this.ui = [];
    this.nextTime = this.ctx.currentTime + 0.05;
  }

  /** Hold-to-play performance effects. */
  setFx(fx: 'stutter' | 'tape' | 'riser' | 'drop', on: boolean) {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    if (fx === 'stutter') {
      // beat repeat: loop the current 1/8 note; the clock keeps running so release lands in time
      this.stutter = on ? { from: this.step, len: 2 } : null;
    } else if (fx === 'tape') {
      this.tapeStop = on;
      if (on) {
        this.filter.frequency.setTargetAtTime(350, now, 0.25);
        this.master.gain.setTargetAtTime(0.0001, now + 0.2, 0.3);
      } else {
        this.tempoFactor = 1;
        this.filter.frequency.setTargetAtTime(this.cutoff, now, 0.02);
        this.master.gain.setTargetAtTime(this.mix.level * 1.1, now, 0.02);
      }
    } else if (fx === 'drop') {
      // hold: bass gone, thin high-passed mix. release: everything slams back in.
      this.muted = [false, on, false, false];
      this.hp.frequency.setTargetAtTime(on ? 700 : 20, now, on ? 0.08 : 0.01);
      if (!on) this.impact(now);
    } else if (on && !this.riser) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, now);
      bp.frequency.exponentialRampToValueAtTime(9000, now + 6);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.32, now + 6);
      src.connect(bp).connect(gain).connect(this.bus);
      src.start(now);
      this.riser = { src, gain };
    } else if (!on && this.riser) {
      this.riser.gain.gain.setTargetAtTime(0.0001, now, 0.03);
      this.riser.src.stop(now + 0.3);
      this.riser = null;
      this.impact(now);
    }
  }

  /** Sub boom + noise crash, fired when RISER or DROP is released. */
  private impact(t: number) {
    const ctx = this.ctx!;
    const boom = ctx.createOscillator();
    boom.frequency.setValueAtTime(110, t);
    boom.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const bEnv = this.env(t, 0.7, 1.1);
    boom.connect(bEnv).connect(this.bus);
    boom.start(t);
    boom.stop(t + 1.2);
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const nEnv = this.env(t, 0.22, 0.9);
    n.connect(hp).connect(nEnv).connect(this.bus);
    n.start(t);
    n.stop(t + 1);
  }

  /** Finger-drum a voice now, on top of the sequencer. velocity 0..1 */
  async trigger(track: number, velocity: number) {
    await this.unlock();
    this.voice(track, this.ctx!.currentTime + 0.005, velocity, this.playing ? this.current : 0);
  }

  /** Play any patch (not just the track's selected one) at an audio time. note is MIDI, used by lead and bass. */
  playAt(kind: 'lead' | 'bass' | 'snare' | 'hat' | 'rx', patch: LeadPatch | BassPatch | SnarePatch | HatPatch | RxName, t: number, vel: number, note: number | number[] = 60) {
    const first = Array.isArray(note) ? note[0] : note;
    if (kind === 'rx') this.rx(patch as RxName, t, vel);
    else if (kind === 'lead') this.lead(t, Array.isArray(note) ? note : [note], vel, patch as LeadPatch);
    else if (kind === 'bass') this.bass(t, first, vel, patch as BassPatch);
    else if (kind === 'snare') this.snare(t, vel, patch as SnarePatch);
    else this.hat(t, vel, patch as HatPatch);
  }

  /** Tight, punchy, slightly metallic drums in the spirit of early digital drum machines. Run through the crusher for 12-bit grit. */
  private rx(name: RxName, t: number, vel: number) {
    const ctx = this.ctx!;
    const k = this.rxKit;
    const tone = (type: OscillatorType, f0: number, f1: number, drop: number, decay: number, gain: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + drop);
      o.connect(this.env(t, gain * vel, decay, 0.001)).connect(this.bus);
      o.start(t);
      o.stop(t + decay + 0.05);
    };
    const noise = (type: BiquadFilterType, freq: number, q: number, decay: number, gain: number, at = t) => {
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      n.connect(f).connect(this.env(at, gain * vel, decay, 0.001)).connect(this.bus);
      n.start(at);
      n.stop(at + decay + 0.05);
    };
    switch (name) {
      case 'kick':
        tone('sine', 165 * k.kickTune, 46 * k.kickTune, 0.07, 0.34 * k.kickDecay, 1.95);
        tone('triangle', 950, 120, 0.014, 0.03, 0.5);
        break;
      case 'snare':
        tone('triangle', 235 * k.snareTune, 165 * k.snareTune, 0.05, 0.13, 0.22);
        tone('sine', 350 * k.snareTune, 250 * k.snareTune, 0.04, 0.07, 0.1);
        noise('highpass', 1500, 0.7, 0.2, 0.21 * k.snareSnap);
        break;
      case 'clap':
        [0, 0.011, 0.022].forEach((d) => noise('bandpass', 1200, 1.2, 0.014, 1.1, t + d));
        noise('bandpass', 1200, 1.2, 0.17, 1.2, t + 0.033);
        break;
      case 'rim':
        tone('square', 1750, 1650, 0.01, 0.02, 0.09);
        tone('triangle', 520, 470, 0.01, 0.045, 0.24);
        noise('bandpass', 3000, 1, 0.012, 0.13);
        break;
      case 'chat':
        this.hat(t, vel, { ...HAT_PATCHES[0], gain: 0.22, decay: HAT_PATCHES[0].decay * k.hatDecay });
        break;
      case 'ohat':
        this.hat(t, vel, { ...HAT_PATCHES[1], gain: 0.17, decay: HAT_PATCHES[1].decay * k.hatDecay });
        break;
      case 'tom':
        tone('sine', 240 * k.tomTune, 115 * k.tomTune, 0.13, 0.4, 0.3);
        noise('bandpass', 1800, 1, 0.02, 0.08);
        break;
      case 'cow': {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 1;
        bp.connect(this.env(t, 0.27 * vel, 0.3, 0.001)).connect(this.bus);
        for (const f of [540, 800]) this.osc('square', f, t, t + 0.35, bp, 0, 0.5);
        break;
      }
    }
  }

  /** Metronome tick straight to the master (skips the filter and FX), accented on the downbeat. */
  click(t: number, accent: boolean) {
    const o = this.ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = accent ? 1760 : 1175;
    o.connect(this.env(t, accent ? 0.2 : 0.12, 0.035, 0.001)).connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** Same, right now (finger pads). Unlocks audio on the first call. */
  async hit(kind: 'lead' | 'bass' | 'snare' | 'hat' | 'rx', patch: LeadPatch | BassPatch | SnarePatch | HatPatch | RxName, vel: number, note = 60) {
    await this.unlock();
    this.playAt(kind, patch, this.ctx!.currentTime + 0.005, vel, note);
  }

  // requestAnimationFrame drives the scheduler; Web Audio's own clock keeps the timing exact.
  private loop = () => {
    const ctx = this.ctx!;
    // rAF pauses in background tabs: skip ahead instead of firing a burst of late notes.
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;

    if (this.tapeStop) this.tempoFactor = Math.max(0.12, this.tempoFactor * 0.955);
    this.delay.delayTime.setTargetAtTime((60 / this.bpm) * 0.75, ctx.currentTime, 0.05);

    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const dur = 60 / (this.bpm * this.tempoFactor) / 4;
      const t = this.nextTime + (this.step % 2 ? dur * this.swing : 0);
      const st = this.stutter;
      const s = st ? (st.from + ((this.step - st.from + STEPS) % STEPS) % st.len) % STEPS : this.step;
      for (let tr = 0; tr < TRACKS.length; tr++) if (this.pattern[tr][s] && !this.muted[tr]) this.voice(tr, t, 1, s);
      this.onSchedule?.(s, t);
      this.ui.push({ step: s, time: t });
      this.nextTime += dur;
      this.step = (this.step + 1) % STEPS;
    }

    while (this.ui.length && this.ui[0].time <= ctx.currentTime) {
      const next = this.ui.shift()!;
      this.current = next.step;
      this.currentStart = next.time;
      this.onStep?.(this.current);
    }
    if (this.playing) this.raf = requestAnimationFrame(this.loop);
  };

  private voice(track: number, t: number, vel: number, step: number) {
    const [l, b, sn, h] = this.patches;
    if (track === 0) this.lead(t, this.sound.lead[step], vel, LEAD_PATCHES[l]);
    else if (track === 1) this.bass(t, this.sound.bass[step], vel, BASS_PATCHES[b]);
    else if (track === 2) this.snare(t, vel, SNARE_PATCHES[sn]);
    else this.hat(t, vel, HAT_PATCHES[h]);
  }

  private env(t: number, peak: number, decay: number, attack = 0.003) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  /** Lead dispatcher: shared amp envelope + delay send, then the patch's synthesis method. */
  private lead(t: number, notes: number[], vel: number, p: LeadPatch) {
    const out = this.env(t, (p.gain * vel) / Math.sqrt(notes.length), p.decay, p.attack);
    out.connect(this.bus);
    if (p.delay) {
      const send = this.ctx!.createGain();
      send.gain.value = p.delay;
      out.connect(send).connect(this.delaySend);
    }
    const end = t + p.attack + p.decay + 0.1;
    if (p.kind === 'fm') this.fm(t, notes, p, out);
    else if (p.kind === 'supersaw') this.supersaw(t, end, notes, out);
    else if (p.kind === 'chip') this.chip(t, end, notes, out);
    else if (p.kind === 'vox') this.vox(t, end, notes, out);
    else if (p.kind === 'wobble') this.wobble(t, end, notes, out);
    else this.zap(t, end, notes, out);
  }

  private osc(type: OscillatorType, freq: number, t: number, end: number, dest: AudioNode, detune = 0, gain = 1) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = this.ctx!.createGain();
    g.gain.value = gain;
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(end);
    return o;
  }

  private lfo(rate: number, t: number, end: number) {
    const o = this.ctx!.createOscillator();
    o.frequency.value = rate;
    o.start(t);
    o.stop(end);
    return o;
  }

  /** Seven detuned saws through an opening low-pass: the trance/EDM lead. */
  private supersaw(t: number, end: number, notes: number[], out: GainNode) {
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900 + this.drive * 7000, t);
    lp.frequency.exponentialRampToValueAtTime(600, end);
    lp.connect(out);
    for (const n of notes) for (const c of [-32, -20, -9, 0, 9, 20, 32]) this.osc('sawtooth', mtof(n), t, end, lp, c, 1 / 7);
  }

  /** 8-bit square wave racing through the chord tones and octave at 1/32 notes, Game Boy style. */
  private chip(t: number, end: number, notes: number[], out: GainNode) {
    const steps = [...notes, notes[0] + 12, ...(notes.length === 1 ? [notes[0] + 7, notes[0] + 19] : [])];
    const o = this.osc('square', mtof(steps[0]), t, end, out);
    const tick = 60 / this.bpm / 8;
    for (let i = 0, at = t; at < end; i++, at += tick) o.frequency.setValueAtTime(mtof(steps[i % steps.length]), at);
  }

  /** Detuned saws through three "aah" formant band-passes, with delayed vibrato: a synth choir. */
  private vox(t: number, end: number, notes: number[], out: GainNode) {
    const ctx = this.ctx!;
    const formants = [[730, 1], [1090, 0.5], [2440, 0.25]] as const;
    const mix = ctx.createGain();
    for (const [f, g] of formants) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 7;
      const lvl = ctx.createGain();
      lvl.gain.value = g * 2.2;
      mix.connect(bp).connect(lvl).connect(out);
    }
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(14, t + 0.35);
    this.lfo(5.5, t, end).connect(depth);
    for (const n of notes) {
      for (const c of [-8, 8]) {
        const o = this.osc('sawtooth', mtof(n), t, end, mix, c, 0.5);
        depth.connect(o.detune);
      }
    }
  }

  /** Saw + square sub through a resonant low-pass wobbling in 1/8 notes. */
  private wobble(t: number, end: number, notes: number[], out: GainNode) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 9;
    lp.frequency.value = 700;
    lp.connect(out);
    const depth = ctx.createGain();
    depth.gain.value = 500 + this.drive * 1800;
    this.lfo((this.bpm / 60) * 2, t, end).connect(depth).connect(lp.frequency);
    for (const n of notes) {
      this.osc('sawtooth', mtof(n), t, end, lp, 0, 0.6);
      this.osc('square', mtof(n - 12), t, end, lp, 0, 0.4);
    }
  }

  /** Square wave diving four octaves: arcade laser. */
  private zap(t: number, end: number, notes: number[], out: GainNode) {
    for (const n of notes) {
      const o = this.osc('square', mtof(n) * 4, t, end, out);
      o.frequency.exponentialRampToValueAtTime(mtof(n) / 2, t + 0.18);
    }
  }

  /** 2-operator FM (DX7 style): carrier + modulator, optional second "tine" modulator. */
  private fm(t: number, notes: number[], p: LeadPatch, out: GainNode) {
    const ctx = this.ctx!;
    const fm = p.fm!;
    const end = t + p.attack + p.decay + 0.1;
    const mods: (readonly [number, number, number])[] = [[fm.ratio, fm.index + this.drive * fm.driveIndex, fm.indexDecay]];
    if (fm.tine) mods.push(fm.tine);
    for (const n of notes) {
      const f = mtof(n);
      const carrier = ctx.createOscillator();
      carrier.frequency.value = f;
      for (const [ratio, index, decay] of mods) {
        const mod = ctx.createOscillator();
        mod.frequency.value = f * ratio;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(f * index, t);
        depth.gain.exponentialRampToValueAtTime(f * 0.05, t + decay);
        mod.connect(depth).connect(carrier.frequency);
        mod.start(t);
        mod.stop(end);
      }
      carrier.connect(out);
      carrier.start(t);
      carrier.stop(end);
    }
  }

  /** Body oscillator(s) through a plucked low-pass, plus a sine sub whose pitch drop gives the punch. */
  private bass(t: number, note: number, vel: number, p: BassPatch) {
    const ctx = this.ctx!;
    const f = mtof(note);
    const out = this.env(t, 0.5 * vel, p.decay);
    out.connect(this.bus);
    const end = t + p.decay + 0.08;

    if (p.bodyGain > 0) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = p.q;
      lp.frequency.setValueAtTime(p.filterPeak + this.drive * 2600, t);
      lp.frequency.exponentialRampToValueAtTime(90, t + p.filterDecay);
      lp.connect(out);
      for (const cents of p.detune) {
        const o = ctx.createOscillator();
        o.type = p.wave;
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = p.bodyGain / p.detune.length;
        o.connect(g).connect(lp);
        o.start(t);
        o.stop(end);
      }
    }

    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(f * p.punch, t);
    sub.frequency.exponentialRampToValueAtTime(f, t + p.punchDecay);
    const subGain = ctx.createGain();
    subGain.gain.value = p.sub;
    sub.connect(subGain).connect(out);
    sub.start(t);
    sub.stop(end);
  }

  /** Filtered noise (one hit, or several quick bursts for a clap) plus an optional pitch-dropping body. */
  private snare(t: number, vel: number, p: SnarePatch) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = p.hp;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = p.lp;
    const env = ctx.createGain();
    const peak = p.noiseGain * vel;
    const gap = 0.011;
    env.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < p.bursts; i++) {
      const bt = t + i * gap;
      env.gain.setValueAtTime(peak, bt);
      if (i < p.bursts - 1) env.gain.exponentialRampToValueAtTime(peak * 0.15, bt + gap * 0.9);
    }
    const tail = t + (p.bursts - 1) * gap;
    env.gain.exponentialRampToValueAtTime(0.0001, tail + p.noiseDecay);
    n.connect(hp).connect(lp).connect(env).connect(this.bus);
    n.start(t);
    n.stop(tail + p.noiseDecay + 0.05);

    if (p.body) {
      const [from, to, decay, gain] = p.body;
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(from, t);
      body.frequency.exponentialRampToValueAtTime(to, t + Math.min(0.07, decay));
      const bEnv = this.env(t, gain * vel, decay, 0.002);
      body.connect(bEnv).connect(this.bus);
      body.start(t);
      body.stop(t + decay + 0.05);
    }
  }

  /** 808-style metallic hat (six detuned squares) or a noise shaker, band-passed high. */
  private hat(t: number, vel: number, p: HatPatch) {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = p.bp;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = p.hp;
    const out = this.env(t, p.gain * vel, p.decay, p.attack);
    bp.connect(hp).connect(out).connect(this.bus);
    const end = t + p.attack + p.decay + 0.05;
    if (p.metallic) {
      for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        o.connect(bp);
        o.start(t);
        o.stop(end);
      }
    } else {
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      n.connect(bp);
      n.start(t);
      n.stop(end);
    }
  }
}

/** CRUSH knob -> staircase transfer curve (bit reduction, 16 bits down to 3). null = clean. */
function crushCurve(amount: number): Float32Array<ArrayBuffer> | null {
  if (amount < 0.02) return null;
  const levels = 2 ** Math.round(16 - amount * 13);
  const curve = new Float32Array(4096);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.round(x * levels) / levels;
  }
  return curve;
}
