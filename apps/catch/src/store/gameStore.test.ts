import { beforeEach, describe, expect, it } from 'vitest';
import { comboMultiplier, useGameStore } from '../store/gameStore';

describe('comboMultiplier', () => {
  it('doubles on the fifth consecutive catch and stays at 2x', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(3)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(50)).toBe(2);
  });
});

describe('DM round state', () => {
  beforeEach(() => {
    useGameStore.setState({ godMode: false });
    useGameStore.getState().reset(30);
    useGameStore.getState().setStatus('playing');
  });
  it('ends on the third bomb and does not award a consolation prize', () => {
    const s = useGameStore.getState();
    s.addScore(200);
    s.loseLife();
    s.loseLife();
    expect(useGameStore.getState().status).toBe('playing');
    s.loseLife();
    s.finishRound(150);
    expect(useGameStore.getState()).toMatchObject({
      lives: 0,
      status: 'gameover',
      prizeUnlocked: false,
    });
  });
  it('requires at least 150 points at time up', () => {
    useGameStore.getState().addScore(149);
    useGameStore.getState().finishRound(150);
    expect(useGameStore.getState().prizeUnlocked).toBe(false);
    useGameStore.getState().reset(30);
    useGameStore.getState().addScore(150);
    useGameStore.getState().finishRound(150);
    expect(useGameStore.getState()).toMatchObject({
      status: 'gameover',
      prizeUnlocked: true,
    });
  });
  it('god mode prevents damage and slowdown, and persists on retry', () => {
    const s = useGameStore.getState();
    s.toggleGodMode();
    expect(s.loseLife()).toBe(false);
    expect(s.slow()).toBe(false);
    s.demoWin(250);
    s.reset(30);
    expect(useGameStore.getState()).toMatchObject({
      lives: 3,
      godMode: true,
      slowLeft: 0,
      score: 0,
      combo: 0,
      prizeUnlocked: false,
      timeLeft: 30,
    });
  });
  it('a box breaks the streak and slows the basket for 2.5 seconds', () => {
    const s = useGameStore.getState();
    for (let i = 0; i < 5; i++) s.bumpCombo();
    s.slow();
    expect(useGameStore.getState()).toMatchObject({ combo: 0, slowLeft: 2.5 });
    s.tickTime(1);
    expect(useGameStore.getState().slowLeft).toBe(1.5);
    s.tickTime(2);
    expect(useGameStore.getState().slowLeft).toBe(0);
  });
});
