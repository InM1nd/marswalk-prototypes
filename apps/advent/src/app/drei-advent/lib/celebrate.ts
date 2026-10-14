import confetti from 'canvas-confetti';

const COLORS = ['#00A0D2', '#DDEE3D', '#71439D', '#2BBBF3', '#FFFFFF'];

export function celebrate() {
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 100 };
  confetti({ ...base, particleCount: 90, spread: 80, origin: { y: 0.6 } });
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } }), 180);
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } }), 180);
}
