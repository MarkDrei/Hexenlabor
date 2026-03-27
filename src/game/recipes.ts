import { IngredientType, Recipe } from '@/shared/types';
import { gameState } from '@/game/state';

export const ALL_RECIPES: Recipe[] = [
  {
    id: 'heiltrank',
    name: 'Heiltrank',
    emoji: '💚',
    ingredients: [IngredientType.Hexenkraut, IngredientType.Zauberbeerle, IngredientType.Mondkristall],
    rewardStars: 10,
    unlockLevel: 1,
  },
  {
    id: 'schlaftrank',
    name: 'Schlaftrank',
    emoji: '💜',
    ingredients: [IngredientType.Hexenkraut, IngredientType.Mondstein, IngredientType.Zauberbeerle],
    rewardStars: 15,
    unlockLevel: 1,
  },
  {
    id: 'liebestrank',
    name: 'Liebestrank',
    emoji: '💕',
    ingredients: [IngredientType.Mondstein, IngredientType.Fliegenpilz, IngredientType.Stern],
    rewardStars: 20,
    unlockLevel: 2,
  },
  {
    id: 'feuertrank',
    name: 'Feuertrank',
    emoji: '🔥',
    ingredients: [IngredientType.Kerze, IngredientType.Fliegenpilz, IngredientType.Stern],
    rewardStars: 25,
    unlockLevel: 3,
  },
  {
    id: 'sternenstaub',
    name: 'Sternenstaub',
    emoji: '✨',
    ingredients: [IngredientType.Stern, IngredientType.Mondkristall, IngredientType.Schmetterling],
    rewardStars: 30,
    unlockLevel: 4,
  },
  {
    id: 'mondtrank',
    name: 'Mondtrank',
    emoji: '🌕',
    ingredients: [IngredientType.Mondstein, IngredientType.Mondkristall, IngredientType.Kerze],
    rewardStars: 30,
    unlockLevel: 4,
  },
  {
    id: 'regenbogentrank',
    name: 'Regenbogentrank',
    emoji: '🌈',
    ingredients: [IngredientType.Mondkristall, IngredientType.Schmetterling, IngredientType.Stern],
    rewardStars: 50,
    unlockLevel: 5,
  },
  {
    id: 'ewigkeitstrank',
    name: 'Ewigkeitstrank',
    emoji: '♾️',
    ingredients: [IngredientType.Schmetterling, IngredientType.Mondstein, IngredientType.Hexenkraut],
    rewardStars: 50,
    unlockLevel: 5,
  },
];

/**
 * Find a recipe that can be made from the current inventory.
 * Checks all 3-element subsets of the (up to 5) inventory items.
 * Prefers the player's selectedRecipe if it is brewable.
 */
export function findMatchingRecipe(): Recipe | null {
  // Expand stacked inventory to flat type list (one entry per unique type present)
  const inv = gameState.inventory.map(s => s.type);
  if (inv.length < 3) return null;

  // Prefer the selected recipe when it is unlocked and the ingredients are available
  if (gameState.selectedRecipe) {
    const selected = gameState.selectedRecipe;
    if (gameState.unlockedRecipes.includes(selected.id)) {
      const rSorted = [...selected.ingredients].sort();
      for (let a = 0; a < inv.length - 2; a++) {
        for (let b = a + 1; b < inv.length - 1; b++) {
          for (let c = b + 1; c < inv.length; c++) {
            const sorted = [inv[a], inv[b], inv[c]].sort();
            if (sorted[0] === rSorted[0] && sorted[1] === rSorted[1] && sorted[2] === rSorted[2]) {
              return selected;
            }
          }
        }
      }
    }
  }

  for (let a = 0; a < inv.length - 2; a++) {
    for (let b = a + 1; b < inv.length - 1; b++) {
      for (let c = b + 1; c < inv.length; c++) {
        const sorted = [inv[a], inv[b], inv[c]].sort();
        for (const recipe of ALL_RECIPES) {
          if (!gameState.unlockedRecipes.includes(recipe.id)) continue;
          const rSorted = [...recipe.ingredients].sort();
          if (sorted[0] === rSorted[0] && sorted[1] === rSorted[1] && sorted[2] === rSorted[2]) {
            return recipe;
          }
        }
      }
    }
  }
  return null;
}

/** Remove exactly the 3 ingredients used by a recipe from the inventory (decrement stack). */
export function consumeRecipeIngredients(recipe: Recipe): void {
  for (const type of recipe.ingredients) {
    const idx = gameState.inventory.findIndex(s => s.type === type);
    if (idx !== -1) {
      gameState.inventory[idx].count--;
      if (gameState.inventory[idx].count <= 0) {
        gameState.inventory.splice(idx, 1);
      }
    }
  }
}

export function getUnlockedRecipes(): Recipe[] {
  return ALL_RECIPES.filter(r => gameState.unlockedRecipes.includes(r.id));
}

/** Returns ids of all recipes that can currently be brewed from the inventory. */
export function getBrewableRecipeIds(): Set<string> {
  const inv = gameState.inventory.map(s => s.type);
  const brewable = new Set<string>();
  if (inv.length < 3) return brewable;
  for (let a = 0; a < inv.length - 2; a++) {
    for (let b = a + 1; b < inv.length - 1; b++) {
      for (let c = b + 1; c < inv.length; c++) {
        const sorted = [inv[a], inv[b], inv[c]].sort();
        for (const recipe of ALL_RECIPES) {
          if (!gameState.unlockedRecipes.includes(recipe.id)) continue;
          const rSorted = [...recipe.ingredients].sort();
          if (sorted[0] === rSorted[0] && sorted[1] === rSorted[1] && sorted[2] === rSorted[2]) {
            brewable.add(recipe.id);
          }
        }
      }
    }
  }
  return brewable;
}

export function getAllRecipesForDisplay(): (Recipe & { locked: boolean })[] {
  return ALL_RECIPES.map(r => ({
    ...r,
    locked: !gameState.unlockedRecipes.includes(r.id),
  }));
}
