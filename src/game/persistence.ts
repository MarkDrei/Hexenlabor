import { IngredientType } from '@/shared/types';

/** Fields persisted across page reloads. Only raw data is stored — derived fields
 *  (level, unlockedRecipes) are computed from stars on load, not stored. */
export interface PersistedProgress {
  stars: number;
  score: number;
  inventory: { type: IngredientType; count: number }[];
}

const STORAGE_KEY = 'hexenlabor_progress';

/** Save progress to localStorage. No-ops in environments without localStorage. */
export function saveProgress(progress: PersistedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore write failures (private browsing, storage full, SSR, etc.)
  }
}

/** Load persisted progress. Returns null when nothing is saved or parsing fails. */
export function loadProgress(): PersistedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    if (
      typeof parsed.stars === 'number' &&
      typeof parsed.score === 'number' &&
      Array.isArray(parsed.inventory) &&
      parsed.inventory.every(
        (s) => typeof s === 'object' && s !== null && typeof s.type === 'string' && typeof s.count === 'number',
      )
    ) {
      return {
        stars: parsed.stars,
        score: parsed.score,
        inventory: parsed.inventory as { type: IngredientType; count: number }[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove persisted progress (used when the player resets). */
export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
