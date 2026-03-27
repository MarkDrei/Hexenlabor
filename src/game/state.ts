import {
  GameState,
  GamePhase,
  IngredientType,
  Order,
  Recipe,
  BrewingState,
  CollectAnimation,
} from '@/shared/types';

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1500];

function createInitialState(): GameState {
  return {
    score: 0,
    stars: 0,
    level: 1,
    inventory: [],
    brewedPotion: null,
    activeOrders: [],
    ingredients: [],
    phase: 'exploring',
    brewingState: null,
    unlockedRecipes: ['heiltrank', 'schlaftrank'],
    collectAnimations: [],
    showRecipeBook: false,
    celebrateTimer: 0,
  };
}

export const gameState: GameState = createInitialState();

export function resetState(): void {
  Object.assign(gameState, createInitialState());
}

const MAX_INVENTORY_SLOTS = 8;
const MAX_STACK = 256;

export function addToInventory(type: IngredientType): boolean {
  const existing = gameState.inventory.find(s => s.type === type);
  if (existing) {
    if (existing.count >= MAX_STACK) return false;
    existing.count++;
    return true;
  }
  if (gameState.inventory.length >= MAX_INVENTORY_SLOTS) return false;
  gameState.inventory.push({ type, count: 1 });
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
  return type;
}

export function clearInventory(): void {
  gameState.inventory = [];
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
  // Check level-up
  while (
    gameState.level < LEVEL_THRESHOLDS.length - 1 &&
    gameState.stars >= LEVEL_THRESHOLDS[gameState.level]
  ) {
    gameState.level++;
    gameState.phase = 'celebrating';
    gameState.celebrateTimer = 180; // ~3 seconds at 60fps
  }
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

export function startBrewing(): void {
  gameState.phase = 'brewing';
  gameState.brewingState = {
    bubbleIndex: 0,
    bubbleTimer: 0,
    bubbleActive: false,
    hits: 0,
    totalBubbles: 3,
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

export function getRecipeUnlocks(): string[] {
  // Level 1: heiltrank, schlaftrank
  // Level 2: +liebestrank
  // Level 3: +feuertrank
  // Level 4: +sternenstaub, +mondtrank
  // Level 5: +regenbogentrank, +ewigkeitstrank
  const unlocks: string[][] = [
    [],
    ['heiltrank', 'schlaftrank'],
    ['liebestrank'],
    ['feuertrank'],
    ['sternenstaub', 'mondtrank'],
    ['regenbogentrank', 'ewigkeitstrank'],
  ];
  const all: string[] = [];
  for (let l = 1; l <= gameState.level; l++) {
    if (unlocks[l]) all.push(...unlocks[l]);
  }
  gameState.unlockedRecipes = all;
  return all;
}
