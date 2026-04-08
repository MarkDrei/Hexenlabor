import { IngredientType } from '@/shared/types';

export type MiniGameCollectibleKind = 'star' | 'ingredient' | 'shield';

export interface MiniGameCollectible {
  kind: MiniGameCollectibleKind;
  y: number;
  collected: boolean;
  ingredientType?: IngredientType;
}

export interface MiniGameObstacle {
  x: number;
  width: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
  collectible: MiniGameCollectible | null;
}

export interface MiniGameState {
  width: number;
  height: number;
  witchX: number;
  witchY: number;
  witchVelocity: number;
  obstacles: MiniGameObstacle[];
  frames: number;
  spawnTimer: number;
  spawnCount: number;
  score: number;
  starsCollected: number;
  collectedIngredients: IngredientType[];
  shieldCharges: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  status: 'running' | 'crashed';
}

export interface MiniGameUpdateResult {
  crashed: boolean;
  usedShield: boolean;
  passedObstacle: boolean;
  collectedStar: boolean;
  collectedIngredient: IngredientType | null;
  collectedShield: boolean;
}

export interface MiniGameRewards {
  stars: number;
  ingredients: IngredientType[];
}

const MINI_GAME_INGREDIENT_POOL: IngredientType[] = [
  IngredientType.Zauberbeerle,
  IngredientType.Hexenkraut,
  IngredientType.Kerze,
  IngredientType.Fliegenpilz,
  IngredientType.Stern,
  IngredientType.Mondkristall,
];

// Tuned in pixels / frames for a portrait-friendly run that stays easier than Flappy Bird.
const GRAVITY = 0.38;
const FLAP_STRENGTH = -6.5;
const BASE_SPEED = 2.8;
const BASE_SPAWN_INTERVAL = 92;
const BONUS_INGREDIENT_SCORE_DIVISOR = 4;
const MAX_INGREDIENT_REWARDS = 6;

export function createMiniGameState(width: number, height: number): MiniGameState {
  return {
    width,
    height,
    witchX: width * 0.35,
    witchY: height * 0.45,
    witchVelocity: 0,
    obstacles: [],
    frames: 0,
    spawnTimer: 24,
    spawnCount: 0,
    score: 0,
    starsCollected: 0,
    collectedIngredients: [],
    shieldCharges: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    status: 'running',
  };
}

export function flapMiniGame(state: MiniGameState): void {
  if (state.status !== 'running') return;
  state.witchVelocity = FLAP_STRENGTH;
}

export function spawnMiniGameObstacle(
  state: MiniGameState,
  random: () => number = Math.random,
): MiniGameObstacle {
  state.spawnCount++;

  const width = Math.max(74, Math.min(116, state.width * 0.18));
  const gapHeight = Math.max(170, state.height * 0.27);
  const safeMargin = state.height * 0.12;
  const gapY = safeMargin + random() * Math.max(20, state.height - gapHeight - safeMargin * 2);

  let collectible: MiniGameCollectible | null = null;
  if (state.shieldCharges === 0 && state.spawnCount % 7 === 0) {
    collectible = { kind: 'shield', y: gapY + gapHeight * 0.5, collected: false };
  } else if (state.spawnCount % 4 === 0) {
    collectible = {
      kind: 'ingredient',
      y: gapY + gapHeight * 0.5,
      collected: false,
      ingredientType: MINI_GAME_INGREDIENT_POOL[
        Math.floor(random() * MINI_GAME_INGREDIENT_POOL.length)
      ],
    };
  } else {
    collectible = { kind: 'star', y: gapY + gapHeight * 0.5, collected: false };
  }

  const obstacle: MiniGameObstacle = {
    x: state.width + width,
    width,
    gapY,
    gapHeight,
    passed: false,
    collectible,
  };
  state.obstacles.push(obstacle);
  return obstacle;
}

