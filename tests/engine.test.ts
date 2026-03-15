import { describe, it, expect } from 'vitest';
import {
  addToInventory,
  removeFromInventory,
  hasIngredients,
  spawnIngredient,
  createInitialState,
  INGREDIENT_DEFS,
  POTION_RECIPES,
} from '@/game/engine';
import type { GameState } from '@/shared/types';

describe('addToInventory', () => {
  it('adds a new item', () => {
    const inv = addToInventory([], 'mushroom_red');
    expect(inv).toEqual([{ type: 'mushroom_red', quantity: 1 }]);
  });

  it('increments quantity of existing item', () => {
    const inv = addToInventory([{ type: 'mushroom_red', quantity: 2 }], 'mushroom_red');
    expect(inv.find(i => i.type === 'mushroom_red')?.quantity).toBe(3);
  });
});

describe('removeFromInventory', () => {
  it('decrements quantity', () => {
    const inv = removeFromInventory([{ type: 'herb', quantity: 3 }], 'herb');
    expect(inv.find(i => i.type === 'herb')?.quantity).toBe(2);
  });

  it('removes item when quantity reaches 0', () => {
    const inv = removeFromInventory([{ type: 'herb', quantity: 1 }], 'herb');
    expect(inv.length).toBe(0);
  });
});

describe('hasIngredients', () => {
  it('returns true when enough', () => {
    const inv = [{ type: 'mushroom_red' as const, quantity: 2 }, { type: 'mushroom_blue' as const, quantity: 1 }];
    expect(hasIngredients(inv, ['mushroom_red', 'mushroom_blue'])).toBe(true);
  });

  it('returns false when not enough', () => {
    const inv = [{ type: 'mushroom_red' as const, quantity: 1 }];
    expect(hasIngredients(inv, ['mushroom_red', 'mushroom_blue'])).toBe(false);
  });

  it('handles duplicate recipe ingredients', () => {
    const inv = [{ type: 'crystal' as const, quantity: 1 }];
    expect(hasIngredients(inv, ['crystal', 'crystal'])).toBe(false);
    const inv2 = [{ type: 'crystal' as const, quantity: 2 }];
    expect(hasIngredients(inv2, ['crystal', 'crystal'])).toBe(true);
  });
});

describe('INGREDIENT_DEFS', () => {
  it('has all 9 ingredient types', () => {
    const types = Object.keys(INGREDIENT_DEFS);
    expect(types.length).toBe(9);
  });

  it('star is nightOnly', () => {
    expect(INGREDIENT_DEFS.star.nightOnly).toBe(true);
  });
});

describe('POTION_RECIPES', () => {
  it('has 6 recipes', () => {
    expect(POTION_RECIPES.length).toBe(6);
  });

  it('every recipe has at least 2 ingredients', () => {
    POTION_RECIPES.forEach(r => {
      expect(r.recipe.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('spawnIngredient', () => {
  const stubState: Pick<GameState, 'worldIngredients' | 'activeEffects' | 'gameTime'> = {
    worldIngredients: [],
    activeEffects: [],
    gameTime: 0,
  };

  it('returns an ingredient when under limit', () => {
    const ing = spawnIngredient(stubState, 1000, 700, false);
    expect(ing).not.toBeNull();
    expect(ing?.x).toBeGreaterThanOrEqual(0);
  });

  it('returns null when at max', () => {
    const full = { ...stubState, worldIngredients: Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`, type: 'herb' as const, x: 0, y: 0, collected: false,
    })) };
    const ing = spawnIngredient(full, 1000, 700, false);
    expect(ing).toBeNull();
  });

  it('spawns star dust only at night', () => {
    let sawStarDay = false;
    for (let i = 0; i < 100; i++) {
      const ing = spawnIngredient(stubState, 1000, 700, false);
      if (ing?.type === 'star') sawStarDay = true;
    }
    expect(sawStarDay).toBe(false);
  });
});

describe('createInitialState', () => {
  it('initializes with empty inventory', () => {
    const s = createInitialState(1000, 700);
    expect(s.inventory).toEqual([]);
    expect(s.score).toBe(0);
    expect(s.isNight).toBe(false);
  });

  it('witch starts at canvas center', () => {
    const s = createInitialState(800, 600);
    expect(s.witchX).toBe(400);
  });
});
