import {
  Ingredient,
  IngredientType,
  IngredientDef,
  Floor,
  HutBounds,
  Rarity,
} from '@/shared/types';
import { gameState } from '@/game/state';

let nextId = 1;

const INGREDIENT_DEFS: IngredientDef[] = [
  { type: IngredientType.Zauberbeerle,  floors: ['ground'],         rarity: 'common' },
  { type: IngredientType.Kerze,         floors: ['ground'],         rarity: 'uncommon' },
  { type: IngredientType.Hexenkraut,    floors: ['middle'],         rarity: 'common' },
  { type: IngredientType.Fliegenpilz,   floors: ['middle'],         rarity: 'uncommon' },
  { type: IngredientType.Mondkristall,  floors: ['top'],            rarity: 'rare' },
  { type: IngredientType.Mondstein,     floors: ['top'],            rarity: 'rare' },
  { type: IngredientType.Stern,         floors: ['top', 'middle'],  rarity: 'rare' },
  { type: IngredientType.Schmetterling, floors: ['top'],            rarity: 'epic' },
];

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 40,
  uncommon: 30,
  rare: 20,
  epic: 10,
};

const MAX_PER_FLOOR = 3;
const INGREDIENT_LIFETIME = 60 * 60; // ~60 seconds at 60fps
const FADE_FRAMES = 60;
const SPAWN_INTERVAL = 90; // ~1.5 seconds at 60fps

let spawnTimer = 0;

/** Floor Y ranges (proportional to hutH, with yOffset applied) */
function getFloorBounds(floor: Floor, hut: HutBounds) {
  const { hutX, hutW, hutH, yOffset } = hut;
  switch (floor) {
    case 'ground':
      return {
        minX: hutX + hutW * 0.18,
        maxX: hutX + hutW * 0.75,
        y: hutH * 0.91 - yOffset,
      };
    case 'middle':
      return {
        minX: hutX + hutW * 0.20,
        maxX: hutX + hutW * 0.70,
        y: hutH * 0.63 - yOffset,
      };
    case 'top':
      return {
        minX: hutX + hutW * 0.22,
        maxX: hutX + hutW * 0.65,
        y: hutH * 0.44 - yOffset,
      };
  }
}

function weightedRandom(defs: IngredientDef[]): IngredientDef {
  const totalWeight = defs.reduce((s, d) => s + RARITY_WEIGHT[d.rarity], 0);
  let r = Math.random() * totalWeight;
  for (const d of defs) {
    r -= RARITY_WEIGHT[d.rarity];
    if (r <= 0) return d;
  }
  return defs[defs.length - 1];
}

function countOnFloor(floor: Floor): number {
  return gameState.ingredients.filter(i => i.floor === floor).length;
}

export function spawnIngredient(hut: HutBounds): Ingredient | null {
  // Pick a random floor that isn't full
  const floors: Floor[] = ['ground', 'middle', 'top'];
  const available = floors.filter(f => countOnFloor(f) < MAX_PER_FLOOR);
  if (available.length === 0) return null;

  const floor = available[Math.floor(Math.random() * available.length)];
  const candidates = INGREDIENT_DEFS.filter(d => d.floors.includes(floor));
  if (candidates.length === 0) return null;

  const def = weightedRandom(candidates);
  const bounds = getFloorBounds(floor, hut);

  const ingredient: Ingredient = {
    id: nextId++,
    type: def.type,
    floor,
    position: {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.y,
    },
    glowPhase: Math.random() * Math.PI * 2,
    spawnTime: 0,
    opacity: 1,
  };

  gameState.ingredients.push(ingredient);
  return ingredient;
}

export function updateIngredients(hut: HutBounds): void {
  spawnTimer++;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnIngredient(hut);
  }

  for (const ing of gameState.ingredients) {
    ing.spawnTime++;
    ing.glowPhase += 0.05;

    // Fade out near end of lifetime
    const remaining = INGREDIENT_LIFETIME - ing.spawnTime;
    if (remaining < FADE_FRAMES) {
      ing.opacity = Math.max(0, remaining / FADE_FRAMES);
    }
  }

  // Remove expired
  gameState.ingredients = gameState.ingredients.filter(i => i.spawnTime < INGREDIENT_LIFETIME);
}

export function removeIngredient(id: number): void {
  gameState.ingredients = gameState.ingredients.filter(i => i.id !== id);
}

export function findNearbyIngredient(
  x: number,
  y: number,
  radius: number,
): Ingredient | null {
  for (const ing of gameState.ingredients) {
    const dist = Math.hypot(ing.position.x - x, ing.position.y - y);
    if (dist < radius) return ing;
  }
  return null;
}
