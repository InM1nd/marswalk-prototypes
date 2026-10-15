'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Dice5, Flame, Play, Share2, Square, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HardwareChassis, OledDisplay, SoundMorphPad } from './components/HardwareChassis';
import { BeatVideoModal, type VideoState } from './components/BeatVideoModal';
import { Knob } from './components/Knobs';
import { PerformFX, type Fx } from './components/PerformFX';
import { PRESETS, PresetSelector, decodeGroove, encodeGroove, patternFrom, rollGroove } from './components/PresetSelector';
import { LivePads, SequencerGrid } from './components/SequencerGrid';
import { YamahaRewardModal } from './components/YamahaRewardModal';
import { copyText } from './lib/copyText';
import { canRecordVideo, recordBeatVideo } from './lib/video-export';
import { DEFAULT_MIX, PATCHES, YamahaAudioEngine, cutoffFromNorm, emptyPattern, qFromReso, type Mix, type Pattern } from './lib/yamaha-audio-engine';

const BPM_MIN = 90;
const BPM_MAX = 150;
const GOALS = [
  { id: 'steps', label: '8 Steps aktivieren', pts: 40 },
  { id: 'bars', label: '4 Takte abspielen', pts: 30 },
  { id: 'tweak', label: 'Filter, Knob oder Pad nutzen', pts: 30 },
] as const;
type GoalId = (typeof GOALS)[number]['id'];
const NO_GOALS: Record<GoalId, boolean> = { steps: false, bars: false, tweak: false };

