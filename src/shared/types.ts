// Shared types for Das funkelnde Hexenlabor

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Game Types ──────────────────────────────────────────────────────────────

export type Floor = 'ground' | 'middle' | 'top';

export enum IngredientType {
  Hexenkraut  = 'hexenkraut',
  Zauberbeerle = 'zauberbeerle',
  Fliegenpilz = 'fliegenpilz',
  Mondkristall = 'mondkristall',
  Mondstein   = 'mondstein',
  Kerze       = 'kerze',
  Stern       = 'stern',
  Schmetterling = 'schmetterling',
}

export const INGREDIENT_EMOJI: Record<IngredientType, string> = {
  [IngredientType.Hexenkraut]:    '🌿',
  [IngredientType.Zauberbeerle]:  '🫐',
  [IngredientType.Fliegenpilz]:   '🍄',
  [IngredientType.Mondkristall]:  '💎',
  [IngredientType.Mondstein]:     '🌙',
  [IngredientType.Kerze]:         '🕯️',
  [IngredientType.Stern]:         '⭐',
  [IngredientType.Schmetterling]: '🦋',
};

export const INGREDIENT_GLOW_COLOR: Record<IngredientType, string> = {
  [IngredientType.Hexenkraut]:    '#22c55e',
  [IngredientType.Zauberbeerle]:  '#6366f1',
  [IngredientType.Fliegenpilz]:   '#ef4444',
  [IngredientType.Mondkristall]:  '#06b6d4',
  [IngredientType.Mondstein]:     '#a78bfa',
  [IngredientType.Kerze]:         '#f59e0b',
  [IngredientType.Stern]:         '#facc15',
  [IngredientType.Schmetterling]: '#ec4899',
};

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface IngredientDef {
  type: IngredientType;
  floors: Floor[];
  rarity: Rarity;
}

export interface Ingredient {
  id: number;
  type: IngredientType;
  position: Position;
  floor: Floor;
  glowPhase: number;
  spawnTime: number;
  opacity: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  ingredients: [IngredientType, IngredientType, IngredientType];
  rewardStars: number;
  unlockLevel: number;
}

export type Requester = 'cat' | 'monster' | 'visitor';

export interface Order {
  id: number;
  requester: Requester;
  recipe: Recipe;
  spawnedAt: number;
}

export type GamePhase =
  | 'exploring'
  | 'brewing'
  | 'celebrating'
  | 'confirmingExit'
  | 'minigame';

export interface BrewingState {
  bubbleIndex: number;
  bubbleTimer: number;
  bubbleActive: boolean;
  hits: number;
  totalBubbles: number;
  recipeId: string;
}

export interface CollectAnimation {
  emoji: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
}

export interface GameState {
  score: number;
  stars: number;
  level: number;
  inventory: { type: IngredientType; count: number }[];
  brewedPotion: Recipe | null;
  selectedRecipe: Recipe | null;
  activeOrders: Order[];
  ingredients: Ingredient[];
  phase: GamePhase;
  brewingState: BrewingState | null;
  unlockedRecipes: string[];
  collectAnimations: CollectAnimation[];
  showRecipeBook: boolean;
  celebrateTimer: number;
}

export interface HutBounds {
  hutX: number;
  hutY: number;
  hutW: number;
  hutH: number;
  yOffset: number;
}
