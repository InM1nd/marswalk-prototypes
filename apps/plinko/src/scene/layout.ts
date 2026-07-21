/** Board layout helpers — shared by physics bodies and visual meshes. */

export const BOARD = {
  width: 5.4,
  height: 7.8,
  depth: 0.35,
  pegRadius: 0.085,
  pegHeight: 0.28,
  ballRadius: 0.155,
  wallThickness: 0.16,
  slotDepth: 0.85,
};

export interface PegSpec {
  key: string;
  x: number;
  y: number;
}

export function buildPegLayout(rows: number, slotCount: number): PegSpec[] {
  const pegs: PegSpec[] = [];
  const usableWidth = BOARD.width - 0.8;
  const top = BOARD.height / 2 - 0.95;
  const bottom = -BOARD.height / 2 + BOARD.slotDepth + 0.75;
  const rowGap = (top - bottom) / Math.max(rows - 1, 1);

  for (let row = 0; row < rows; row++) {
    const count = Math.max(3, slotCount - 1 + (row % 2 === 0 ? 0 : 1));
    const y = top - row * rowGap;
    const span = usableWidth * (0.78 + (row / Math.max(rows - 1, 1)) * 0.22);
    for (let col = 0; col < count; col++) {
      const t = count === 1 ? 0.5 : col / (count - 1);
      const x = -span / 2 + t * span;
      pegs.push({ key: `p-${row}-${col}`, x, y });
    }
  }
  return pegs;
}

export function slotCenters(slotCount: number): number[] {
  const usable = BOARD.width - 0.5;
  const slotW = usable / slotCount;
  return Array.from({ length: slotCount }, (_, i) => -usable / 2 + slotW / 2 + i * slotW);
}

export function slotWidth(slotCount: number): number {
  return (BOARD.width - 0.5) / slotCount;
}
