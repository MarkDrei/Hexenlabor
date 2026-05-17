/** Fields persisted across page reloads (player progression only). */
export interface PersistedProgress {
  stars: number;
  score: number;
  level: number;
  unlockedRecipes: string[];
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
      typeof parsed.level === 'number' &&
      Array.isArray(parsed.unlockedRecipes) &&
      parsed.unlockedRecipes.every((r) => typeof r === 'string')
    ) {
      return {
        stars: parsed.stars,
        score: parsed.score,
        level: parsed.level,
        unlockedRecipes: parsed.unlockedRecipes as string[],
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
