import type { IngredientType, PotionType, Recipe } from '@/shared/types';

export const RECIPES: Recipe[] = [
  {
    potion: 'speed_potion',
    ingredients: ['red_mushroom', 'water'],
    name: 'Speed Potion',
    description: 'Witch moves 2x faster for 20s!',
  },
  {
    potion: 'night_potion',
    ingredients: ['crystal', 'blue_mushroom'],
    name: 'Night Potion',
    description: 'Switches to night – catch falling stars!',
  },
  {
    potion: 'grow_potion',
    ingredients: ['fern', 'water', 'herbs'],
    name: 'Grow Potion',
    description: 'More ingredient spots appear in the world!',
  },
  {
    potion: 'luck_potion',
    ingredients: ['fairy_dust', 'crystal', 'stardust'],
    name: 'Luck Potion',
    description: 'A treasure chest appears with 5 ingredients!',
  },
  {
    potion: 'friendship_potion',
    ingredients: ['blue_mushroom', 'herbs'],
    name: 'Friendship Potion',
    description: 'Cat & Monster bring you ingredients!',
  },
  {
    potion: 'flying_potion',
    ingredients: ['magic_flower', 'fairy_dust'],
    name: 'Flying Potion',
    description: 'Butterfly-catching mini-game starts!',
  },
  {
    potion: 'rainbow_potion',
    ingredients: ['red_mushroom', 'blue_mushroom', 'herbs', 'fern', 'crystal'],
    name: 'Rainbow Potion',
    description: 'A rainbow appears! +500 bonus score!',
  },
  {
    potion: 'invisibility_potion',
    ingredients: ['stardust', 'herbs', 'crystal'],
    name: 'Invisibility Potion',
    description: 'Memory match mini-game begins!',
  },
];

/**
 * Normalise a list of ingredients so order doesn't matter when matching.
 */
function sortedKey(list: IngredientType[]): string {
  return [...list].sort().join(',');
}

export function findMatchingRecipe(ingredients: IngredientType[]): Recipe | null {
  const key = sortedKey(ingredients);
  return RECIPES.find((r) => sortedKey(r.ingredients) === key) ?? null;
}

export function canBrew(
  inventory: Partial<Record<IngredientType, number>>,
  recipe: Recipe
): boolean {
  // Count required ingredients
  const needed: Partial<Record<IngredientType, number>> = {};
  for (const ing of recipe.ingredients) {
    needed[ing] = (needed[ing] ?? 0) + 1;
  }
  for (const [ing, count] of Object.entries(needed) as [IngredientType, number][]) {
    if ((inventory[ing] ?? 0) < count) return false;
  }
  return true;
}

export function spendIngredients(
  inventory: Partial<Record<IngredientType, number>>,
  recipe: Recipe
): void {
  for (const ing of recipe.ingredients) {
    inventory[ing] = Math.max(0, (inventory[ing] ?? 0) - 1);
  }
}

export const POTION_NAMES: Record<PotionType, string> = {
  speed_potion: 'Speed Potion',
  night_potion: 'Night Potion',
  grow_potion: 'Grow Potion',
  luck_potion: 'Luck Potion',
  friendship_potion: 'Friendship Potion',
  flying_potion: 'Flying Potion',
  rainbow_potion: 'Rainbow Potion',
  invisibility_potion: 'Invisibility Potion',
};

export const INGREDIENT_DISPLAY: Record<IngredientType, { label: string; emoji: string; color: string }> = {
  red_mushroom: { label: 'Red Mushroom', emoji: '🍄', color: '#ef4444' },
  blue_mushroom: { label: 'Blue Mushroom', emoji: '🔵', color: '#3b82f6' },
  herbs: { label: 'Herbs', emoji: '🌿', color: '#22c55e' },
  fern: { label: 'Fern', emoji: '🌱', color: '#16a34a' },
  crystal: { label: 'Crystal', emoji: '💎', color: '#a855f7' },
  stardust: { label: 'Stardust', emoji: '✨', color: '#eab308' },
  fairy_dust: { label: 'Fairy Dust', emoji: '🌸', color: '#ec4899' },
  water: { label: 'Water', emoji: '💧', color: '#38bdf8' },
  magic_flower: { label: 'Magic Flower', emoji: '🌺', color: '#f472b6' },
};
