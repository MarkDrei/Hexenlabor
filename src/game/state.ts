import {
  GameState,
  GamePhase,
  IngredientType,
  Order,
  Recipe,
  BrewingState,
  CollectAnimation,
  PotionEffect,
} from '@/shared/types';
import { loadProgress, saveProgress, clearProgress } from '@/game/persistence';

// Hardcoded thresholds for the first 6 levels (indices 0–5, where index = level number).
// Beyond level 5, each level requires roughly double the stars of the previous level-up gap.
// Increment at level 5→6 is 800; it doubles each subsequent level.
const LEVEL_THRESHOLDS_BASE = [0, 50, 150, 350, 700, 1500];

/**
 * Returns the total stars needed to reach `level` (0-indexed by level number).
 * Extends the table infinitely using the same doubling-gap math.
 */
function getLevelThreshold(level: number): number {
  if (level < LEVEL_THRESHOLDS_BASE.length) {
    return LEVEL_THRESHOLDS_BASE[level];
  }
  // gap at level 6 = 800, doubles each subsequent level
  return Math.round(1500 + 1600 * (Math.pow(2, level - 5) - 1));
}

/**
 * Computes the level a player is at given their total stars.
 * Mirrors the level-up logic in addStars().
 */
function computeLevelFromStars(stars: number): number {
  let level = 1;
  let threshold = getLevelThreshold(level);
  while (stars >= threshold) {
    level++;
    threshold = getLevelThreshold(level);
  }
  return level;
}

function createInitialState(): GameState {
  return {
    score: 0,
    stars: 0,
    level: 1,
    inventory: [],
    brewedPotion: null,
    selectedRecipe: null,
    activeOrders: [],
    ingredients: [],
    phase: 'exploring',
    brewingState: null,
    unlockedRecipes: ['heiltrank', 'schlaftrank'],
    collectAnimations: [],
    showRecipeBook: false,
    celebrateTimer: 0,
    activeEffects: [],
  };
}

export const gameState: GameState = (() => {
  const state = createInitialState();
  const saved = loadProgress();
  if (saved) {
    state.stars = saved.stars;
    state.score = saved.score;
    state.inventory = saved.inventory;
    // Derive level and unlockedRecipes from stars (never stored)
    state.level = computeLevelFromStars(saved.stars);
    state.unlockedRecipes = computeUnlockedRecipes(state.level);
  }
  return state;
})();

export function resetState(): void {
  Object.assign(gameState, createInitialState());
  clearProgress();
}

/** Persist current stars, score and inventory to localStorage. */
export function saveGameProgress(): void {
  saveProgress({
    stars: gameState.stars,
    score: gameState.score,
    inventory: gameState.inventory,
  });
}

const MAX_INVENTORY_SLOTS = 8;
const MAX_STACK = 256;

export function addToInventory(type: IngredientType): boolean {
  const existing = gameState.inventory.find(s => s.type === type);
  if (existing) {
    if (existing.count >= MAX_STACK) return false;
    existing.count++;
    saveGameProgress();
    return true;
  }
  if (gameState.inventory.length >= MAX_INVENTORY_SLOTS) return false;
  gameState.inventory.push({ type, count: 1 });
  saveGameProgress();
  return true;
}

export function removeFromInventory(index: number): IngredientType | null {
  const slot = gameState.inventory[index];
  if (!slot) return null;
  const type = slot.type;
  slot.count--;
  if (slot.count <= 0) {
    gameState.inventory.splice(index, 1);
  }
  saveGameProgress();
  return type;
}

export function clearInventory(): void {
  gameState.inventory = [];
  saveGameProgress();
}

export function inventoryFull(): boolean {
  return gameState.inventory.length >= MAX_INVENTORY_SLOTS &&
    gameState.inventory.every(s => s.count >= MAX_STACK);
}

export function inventoryEmpty(): boolean {
  return gameState.inventory.length === 0;
}