export default function YamahaBeatsPage() {
  const engine = useMemo(() => new YamahaAudioEngine(), []);
  const [pattern, setPattern] = useState<Pattern>(emptyPattern);
  const [presetIdx, setPresetIdx] = useState(0);
  const [bpm, setBpm] = useState(PRESETS[0].bpm);
  const [swing, setSwing] = useState(PRESETS[0].swing);
  const [patches, setPatches] = useState(PRESETS[0].patches);
  const [morphX, setMorphX] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bars, setBars] = useState(0);
  const [goals, setGoals] = useState(NO_GOALS);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Phones show one panel at a time; desktop shows both. */
  const [tab, setTab] = useState<'build' | 'perform' | 'sound'>('build');
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [fx, setFx] = useState<Fx | null>(null);
  const [video, setVideo] = useState<VideoState | null>(null);
  const prevStep = useRef(-1);

  const drive = (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN); // Y axis drives tempo and FM drive together
  const cutoff = cutoffFromNorm(morphX);
  const activeSteps = pattern.flat().filter(Boolean).length;
  const meter = GOALS.reduce((sum, g) => sum + (goals[g.id] ? g.pts : 0), 0);
  const ready = meter >= 100;

  // keep the engine in sync with React state
  useEffect(() => {
    engine.pattern = pattern;
    engine.bpm = bpm;
    engine.drive = drive;
    engine.sound = PRESETS[presetIdx].sound;
    engine.patches = patches;
    engine.swing = swing;
  }, [engine, pattern, bpm, drive, presetIdx, patches, swing]);

  useEffect(() => engine.setMix(mix), [engine, mix]);

  useEffect(() => {
    engine.onStep = (s) => {
      if (s === 0 && prevStep.current === 15) setBars((b) => b + 1);
      prevStep.current = s;
      setStep(s);
    };
    return () => engine.stop();
  }, [engine]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  // shared link: ?groove=<pattern>-<bpm>-<preset>
  useEffect(() => {
    const shared = decodeGroove(new URLSearchParams(window.location.search).get('groove'));
    if (!shared) return;
    setPattern(shared.pattern);
    setBpm(shared.bpm);
    setPresetIdx(shared.presetIdx);
    setPatches(shared.patches);
    setSwing(PRESETS[shared.presetIdx].swing);
    flash('Geteilter Beat geladen. Drück PLAY!');
  }, [flash]);

  // latch goals once reached, so the meter never drops back
  useEffect(() => {
    setGoals((g) => ({ ...g, steps: g.steps || activeSteps >= 8, bars: g.bars || bars >= 4 }));
  }, [activeSteps, bars]);

  const tweaked = () => setGoals((g) => (g.tweak ? g : { ...g, tweak: true }));

  const togglePlay = useCallback(async () => {
    if (engine.playing) {
      engine.stop();
      setPlaying(false);
    } else {
      prevStep.current = -1;
      await engine.start();
      engine.setCutoff(cutoff);
      setPlaying(true);
    }
  }, [engine, cutoff]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || modal || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [togglePlay, modal]);

  const loadPreset = (idx: number) => {
    setPattern(patternFrom(PRESETS[idx]));
    setBpm(PRESETS[idx].bpm);
    setSwing(PRESETS[idx].swing);
    setPatches(PRESETS[idx].patches);
    setPresetIdx(idx);
  };

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.search = `?groove=${encodeGroove(pattern, bpm, presetIdx, patches)}`;
    return url.toString();
  };

  const share = async () => {
    const url = shareUrl();
    window.history.replaceState(null, '', url);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Mein Beat auf der Yamaha SQ-16', url }).catch(() => {});
    } else if (await copyText(url)) {
      flash('Beat-Link kopiert!');
    }
  };

  const dice = () => {
    const roll = rollGroove(presetIdx);
    setPattern(roll.pattern);
    setPatches(roll.patches);
    if (roll.presetIdx !== presetIdx) {
      setPresetIdx(roll.presetIdx);
      setBpm(PRESETS[roll.presetIdx].bpm);
      setSwing(PRESETS[roll.presetIdx].swing);
    }
    navigator.vibrate?.(15);
  };

  const onFx = (name: Fx, on: boolean) => {
    engine.setFx(name, on);
    setFx(on ? name : null);
    if (on) tweaked();
  };

  const recordVideo = async () => {
    if (!canRecordVideo()) return flash('Video-Aufnahme wird in diesem Browser nicht unterstützt.');
    if (!activeSteps) loadPreset(1);
    if (!engine.playing) await togglePlay();
    engine.restart(); // start the clip on the downbeat
    const bars = 4;
    setVideo({ phase: 'rec', bar: 1, bars });
    try {
      const file = await recordBeatVideo(engine, {
        bars,
        preset: PRESETS[presetIdx].name,
        url: window.location.host + window.location.pathname,
        onProgress: (bar) => setVideo((v) => (v?.phase === 'rec' && v.bar !== bar ? { ...v, bar } : v)),
      });
      setVideo({ phase: 'done', file });
    } catch {
      setVideo(null);
      flash('Aufnahme fehlgeschlagen. Bitte nochmal versuchen.');
    }
  };

  const resetAll = () => {
    engine.stop();
    setPlaying(false);
    setPattern(emptyPattern());
    setPresetIdx(0);
    setBpm(PRESETS[0].bpm);
    setSwing(PRESETS[0].swing);
    setPatches(PRESETS[0].patches);
    setMorphX(1);
    setMix(DEFAULT_MIX);
    engine.setCutoff(cutoffFromNorm(1));
    setGoals(NO_GOALS);
    setBars(0);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const demoUnlock = async () => {
    if (!activeSteps) loadPreset(1);
    setGoals({ steps: true, bars: true, tweak: true });
    if (!engine.playing) await togglePlay();
  };

  const morphPad = (
    <SoundMorphPad
      x={morphX}
      y={drive}
      reso={mix.reso}
      onChange={(x, y) => {
        setMorphX(x);
        setBpm(Math.round(BPM_MIN + y * (BPM_MAX - BPM_MIN)));
        engine.setCutoff(cutoffFromNorm(x));
        tweaked();
      }}
    />
  );

  const knob = (key: keyof Mix) => (v: number) => {
    setMix((m) => ({ ...m, [key]: v }));
    tweaked();
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const knobBank = (
    <div className="flex h-full flex-col">
      <p className="silk mb-2 flex justify-between">
        <span>Sound Shaping</span>
        <span className="text-white/25">Drag ↕</span>
      </p>
      <div className="well grid flex-1 grid-cols-3 place-content-center place-items-center gap-y-3 rounded-xl px-2 py-3 lg:grid-cols-6 lg:px-1 lg:py-2">
        <Knob label="Swing" value={swing / 0.5} display={pct(swing)} color="#9D4EDD" defaultValue={PRESETS[presetIdx].swing / 0.5} onChange={(v) => { setSwing(v * 0.5); tweaked(); }} />
        <Knob label="Reso" value={mix.reso} display={`Q ${qFromReso(mix.reso).toFixed(1)}`} color="#00F5D4" defaultValue={DEFAULT_MIX.reso} onChange={knob('reso')} />
        <Knob label="Echo" value={mix.echo} display={pct(mix.echo)} color="#FF5500" defaultValue={DEFAULT_MIX.echo} onChange={knob('echo')} />
        <Knob label="Space" value={mix.space} display={pct(mix.space)} color="#10B981" defaultValue={DEFAULT_MIX.space} onChange={knob('space')} />
        <Knob label="Crush" value={mix.crush} display={mix.crush < 0.02 ? 'OFF' : `${Math.round(16 - mix.crush * 13)} BIT`} color="#F5B700" defaultValue={DEFAULT_MIX.crush} onChange={knob('crush')} />
        <Knob label="Level" value={mix.level} display={pct(mix.level)} color="#E7E7EA" defaultValue={DEFAULT_MIX.level} onChange={knob('level')} />
      </div>
    </div>
  );

  const transport = [
    { label: playing ? 'Stop' : 'Play', icon: playing ? Square : Play, onClick: togglePlay, led: playing ? '#00F5D4' : null },
    { label: 'Würfeln', icon: Dice5, onClick: dice, led: null },
    { label: 'Video', icon: Video, onClick: recordVideo, led: video?.phase === 'rec' ? '#FF5500' : null },
    { label: 'Share', icon: Share2, onClick: share, led: null },
  ];

  return (
    <div className="min-h-dvh pb-36 lg:pb-4">
      {/* marswalk pitch bar: presenter-only controls */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5 text-xs">
          <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">
            marswalk <span className="hidden sm:inline">Pitch Bar</span>
          </span>
          <button type="button" onClick={demoUnlock} className="ml-auto rounded-lg border border-white/15 px-2.5 py-1 text-white/80 hover:border-white/40 hover:text-white">
            Demo <span className="hidden sm:inline">Instant </span>Unlock
          </button>
          <button type="button" onClick={resetAll} className="rounded-lg border border-white/15 px-2.5 py-1 text-white/80 hover:border-white/40 hover:text-white">
            Reset<span className="hidden sm:inline"> Challenge</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 pt-5 sm:px-4 lg:pt-4">
        <header className="mb-4 flex flex-col gap-3 lg:mb-3 lg:flex-row lg:items-center lg:gap-8">
          <div className="px-1 lg:shrink-0">
            <p className="silk">Yamaha Music Europe · Beat Challenge</p>
            <h1 className="mt-1 text-[1.85rem] leading-[1.05] font-bold tracking-tight sm:text-4xl lg:text-[2.1rem]">
              Bau deinen Beat.{' '}
              <span className="bg-gradient-to-r from-purple-2 via-[#c77dff] to-orange bg-clip-text text-transparent">Hol dir -10%.</span>
            </h1>
          </div>

          <section aria-label="Groove Meter" className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 lg:flex-1">
            <div className="flex items-center gap-3">
              <p className="silk shrink-0">Groove</p>
              <div className="grid flex-1 grid-cols-20 gap-[3px]" role="progressbar" aria-valuenow={meter} aria-valuemin={0} aria-valuemax={100} aria-label="Groove Meter">
                {Array.from({ length: 20 }, (_, i) => {
                  const on = i < meter / 5;
                  const c = i < 12 ? '#9D4EDD' : i < 17 ? '#FF5500' : '#F5B700';
                  return <span key={i} className="h-2 rounded-[2px] transition-all duration-300" style={{ background: on ? c : 'rgb(255 255 255 / 0.07)', boxShadow: on ? `0 0 8px ${c}` : 'none' }} />;
                })}
              </div>
              <p className="w-12 text-right font-mono text-lg font-bold tabular-nums">{meter}%</p>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 lg:mt-1.5">
              {GOALS.map((g) => (
                <li key={g.id} className={`flex items-center gap-2 text-[12px] leading-tight ${goals[g.id] ? 'text-white' : 'text-white/45'}`}>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${goals[g.id] ? 'bg-cyan text-black' : 'border border-white/20'}`}>
                    {goals[g.id] && <Check size={10} strokeWidth={4} />}
                  </span>
                  {g.label}
                  <span className="font-mono text-[10.5px] text-white/35">+{g.pts}%</span>
                </li>
              ))}
            </ul>
          </section>
        </header>

        <HardwareChassis>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_1fr] lg:gap-4">
            <OledDisplay engine={engine} bpm={bpm} swing={swing} preset={PRESETS[presetIdx].name} step={step} cutoff={cutoff} drive={drive} fx={fx} />
            <div className="hidden lg:block">{morphPad}</div>
            <div className="hidden lg:block">{knobBank}</div>
          </div>

          {/* phones and tablets: one panel at a time */}
          <div className="well mt-3 grid grid-cols-3 gap-1 rounded-xl p-1 lg:hidden" role="tablist">
            {(['build', 'perform', 'sound'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${tab === t ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]' : 'text-white/40'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className={tab === 'build' ? '' : 'hidden lg:block'}>
            <div className="mt-3 flex items-end gap-3 lg:mt-4">
              <div className="hidden shrink-0 grid-cols-4 gap-2 lg:grid">
                {transport.map((b) => (
                  <TransportKey key={b.label} {...b} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <PresetSelector active={PRESETS[presetIdx].id} hint={activeSteps === 0} onPreset={loadPreset} onClear={() => setPattern(emptyPattern())} />
              </div>
            </div>

            <div className="well mt-3 rounded-2xl p-3 lg:px-4">
              <SequencerGrid
                pattern={pattern}
                step={step}
                patches={patches}
                onPatch={(tr) => {
                  const next = patches.map((p, i) => (i === tr ? (p + 1) % PATCHES[tr].length : p));
                  setPatches(next);
                  engine.patches = next;
                  engine.trigger(tr, 0.85); // audition the new voice
                }}
                onToggle={(tr, s) => setPattern((p) => p.map((row, i) => (i === tr ? row.map((v, j) => (j === s ? !v : v)) : row)))}
              />
            </div>
          </div>

          <div className={`${tab === 'perform' ? 'grid' : 'hidden lg:grid'} mt-4 gap-5 lg:mt-3 lg:grid-cols-[1fr_1.25fr] lg:gap-6`}>
            <PerformFX onFx={onFx} />
            <LivePads
              onHit={(tr, v) => {
                engine.trigger(tr, v);
                tweaked();
              }}
            />
          </div>

          <div className={`${tab === 'sound' ? 'grid' : 'hidden'} mt-4 gap-5 lg:hidden`}>
            {morphPad}
            {knobBank}
          </div>
        </HardwareChassis>

        <p className="mt-4 px-1 text-center text-[11px] text-white/30">
          Prototyp von marswalk.media für Yamaha Music Europe. Alle Sounds werden live im Browser synthetisiert. Gutscheincode fiktiv.
        </p>
      </main>

      <AnimatePresence>
        {ready && !modal && (
          <motion.div className="fixed inset-x-0 bottom-[88px] z-30 flex justify-center px-4 lg:bottom-4" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-purple-2 to-purple px-5 py-4 text-sm font-bold tracking-wide text-white animate-[claim-pulse_1.8s_ease-in-out_infinite] sm:text-base"
            >
              <Flame size={18} className="text-gold" /> TRACK READY! CLAIM YOUR 10% YAMAHA VOUCHER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* phones: transport always in thumb reach */}
      <nav aria-label="Transport" className="chassis fixed inset-x-2 bottom-2 z-30 grid grid-cols-4 gap-2 rounded-2xl p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {transport.map((b) => (
          <TransportKey key={b.label} {...b} compact />
        ))}
      </nav>

      <AnimatePresence>{video && <BeatVideoModal state={video} onClose={() => setVideo(null)} />}</AnimatePresence>

      <AnimatePresence>
        {modal && <YamahaRewardModal engine={engine} cutoff={cutoff} shareUrl={shareUrl()} onClose={() => setModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed inset-x-4 top-14 z-50 mx-auto max-w-xs rounded-xl border border-white/10 bg-[#1a1b20] px-4 py-2.5 text-center text-sm shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TransportKey({ label, icon: Icon, onClick, led, compact }: { label: string; icon: typeof Play; onClick: () => void; led: string | null; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`keycap relative flex flex-col items-center justify-center gap-1 text-white/85 ${compact ? 'h-14' : 'h-[54px] w-[58px]'}`}>
      <Icon size={compact ? 18 : 20} fill={Icon === Play || Icon === Square ? 'currentColor' : 'none'} />
      <span className="silk text-[8.5px]!">{label}</span>
      <span className={`led absolute top-1.5 right-1.5 ${led ? 'led-on' : ''}`} style={{ ['--c' as string]: led ?? '#000' }} aria-hidden />
    </button>
  );
}
