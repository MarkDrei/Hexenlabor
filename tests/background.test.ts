import { describe, it, expect } from 'vitest';
import { DAY_CYCLE_MS, getDayPhase } from '@/renderers/background';

describe('DAY_CYCLE_MS', () => {
  it('equals 4 minutes in milliseconds', () => {
    expect(DAY_CYCLE_MS).toBe(4 * 60 * 1000);
  });
});

describe('getDayPhase', () => {
  it('returns 0 at time 0 (midnight)', () => {
    expect(getDayPhase(0)).toBe(0);
  });

  it('returns 0.25 at one-quarter of the cycle (sunrise)', () => {
    expect(getDayPhase(DAY_CYCLE_MS * 0.25)).toBeCloseTo(0.25);
  });

  it('returns 0.5 at half the cycle (noon)', () => {
    expect(getDayPhase(DAY_CYCLE_MS * 0.5)).toBeCloseTo(0.5);
  });

  it('returns 0.75 at three-quarters of the cycle (sunset)', () => {
    expect(getDayPhase(DAY_CYCLE_MS * 0.75)).toBeCloseTo(0.75);
  });

  it('wraps around after one full cycle', () => {
    expect(getDayPhase(DAY_CYCLE_MS)).toBeCloseTo(0);
  });

  it('wraps correctly after multiple cycles', () => {
    expect(getDayPhase(DAY_CYCLE_MS * 3.5)).toBeCloseTo(0.5);
  });

  it('always returns a value in [0, 1)', () => {
    const times = [0, 1000, 60000, 120000, 239999, DAY_CYCLE_MS, DAY_CYCLE_MS * 10 + 7777];
    for (const t of times) {
      const phase = getDayPhase(t);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });
});
