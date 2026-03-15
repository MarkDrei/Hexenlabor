export interface Position { x: number; y: number; }
export interface Size { width: number; height: number; }

export type IngredientType =
  | 'red_mushroom'
  | 'blue_mushroom'
  | 'herbs'
  | 'fern'
  | 'crystal'
  | 'stardust'
  | 'fairy_dust'
  | 'water'
  | 'magic_flower';

export type PotionType =
  | 'speed_potion'
  | 'night_potion'
  | 'grow_potion'
  | 'luck_potion'
  | 'friendship_potion'
  | 'flying_potion'
  | 'rainbow_potion'
  | 'invisibility_potion';

export interface WorldIngredient {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
  collected: boolean;
}

export interface Butterfly {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  caught: boolean;
  phase: number;
}

export interface FallingStar {
  id: string;
  x: number;
  y: number;
  vy: number;
  caught: boolean;
  trail: Array<{ x: number; y: number }>;
}

export interface Message {
  id: string;
  text: string;
  x: number;
  y: number;
  timeLeft: number;
  color: string;
}

export interface ActiveEffect {
  type: PotionType;
  timeLeft: number;
}

export interface Recipe {
  potion: PotionType;
  ingredients: IngredientType[];
  name: string;
  description: string;
}

export interface MemoryCard {
  id: string;
  ingredient: IngredientType;
  pairId: number;
  flipped: boolean;
  matched: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniGameState {
  type: 'butterfly' | 'stars' | 'memory' | null;
  timeLeft: number;
  butterflies: Butterfly[];
  fallingStars: FallingStar[];
  memoryCards: MemoryCard[];
  flippedCards: string[];
  lastFlipTime: number;
  score: number;
}

export interface CauldronBubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  alpha: number;
}

export interface CauldronState {
  isOpen: boolean;
  selectedIngredients: IngredientType[];
  brewing: boolean;
  brewingTimeLeft: number;
  bubbles: CauldronBubble[];
  lastBrewedPotion: PotionType | null;
}

export interface NPCState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  frameIndex: number;
  tickCount: number;
  facingRight: boolean;
  type: 'cat' | 'monster';
  isCarryingIngredient: boolean;
  carryIngredient: IngredientType | null;
  deliveredIngredient: boolean;
  wanderTimer: number;
  speechBubble: string;
  speechTimer: number;
}

export interface WitchState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  frameIndex: number;
  tickCount: number;
  facingRight: boolean;
  isMoving: boolean;
}

export interface GameState {
  witch: WitchState;
  inventory: Partial<Record<IngredientType, number>>;
  potions: Partial<Record<PotionType, number>>;
  worldIngredients: WorldIngredient[];
  cauldron: CauldronState;
  npcs: NPCState[];
  miniGame: MiniGameState;
  activeEffects: ActiveEffect[];
  messages: Message[];
  score: number;
  day: number;
  timeOfDay: number;
  spawnTimer: number;
  eventTimer: number;
  isNight: boolean;
  rainTimer: number;
  gnomeActive: boolean;
  gnomeX: number;
  gnomeY: number;
  gnomeSpeech: string;
  gnomeTimer: number;
  gnomeIngredient: IngredientType | null;
  rainbowActive: boolean;
  rainbowTimer: number;
  canvasWidth: number;
  canvasHeight: number;
}
