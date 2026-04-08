import { describe, expect, it } from 'vitest';
import {
  createMiniGameState,
  getMiniGameRewards,
  spawnMiniGameObstacle,
  updateMiniGame,
} from '@/game/minigame';
import { IngredientType } from '@/shared/types';

describe('mini game obstacle spawning', () => {
  it('spawns an ingredient collectible on every fourth obstacle', () => {
    const state = createMiniGameState(420, 900);
    const random = () => 0.2;

    spawnMiniGameObstacle(state, random);
    spawnMiniGameObstacle(state, random);
    spawnMiniGameObstacle(state, random);
    const obstacle = spawnMiniGameObstacle(state, random);

    expect(obstacle.collectible?.kind).toBe('ingredient');
    expect(obstacle.collectible?.ingredientType).toBe(IngredientType.Hexenkraut);
  });
});

describe('mini game collision handling', () => {
  it('uses a shield instead of crashing once', () => {
    const state = createMiniGameState(420, 900);
    state.shieldCharges = 1;
    state.obstacles.push({
      x: state.witchX - 10,
      width: 60,
      gapY: 0,
      gapHeight: 80,
      passed: false,
      collectible: null,
    });

    const result = updateMiniGame(state, () => 0.4);

    expect(result.usedShield).toBe(true);
    expect(result.crashed).toBe(false);
    expect(state.status).toBe('running');
    expect(state.shieldCharges).toBe(0);
  });
});

describe('mini game rewards', () => {
  it('awards stars and at least one ingredient for a successful run', () => {
    const state = createMiniGameState(420, 900);
    state.score = 3;
    state.starsCollected = 2;
    state.bestCombo = 2;
    state.collectedIngredients = [IngredientType.Stern];

    const rewards = getMiniGameRewards(state);

    expect(rewards.stars).toBe(15);
    expect(rewards.ingredients).toContain(IngredientType.Stern);
    expect(rewards.ingredients).toHaveLength(2);
  });

  it('awards nothing for a run with zero progress', () => {
    const rewards = getMiniGameRewards(createMiniGameState(420, 900));

    expect(rewards.stars).toBe(0);
    expect(rewards.ingredients).toEqual([]);
  });

  it('caps ingredient rewards at six items', () => {
    const state = createMiniGameState(420, 900);
    state.score = 12;
    state.starsCollected = 4;
    state.bestCombo = 6;
    state.collectedIngredients = [
      IngredientType.Zauberbeerle,
      IngredientType.Hexenkraut,
      IngredientType.Kerze,
      IngredientType.Fliegenpilz,
      IngredientType.Stern,
      IngredientType.Mondkristall,
    ];

    const rewards = getMiniGameRewards(state);

    expect(rewards.ingredients).toHaveLength(6);
  });
});
