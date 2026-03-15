// Game constants: ingredient definitions, potion recipes, tuning values

import type { IngredientType, PotionRecipe } from './types';

export interface IngredientDef {
  id: IngredientType;
  name: string;
  color: string;
  glowColor: string;
  rarity: number; // 1 = common, 4 = very rare
  scoreValue: number;
}

export const INGREDIENT_DEFS: Record<IngredientType, IngredientDef> = {
  redMushroom: {
    id: 'redMushroom',
    name: 'Red Mushroom',
    color: '#ef4444',
    glowColor: '#fca5a5',
    rarity: 1,
    scoreValue: 10,
  },
  blueMushroom: {
    id: 'blueMushroom',
    name: 'Blue Mushroom',
    color: '#3b82f6',
    glowColor: '#93c5fd',
    rarity: 2,
    scoreValue: 20,
  },
  crystal: {
    id: 'crystal',
    name: 'Magic Crystal',
    color: '#a855f7',
    glowColor: '#d8b4fe',
    rarity: 2,
    scoreValue: 25,
  },
  herb: {
    id: 'herb',
    name: 'Magic Herb',
    color: '#22c55e',
    glowColor: '#86efac',
    rarity: 1,
    scoreValue: 10,
  },
  starDust: {
    id: 'starDust',
    name: 'Star Dust',
    color: '#facc15',
    glowColor: '#fef08a',
    rarity: 3,
    scoreValue: 40,
  },
  essence: {
    id: 'essence',
    name: 'Magic Essence',
    color: '#ec4899',
    glowColor: '#f9a8d4',
    rarity: 4,
    scoreValue: 60,
  },
};

export const POTION_RECIPES: PotionRecipe[] = [
  {
    id: 'speed',
    name: 'Speed Potion',
    ingredients: { redMushroom: 1, herb: 1 },
    color: '#f97316',
    description: 'Zoom zoom! Move faster for 15 seconds!',
    duration: 15000,
  },
  {
    id: 'growth',
    name: 'Growth Potion',
    ingredients: { blueMushroom: 1, herb: 2 },
    color: '#22c55e',
    description: 'Ingredients glow big and sparkly for 30 seconds!',
    duration: 30000,
  },
  {
    id: 'star',
    name: 'Star Potion',
    ingredients: { redMushroom: 1, blueMushroom: 1 },
    color: '#facc15',
    description: 'A shower of star dust falls from the sky!',
    duration: 10000,
  },
  {
    id: 'crystal',
    name: 'Crystal Brew',
    ingredients: { crystal: 2, redMushroom: 1 },
    color: '#a855f7',
    description: 'Hidden magic essence appears everywhere!',
    duration: 20000,
  },
  {
    id: 'friendship',
    name: 'Friendship Brew',
    ingredients: { crystal: 1, blueMushroom: 1 },
    color: '#ec4899',
    description: 'Your friends bring you delightful gifts!',
    duration: 60000,
  },
  {
    id: 'rainbow',
    name: 'Rainbow Brew',
    ingredients: { redMushroom: 1, blueMushroom: 1, crystal: 1, herb: 1, starDust: 1 },
    color: '#ff6b6b',
    description: 'AMAZING! The sky erupts in magic! Fireflies and ingredients everywhere!',
    duration: 20000,
  },
];

// All ingredient types in weighted array for random spawning
export const SPAWN_WEIGHTS: IngredientType[] = [
  'redMushroom', 'redMushroom', 'redMushroom',
  'blueMushroom', 'blueMushroom',
  'herb', 'herb', 'herb',
  'crystal', 'crystal',
  'starDust',
  'essence',
];

// Tuning
export const CAULDRON_RANGE = 90;         // px — witch can interact with cauldron
export const INGREDIENT_COLLECT_RANGE = 50; // px — auto-collect radius
export const SPAWN_INTERVAL_BASE = 4500;  // ms between spawns (base)
export const EVENT_INTERVAL = 28000;      // ms between random events
export const MAX_INGREDIENTS_ON_MAP = 12;
export const NPC_GIFT_COOLDOWN = 20000;   // ms between NPC gifts
