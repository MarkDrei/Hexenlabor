import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, brewPotion, usePotion, checkIngredientCollection, spawnIngredient, handleEventClick, triggerRandomEvent } from '@/game/gameLogic';
import { POTION_RECIPES, INGREDIENT_DEFS } from '@/game/constants';
import type { GameState } from '@/game/types';

describe('Game Logic', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState(800, 600);
  });

  describe('createInitialState', () => {
    it('initialises witch at canvas center', () => {
      expect(state.witch.x).toBe(400);
      expect(state.witch.y).toBe(600 * 0.75);
    });

    it('creates empty inventory', () => {
      expect(Object.keys(state.inventory).length).toBe(0);
    });

    it('places cauldron at 50% width, 72% height', () => {
      expect(state.cauldron.x).toBe(400);
      expect(state.cauldron.y).toBeCloseTo(600 * 0.72);
    });
  });

  describe('brewPotion', () => {
    it('consumes ingredients and adds potion when ingredients are present', () => {
      state.inventory.redMushroom = 2;
      state.inventory.herb = 2;

      const msg = brewPotion(state, 'speed');

      expect(state.potions).toContain('speed');
      expect(state.inventory.redMushroom).toBe(1);
      expect(state.inventory.herb).toBe(1);
      expect(msg).toBe(POTION_RECIPES.find(r => r.id === 'speed')!.description);
    });

    it('adds score when brewing', () => {
      state.inventory.redMushroom = 1;
      state.inventory.herb = 1;
      const scoreBefore = state.score;

      brewPotion(state, 'speed');

      expect(state.score).toBe(scoreBefore + 100);
    });

    it('returns unknown for bad potion id', () => {
      const msg = brewPotion(state, 'nonexistent' as never);
      expect(msg).toBe('Unknown recipe!');
    });
  });

  describe('usePotion', () => {
    it('activates potion effect and removes from inventory', () => {
      state.potions.push('speed');

      usePotion(state, 'speed', 800, 600);

      expect(state.potions).not.toContain('speed');
      expect(state.activePotions.some(p => p.type === 'speed')).toBe(true);
    });

    it('does nothing if potion not in inventory', () => {
      usePotion(state, 'speed', 800, 600);
      expect(state.activePotions.some(p => p.type === 'speed')).toBe(false);
    });

    it('star potion triggers ingredient rain event', () => {
      state.potions.push('star');
      usePotion(state, 'star', 800, 600);
      expect(state.activeEvent?.type).toBe('ingredientRain');
    });

    it('crystal brew spawns essence ingredients', () => {
      state.potions.push('crystal');
      const before = state.ingredients.length;
      usePotion(state, 'crystal', 800, 600);
      expect(state.ingredients.length).toBeGreaterThan(before);
    });
  });

  describe('spawnIngredient', () => {
    it('returns ingredient with valid position inside canvas', () => {
      const ing = spawnIngredient(800, 600, false);
      expect(ing.x).toBeGreaterThanOrEqual(0);
      expect(ing.x).toBeLessThanOrEqual(800);
      expect(ing.y).toBeGreaterThan(0);
      expect(ing.y).toBeLessThan(600);
    });

    it('spawns a valid ingredient type', () => {
      const validTypes = Object.keys(INGREDIENT_DEFS);
      const ing = spawnIngredient(800, 600, false);
      expect(validTypes).toContain(ing.type);
    });

    it('spawns essence more often when crystal is active', () => {
      const SAMPLES = 1000;
      const essenceCount = Array.from({ length: SAMPLES }, () =>
        spawnIngredient(800, 600, true)
      ).filter(i => i.type === 'essence').length;
      const normalCount = Array.from({ length: SAMPLES }, () =>
        spawnIngredient(800, 600, false)
      ).filter(i => i.type === 'essence').length;
      // Crystal-active adds 3 extra essence entries to the pool (15 total vs 12),
      // so the expected ratio is ≈25% vs ≈8.3%. With 1000 samples the probability
      // of the crystal count being lower than normal is vanishingly small.
      expect(essenceCount).toBeGreaterThan(normalCount);
    });
  });

  describe('checkIngredientCollection', () => {
    it('collects ingredient when witch is close enough', () => {
      state.ingredients.push({
        id: 'test1',
        type: 'herb',
        x: state.witch.x + 10,
        y: state.witch.y + 5,
        collected: false,
        bobPhase: 0,
        scale: 1,
      });

      checkIngredientCollection(state);

      expect(state.inventory.herb).toBe(1);
      expect(state.ingredients.length).toBe(0); // removed after collection
    });

    it('does not collect ingredient that is too far away', () => {
      state.ingredients.push({
        id: 'test2',
        type: 'crystal',
        x: state.witch.x + 200,
        y: state.witch.y + 200,
        collected: false,
        bobPhase: 0,
        scale: 1,
      });

      checkIngredientCollection(state);

      expect(state.inventory.crystal).toBeUndefined();
      expect(state.ingredients.length).toBe(1);
    });

    it('adds score when ingredient is collected', () => {
      state.ingredients.push({
        id: 'test3',
        type: 'redMushroom',
        x: state.witch.x,
        y: state.witch.y,
        collected: false,
        bobPhase: 0,
        scale: 1,
      });

      checkIngredientCollection(state);

      expect(state.score).toBe(INGREDIENT_DEFS.redMushroom.scoreValue);
    });
  });

  describe('handleEventClick', () => {
    it('collects falling ingredient when clicked', () => {
      state.activeEvent = {
        type: 'ingredientRain',
        timer: 5000,
        duration: 10000,
        fallingIngredients: [{
          id: 'fi1',
          type: 'starDust',
          x: 100,
          y: 200,
          vy: 2,
          spin: 0,
          collected: false,
        }],
        completed: false,
      };

      handleEventClick(state, 100, 200);

      expect(state.inventory.starDust).toBe(1);
      expect(state.activeEvent.fallingIngredients?.[0].collected).toBe(true);
    });

    it('catches firefly when clicked', () => {
      state.activeEvent = {
        type: 'fireflyDance',
        timer: 5000,
        duration: 15000,
        fireflies: [{
          id: 'ff1',
          x: 300,
          y: 300,
          vx: 1,
          vy: 0.5,
          phase: 0,
          caught: false,
        }],
        completed: false,
      };

      handleEventClick(state, 300, 300);

      expect(state.inventory.starDust).toBe(1);
      expect(state.activeEvent.fireflies?.[0].caught).toBe(true);
    });
  });

  describe('triggerRandomEvent', () => {
    it('sets an activeEvent or magicGarden', () => {
      triggerRandomEvent(state, 800, 600);
      const hasEvent = state.activeEvent !== null || state.magicGardenActive;
      expect(hasEvent).toBe(true);
    });
  });

  describe('POTION_RECIPES', () => {
    it('has 6 recipes', () => {
      expect(POTION_RECIPES.length).toBe(6);
    });

    it('all recipes have required fields', () => {
      for (const recipe of POTION_RECIPES) {
        expect(recipe.id).toBeTruthy();
        expect(recipe.name).toBeTruthy();
        expect(Object.keys(recipe.ingredients).length).toBeGreaterThan(0);
        expect(recipe.color).toBeTruthy();
        expect(recipe.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('INGREDIENT_DEFS', () => {
    it('defines all 6 ingredient types', () => {
      const types = ['redMushroom', 'blueMushroom', 'crystal', 'herb', 'starDust', 'essence'];
      for (const type of types) {
        expect(INGREDIENT_DEFS[type as keyof typeof INGREDIENT_DEFS]).toBeDefined();
      }
    });
  });
});