export function addStars(amount: number): void {
  gameState.stars += amount;
  gameState.score += amount;
  // Check level-up: extend infinitely using getLevelThreshold.
  // Cache the threshold to avoid redundant calculations when multiple level-ups occur.
  let nextThreshold = getLevelThreshold(gameState.level);
  while (gameState.stars >= nextThreshold) {
    gameState.level++;
    gameState.phase = 'celebrating';
    gameState.celebrateTimer = 180; // ~3 seconds at 60fps
    nextThreshold = getLevelThreshold(gameState.level);
  }
  saveGameProgress();
}

export function addOrder(order: Order): void {
  if (gameState.activeOrders.length < 3) {
    gameState.activeOrders.push(order);
  }
}

export function completeOrder(orderId: number): Order | undefined {
  const idx = gameState.activeOrders.findIndex(o => o.id === orderId);
  if (idx === -1) return undefined;
  return gameState.activeOrders.splice(idx, 1)[0];
}

export function setPhase(phase: GamePhase): void {
  gameState.phase = phase;
}

export function startBrewing(recipeId: string): void {
  gameState.phase = 'brewing';
  gameState.brewingState = {
    bubbleIndex: 0,
    bubbleTimer: 0,
    bubbleActive: false,
    hits: 0,
    totalBubbles: 3,
    recipeId,
  };
}

export function addCollectAnimation(anim: CollectAnimation): void {
  gameState.collectAnimations.push(anim);
}

export function updateCollectAnimations(): void {
  for (const a of gameState.collectAnimations) {
    a.progress += 0.04;
    a.x += (a.targetX - a.x) * 0.08;
    a.y += (a.targetY - a.y) * 0.08;
  }
  gameState.collectAnimations = gameState.collectAnimations.filter(a => a.progress < 1);
}

// Level 1: heiltrank, schlaftrank
// Level 2: +liebestrank
// Level 3: +feuertrank
// Level 4: +sternenstaub, +mondtrank
// Level 5: +regenbogentrank, +ewigkeitstrank
const RECIPE_UNLOCKS_BY_LEVEL: string[][] = [
  [],
  ['heiltrank', 'schlaftrank'],
  ['liebestrank'],
  ['feuertrank'],
  ['sternenstaub', 'mondtrank'],
  ['regenbogentrank', 'ewigkeitstrank'],
];

function computeUnlockedRecipes(level: number): string[] {
  const all: string[] = [];
  for (let l = 1; l <= level; l++) {
    if (RECIPE_UNLOCKS_BY_LEVEL[l]) all.push(...RECIPE_UNLOCKS_BY_LEVEL[l]);
  }
  return all;
}

export function getRecipeUnlocks(): string[] {
  gameState.unlockedRecipes = computeUnlockedRecipes(gameState.level);
  return gameState.unlockedRecipes;
}

const POTION_EFFECT_DURATION = 1200; // ~20 seconds at 60 fps

/** Speed multipliers applied to movement by certain potion effects (< 1 = slower, > 1 = faster). */
const POTION_SPEED_MODIFIERS: Partial<Record<string, number>> = {
  schlaftrank:     0.2,  // very slow
  sternenstaub:    1.6,  // stardust energises
  regenbogentrank: 2.2,  // rainbow turbo
};

/** Spawn a new potion effect on a target character. */
export function addPotionEffect(recipeId: string, target: PotionEffect['target']): void {
  // Remove any existing effect on the same target so they don't stack awkwardly
  gameState.activeEffects = gameState.activeEffects.filter(e => e.target !== target);
  gameState.activeEffects.push({
    recipeId,
    target,
    timer: POTION_EFFECT_DURATION,
    maxTimer: POTION_EFFECT_DURATION,
  });
}

/** Tick down effect timers and remove expired effects. */
export function updatePotionEffects(): void {
  for (const e of gameState.activeEffects) {
    e.timer--;
  }
  gameState.activeEffects = gameState.activeEffects.filter(e => e.timer > 0);
}

/**
 * Returns the speed multiplier for a character based on any active potion effect.
 * 1.0 = normal, < 1.0 = slowed, > 1.0 = boosted.
 */
export function getEffectSpeedMultiplier(target: PotionEffect['target']): number {
  for (const ef of gameState.activeEffects) {
    if (ef.target === target) {
      const mod = POTION_SPEED_MODIFIERS[ef.recipeId];
      if (mod !== undefined) return mod;
    }
  }
  return 1;
}
