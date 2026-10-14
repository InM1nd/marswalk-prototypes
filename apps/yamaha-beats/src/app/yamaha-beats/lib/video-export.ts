// Record the running beat as a 9:16 video (canvas animation + master audio) for Stories/TikTok.
// Pure browser: canvas.captureStream + MediaRecorder; MP4 where supported (Safari, new Chrome), else WebM.
import { TRACKS, type YamahaAudioEngine } from './yamaha-audio-engine';

const W = 720;
const H = 1280;
const MIME = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

export const canRecordVideo = () =>
  typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && MIME.some((m) => MediaRecorder.isTypeSupported(m));

interface Options {
  bars: number;
  preset: string;
  /** shown at the bottom of the video, e.g. "yamaha.beat/xyz" */
  url: string;
  onProgress: (bar: number) => void;
}

export async function recordBeatVideo(engine: YamahaAudioEngine, { bars, preset, url, onProgress }: Options): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m))!;
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...engine.recordStream().getAudioTracks()]);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));

  const barMs = (4 * 60 * 1000) / engine.bpm;
  const total = bars * barMs;
  const freq = new Uint8Array(engine.analyser!.frequencyBinCount);
  const t0 = performance.now();
  let raf = 0;

  const frame = () => {
    const elapsed = performance.now() - t0;
    drawFrame(g, engine, freq, preset, url, Math.min(1, elapsed / total));
    onProgress(Math.min(bars, Math.floor(elapsed / barMs) + 1));
    raf = requestAnimationFrame(frame);
  };
  frame();
  rec.start(250);
  await new Promise((r) => setTimeout(r, total + 300));
  rec.stop();
  await stopped;
  cancelAnimationFrame(raf);
  stream.getVideoTracks().forEach((t) => t.stop());

  const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
  return new File(chunks, `yamaha-beat.${ext}`, { type: mimeType.split(';')[0] });
}

function drawFrame(g: CanvasRenderingContext2D, engine: YamahaAudioEngine, freq: Uint8Array<ArrayBuffer>, preset: string, url: string, progress: number) {
  const bg = g.createRadialGradient(W / 2, 0, 50, W / 2, 0, H);
  bg.addColorStop(0, '#2a1640');
  bg.addColorStop(0.55, '#0b0b0d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = '800 44px "Inter Tight", Helvetica, Arial, sans-serif';
  g.letterSpacing = '14px';
  g.fillText('YAMAHA', W / 2, 130);
  g.letterSpacing = '4px';
  g.font = '600 18px "Inter Tight", Helvetica, Arial, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillText('SQ-16 BEAT STUDIO', W / 2, 172);
  g.letterSpacing = '0px';

  g.fillStyle = '#00F5D4';
  g.font = '500 26px "JetBrains Mono", monospace';
  g.fillText(`${preset} · ${Math.round(engine.bpm)} BPM`, W / 2, 250);

  // pad matrix: 4 tracks x 16 steps as 8 rows of 8, lit like the hardware
  const cur = engine.currentStep;
  const size = 56;
  const gap = 10;
  const x0 = (W - (8 * size + 7 * gap)) / 2;
  let y = 300;
  TRACKS.forEach((t, tr) => {
    for (let half = 0; half < 2; half++) {
      for (let c = 0; c < 8; c++) {
        const s = half * 8 + c;
        const on = engine.pattern[tr][s];
        const head = s === cur;
        const x = x0 + c * (size + gap);
        g.shadowBlur = on ? (head ? 40 : 18) : 0;
        g.shadowColor = t.color;
        g.fillStyle = on ? (head ? '#ffffff' : t.color) : head ? '#33353d' : '#1c1d22';
        g.beginPath();
        g.roundRect(x, y, size, size, 12);
        g.fill();
      }
      y += size + gap;
    }
    y += 10;
  });
  g.shadowBlur = 0;

  // dot-matrix spectrum
  engine.analyser!.getByteFrequencyData(freq);
  const cols = 48;
  const dot = 9;
  const top = y + 30;
  const rows = 10;
  for (let c = 0; c < cols; c++) {
    const bin = Math.min(freq.length - 1, Math.floor(2 * (freq.length / 2) ** (c / cols)));
    const lit = Math.round((freq[bin] / 255) * rows);
    for (let r = 0; r < rows; r++) {
      g.fillStyle = r < lit ? (r === lit - 1 ? '#00F5D4' : 'rgba(214,236,255,0.85)') : 'rgba(214,236,255,0.06)';
      g.fillRect(x0 + c * (dot + 3.3), top + (rows - r) * (dot + 3), dot, dot);
    }
  }

  g.fillStyle = '#ffffff';
  g.font = '800 46px "Inter Tight", Helvetica, Arial, sans-serif';
  g.fillText('Bau deinen Beat.', W / 2, H - 170);
  const grad = g.createLinearGradient(W / 2 - 180, 0, W / 2 + 180, 0);
  grad.addColorStop(0, '#9D4EDD');
  grad.addColorStop(1, '#FF5500');
  g.fillStyle = grad;
  g.fillText('Hol dir -10%.', W / 2, H - 112);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = '500 22px "JetBrains Mono", monospace';
  g.fillText(url, W / 2, H - 62);

  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(0, H - 8, W, 8);
  g.fillStyle = '#9D4EDD';
  g.fillRect(0, H - 8, W * progress, 8);
}