export function updateMiniGame(
  state: MiniGameState,
  random: () => number = Math.random,
): MiniGameUpdateResult {
  const result: MiniGameUpdateResult = {
    crashed: false,
    usedShield: false,
    passedObstacle: false,
    collectedStar: false,
    collectedIngredient: null,
    collectedShield: false,
  };

  if (state.status !== 'running') return result;

  state.frames++;
  state.witchVelocity = Math.min(9, state.witchVelocity + GRAVITY);
  state.witchY += state.witchVelocity;

  if (state.comboTimer > 0) {
    state.comboTimer--;
  } else {
    state.combo = 0;
  }

  state.spawnTimer--;
  if (state.spawnTimer <= 0) {
    spawnMiniGameObstacle(state, random);
    state.spawnTimer = Math.max(60, BASE_SPAWN_INTERVAL - Math.min(28, state.score * 2));
  }

  const speed = BASE_SPEED + Math.min(2.2, state.score * 0.06);
  const witchRadius = Math.max(18, Math.min(state.width, state.height) * 0.04);

  const absorbCollision = (obstacle?: MiniGameObstacle) => {
    state.shieldCharges = Math.max(0, state.shieldCharges - 1);
    state.combo = 0;
    state.comboTimer = 0;
    result.usedShield = true;
    if (obstacle) {
      obstacle.passed = true;
      obstacle.x = -obstacle.width - 20;
    }
  };

  if (state.witchY - witchRadius < 24 || state.witchY + witchRadius > state.height - 24) {
    if (state.shieldCharges > 0) {
      absorbCollision();
      state.witchY = Math.max(36 + witchRadius, Math.min(state.height - 36 - witchRadius, state.witchY));
      state.witchVelocity = 0;
    } else {
      state.status = 'crashed';
      result.crashed = true;
      return result;
    }
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= speed;

    const overlapX =
      state.witchX + witchRadius > obstacle.x &&
      state.witchX - witchRadius < obstacle.x + obstacle.width;

    const insideGap =
      state.witchY - witchRadius > obstacle.gapY &&
      state.witchY + witchRadius < obstacle.gapY + obstacle.gapHeight;

    if (overlapX && !insideGap) {
      if (state.shieldCharges > 0) {
        absorbCollision(obstacle);
      } else {
        state.status = 'crashed';
        result.crashed = true;
        return result;
      }
    }

    if (!obstacle.passed && obstacle.x + obstacle.width < state.witchX) {
      obstacle.passed = true;
      state.score++;
      state.combo++;
      state.comboTimer = 120;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      result.passedObstacle = true;
    }

    if (obstacle.collectible && !obstacle.collectible.collected) {
      const collectibleX = obstacle.x + obstacle.width * 0.5;
      if (Math.hypot(collectibleX - state.witchX, obstacle.collectible.y - state.witchY) < witchRadius + 16) {
        obstacle.collectible.collected = true;
        if (obstacle.collectible.kind === 'star') {
          state.starsCollected++;
          result.collectedStar = true;
        } else if (obstacle.collectible.kind === 'ingredient' && obstacle.collectible.ingredientType) {
          state.collectedIngredients.push(obstacle.collectible.ingredientType);
          result.collectedIngredient = obstacle.collectible.ingredientType;
        } else if (obstacle.collectible.kind === 'shield') {
          state.shieldCharges = 1;
          result.collectedShield = true;
        }
      }
    }
  }

  state.obstacles = state.obstacles.filter(obstacle => obstacle.x + obstacle.width > -40);
  return result;
}

export function getMiniGameRewards(state: MiniGameState): MiniGameRewards {
  const bonusCount = state.score > 0
    ? Math.max(1, Math.floor(state.score / BONUS_INGREDIENT_SCORE_DIVISOR))
    : 0;
  const bonusIngredients: IngredientType[] = [];
  for (let i = 0; i < bonusCount; i++) {
    bonusIngredients.push(
      MINI_GAME_INGREDIENT_POOL[(state.score + state.starsCollected + i) % MINI_GAME_INGREDIENT_POOL.length],
    );
  }

  return {
    stars: state.score * 3 + state.starsCollected * 2 + state.bestCombo,
    ingredients: [...state.collectedIngredients, ...bonusIngredients].slice(0, MAX_INGREDIENT_REWARDS),
  };
}
