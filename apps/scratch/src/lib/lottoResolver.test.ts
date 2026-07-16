import { describe, expect, it } from 'vitest';
import { resolveLottoGrid } from './lottoResolver';
import type { LottoSymbol } from '../config/lottoSchema';

function symbol(id: string, weight: number): LottoSymbol {
  return { id, icon: id, weight, prize: { code: id.toUpperCase(), description: id } };
}

const symbols = [symbol('a', 30), symbol('b', 25), symbol('c', 20), symbol('d', 15), symbol('e', 10)];

function countOf(cells: string[], id: string): number {
  return cells.filter((c) => c === id).length;
}

describe('resolveLottoGrid', () => {
  it('always fills exactly cellCount cells', () => {
    for (let i = 0; i < 200; i++) {
      const { cells } = resolveLottoGrid(symbols, 9, 150, Math.random);
      expect(cells).toHaveLength(9);
    }
  });

  it('on a win, the winning symbol appears exactly 3 times and no other symbol reaches 3', () => {
    for (let i = 0; i < 500; i++) {
      const result = resolveLottoGrid(symbols, 9, 150, Math.random);
      if (!result.isWin) continue;
      expect(countOf(result.cells, result.symbol!.id)).toBe(3);
      for (const s of symbols) {
        if (s.id === result.symbol!.id) continue;
        expect(countOf(result.cells, s.id)).toBeLessThan(3);
      }
    }
  });

  it('on a loss, no symbol reaches 3 occurrences', () => {
    for (let i = 0; i < 500; i++) {
      const result = resolveLottoGrid(symbols, 9, 150, Math.random);
      if (result.isWin) continue;
      for (const s of symbols) {
        expect(countOf(result.cells, s.id)).toBeLessThan(3);
      }
    }
  });

  it('is deterministic given a fixed rng and produces a win when the roll favors a symbol', () => {
    const result = resolveLottoGrid(symbols, 9, 150, () => 0); // first roll always picks the first symbol
    expect(result.isWin).toBe(true);
    expect(result.symbol?.id).toBe('a');
  });

  it('produces a loss when the roll lands in the lose slice', () => {
    const result = resolveLottoGrid(symbols, 9, 150, () => 0.999999); // near-max roll lands past all symbol weights
    expect(result.isWin).toBe(false);
    expect(result.symbol).toBeUndefined();
  });
});
