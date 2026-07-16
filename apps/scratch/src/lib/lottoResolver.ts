import type { LottoSymbol } from '../config/lottoSchema';

export interface LottoResult {
  cells: string[]; // symbol id per cell, length === rows*cols
  isWin: boolean;
  symbol?: LottoSymbol;
}

// Any non-winning symbol is capped at this many occurrences so the filler
// pass can never accidentally create a second (unintended) triple.
const MAX_FILLER_COUNT = 2;

export function resolveLottoGrid(
  symbols: LottoSymbol[],
  cellCount: number,
  loseWeight: number,
  rng: () => number = Math.random,
): LottoResult {
  const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0) + loseWeight;
  let roll = rng() * totalWeight;
  let winner: LottoSymbol | undefined;
  for (const symbol of symbols) {
    roll -= symbol.weight;
    if (roll <= 0) {
      winner = symbol;
      break;
    }
  }
  // roll still positive here means the lose slice was hit — winner stays undefined.

  const counts = new Map<string, number>(symbols.map((s) => [s.id, 0]));
  const cells: string[] = [];

  if (winner) {
    cells.push(winner.id, winner.id, winner.id);
    counts.set(winner.id, MAX_FILLER_COUNT + 1); // lock the winner out of the filler pool below
  }

  while (cells.length < cellCount) {
    const eligible = symbols.filter((s) => (counts.get(s.id) ?? 0) < MAX_FILLER_COUNT);
    // A well-formed config always leaves headroom here (see LottoConfigSchema
    // docs); falling back to the full symbol pool avoids an infinite loop if
    // a campaign config ever cuts it too close, at the cost of a possible
    // extra (harmless — first triple found still wins) coincidental triple.
    const pool = eligible.length > 0 ? eligible : symbols;
    const pick = pool[Math.floor(rng() * pool.length)];
    cells.push(pick.id);
    counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
  }

  shuffle(cells, rng);
  return { cells, isWin: !!winner, symbol: winner };
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
