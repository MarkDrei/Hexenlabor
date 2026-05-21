import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for state.ts loading / derived-value logic.
 *
 * Because gameState is a module-level singleton (initialized via an IIFE),
 * each test must:
 *   1. Seed localStorage with the desired progress.
 *   2. Call vi.resetModules() so the IIFE re-executes on the next import.
 *   3. Dynamically import the module to obtain a freshly-initialized gameState.
 */

// Level thresholds (mirrors LEVEL_THRESHOLDS_BASE in state.ts):
//   Level 1: stars <  50
//   Level 2:   50 ≤ stars < 150
//   Level 3:  150 ≤ stars < 350
//   Level 4:  350 ≤ stars < 700
//   Level 5:  700 ≤ stars < 1500

const STORAGE_KEY = 'hexenlabor_progress';

function setLocalStorageProgress(stars: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ stars, score: stars, inventory: [] }));
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

async function loadGameState() {
  const mod = await import('@/game/state');
  return mod.gameState;
}

describe('gameState loaded from localStorage — level derivation', () => {
  it('starts at level 1 with no saved progress', async () => {
    const state = await loadGameState();
    expect(state.level).toBe(1);
  });

  it('stays at level 1 with 0 stars', async () => {
    setLocalStorageProgress(0);
    const state = await loadGameState();
    expect(state.level).toBe(1);
  });

  it('stays at level 1 with 49 stars (just below threshold)', async () => {
    setLocalStorageProgress(49);
    const state = await loadGameState();
    expect(state.level).toBe(1);
  });

  it('reaches level 2 with 50 stars', async () => {
    setLocalStorageProgress(50);
    const state = await loadGameState();
    expect(state.level).toBe(2);
  });

  it('reaches level 3 with 150 stars', async () => {
    setLocalStorageProgress(150);
    const state = await loadGameState();
    expect(state.level).toBe(3);
  });

  it('reaches level 4 with 350 stars', async () => {
    setLocalStorageProgress(350);
    const state = await loadGameState();
    expect(state.level).toBe(4);
  });

  it('reaches level 5 with 700 stars', async () => {
    setLocalStorageProgress(700);
    const state = await loadGameState();
    expect(state.level).toBe(5);
  });

  it('reaches level 6 with 1500 stars', async () => {
    setLocalStorageProgress(1500);
    const state = await loadGameState();
    expect(state.level).toBe(6);
  });
});

describe('gameState loaded from localStorage — unlockedRecipes derivation', () => {
  it('unlocks only level-1 recipes with no saved progress', async () => {
    const state = await loadGameState();
    expect(state.unlockedRecipes).toEqual(['heiltrank', 'schlaftrank']);
  });

  it('unlocks only level-1 recipes with 0 stars', async () => {
    setLocalStorageProgress(0);
    const state = await loadGameState();
    expect(state.unlockedRecipes).toEqual(['heiltrank', 'schlaftrank']);
  });

  it('unlocks level-1 and level-2 recipes at 50 stars (level 2)', async () => {
    setLocalStorageProgress(50);
    const state = await loadGameState();
    expect(state.unlockedRecipes).toContain('heiltrank');
    expect(state.unlockedRecipes).toContain('schlaftrank');
    expect(state.unlockedRecipes).toContain('liebestrank');
    expect(state.unlockedRecipes).not.toContain('feuertrank');
  });

  it('unlocks up to level-3 recipes at 150 stars (level 3)', async () => {
    setLocalStorageProgress(150);
    const state = await loadGameState();
    expect(state.unlockedRecipes).toContain('feuertrank');
    expect(state.unlockedRecipes).not.toContain('sternenstaub');
    expect(state.unlockedRecipes).not.toContain('mondtrank');
  });

  it('unlocks up to level-4 recipes at 350 stars (level 4)', async () => {
    setLocalStorageProgress(350);
    const state = await loadGameState();
    expect(state.unlockedRecipes).toContain('sternenstaub');
    expect(state.unlockedRecipes).toContain('mondtrank');
    expect(state.unlockedRecipes).not.toContain('regenbogentrank');
    expect(state.unlockedRecipes).not.toContain('ewigkeitstrank');
  });

  it('unlocks all recipes at 700 stars (level 5)', async () => {
    setLocalStorageProgress(700);
    const state = await loadGameState();
    expect(state.unlockedRecipes).toContain('regenbogentrank');
    expect(state.unlockedRecipes).toContain('ewigkeitstrank');
    expect(state.unlockedRecipes).toHaveLength(8);
  });
});
