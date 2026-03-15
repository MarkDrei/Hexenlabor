import { describe, it, expect } from 'vitest';
import { findMatchingRecipe, canBrew, RECIPES } from '@/game/crafting';
import { createInitialState } from '@/game/state';
import { shouldTriggerEvent } from '@/game/events';
import type { IngredientType } from '@/shared/types';

describe('findMatchingRecipe', () => {
  it('returns speed_potion for red_mushroom + water', () => {
    const recipe = findMatchingRecipe(['red_mushroom', 'water']);
    expect(recipe).not.toBeNull();
    expect(recipe?.potion).toBe('speed_potion');
  });

  it('returns speed_potion regardless of ingredient order', () => {
    const recipe = findMatchingRecipe(['water', 'red_mushroom']);
    expect(recipe?.potion).toBe('speed_potion');
  });

  it('returns night_potion for crystal + blue_mushroom', () => {
    const recipe = findMatchingRecipe(['crystal', 'blue_mushroom']);
    expect(recipe?.potion).toBe('night_potion');
  });

  it('returns rainbow_potion for all 5 basic ingredients', () => {
    const recipe = findMatchingRecipe([
      'red_mushroom', 'blue_mushroom', 'herbs', 'fern', 'crystal',
    ]);
    expect(recipe?.potion).toBe('rainbow_potion');
  });

  it('returns null for non-matching combo', () => {
    const recipe = findMatchingRecipe(['stardust', 'water']);
    expect(recipe).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(findMatchingRecipe([])).toBeNull();
  });

  it('returns friendship_potion for blue_mushroom + herbs', () => {
    const recipe = findMatchingRecipe(['blue_mushroom', 'herbs']);
    expect(recipe?.potion).toBe('friendship_potion');
  });

  it('covers all 8 recipes defined', () => {
    expect(RECIPES).toHaveLength(8);
  });
});

describe('canBrew', () => {
  it('returns true when inventory has exactly enough ingredients', () => {
    const inv: Partial<Record<IngredientType, number>> = {
      red_mushroom: 1,
      water: 1,
    };
    const recipe = RECIPES.find((r) => r.potion === 'speed_potion')!;
    expect(canBrew(inv, recipe)).toBe(true);
  });

  it('returns true when inventory has more than enough', () => {
    const inv: Partial<Record<IngredientType, number>> = {
      red_mushroom: 5,
      water: 3,
    };
    const recipe = RECIPES.find((r) => r.potion === 'speed_potion')!;
    expect(canBrew(inv, recipe)).toBe(true);
  });

  it('returns false when an ingredient is missing', () => {
    const inv: Partial<Record<IngredientType, number>> = {
      red_mushroom: 1,
    };
    const recipe = RECIPES.find((r) => r.potion === 'speed_potion')!;
    expect(canBrew(inv, recipe)).toBe(false);
  });

  it('returns false for empty inventory', () => {
    const recipe = RECIPES.find((r) => r.potion === 'speed_potion')!;
    expect(canBrew({}, recipe)).toBe(false);
  });

  it('handles multi-ingredient recipe (grow_potion)', () => {
    const inv: Partial<Record<IngredientType, number>> = {
      fern: 1,
      water: 1,
      herbs: 1,
    };
    const recipe = RECIPES.find((r) => r.potion === 'grow_potion')!;
    expect(canBrew(inv, recipe)).toBe(true);
  });

  it('returns false when one of three ingredients is missing', () => {
    const inv: Partial<Record<IngredientType, number>> = {
      fern: 1,
      water: 1,
    };
    const recipe = RECIPES.find((r) => r.potion === 'grow_potion')!;
    expect(canBrew(inv, recipe)).toBe(false);
  });
});

describe('createInitialState', () => {
  it('creates state with expected shape', () => {
    const state = createInitialState(800, 600);
    expect(state).toBeDefined();
    expect(state.score).toBe(0);
    expect(state.day).toBe(1);
  });

  it('places witch near canvas center', () => {
    const state = createInitialState(800, 600);
    expect(state.witch.x).toBeCloseTo(400, 0);
  });

  it('spawns initial world ingredients', () => {
    const state = createInitialState(800, 600);
    expect(state.worldIngredients.length).toBeGreaterThan(0);
    expect(state.worldIngredients.length).toBeLessThanOrEqual(12);
  });

  it('starts with empty inventory', () => {
    const state = createInitialState(800, 600);
    const total = Object.values(state.inventory).reduce((s, c) => s + (c ?? 0), 0);
    expect(total).toBe(0);
  });

  it('has two NPCs (cat and monster)', () => {
    const state = createInitialState(800, 600);
    expect(state.npcs).toHaveLength(2);
    expect(state.npcs.map((n) => n.type)).toContain('cat');
    expect(state.npcs.map((n) => n.type)).toContain('monster');
  });

  it('starts with no active effects', () => {
    const state = createInitialState(800, 600);
    expect(state.activeEffects).toHaveLength(0);
  });

  it('starts with cauldron closed', () => {
    const state = createInitialState(800, 600);
    expect(state.cauldron.isOpen).toBe(false);
    expect(state.cauldron.brewing).toBe(false);
  });

  it('stores canvas dimensions', () => {
    const state = createInitialState(1024, 768);
    expect(state.canvasWidth).toBe(1024);
    expect(state.canvasHeight).toBe(768);
  });
});

describe('shouldTriggerEvent', () => {
  it('returns true when eventTimer <= 0 and no mini-game active', () => {
    const state = createInitialState(800, 600);
    state.eventTimer = 0;
    expect(shouldTriggerEvent(state)).toBe(true);
  });

  it('returns false when eventTimer > 0', () => {
    const state = createInitialState(800, 600);
    state.eventTimer = 5000;
    expect(shouldTriggerEvent(state)).toBe(false);
  });

  it('returns false when mini-game is active even if timer expired', () => {
    const state = createInitialState(800, 600);
    state.eventTimer = 0;
    state.miniGame.type = 'butterfly';
    expect(shouldTriggerEvent(state)).toBe(false);
  });
});
