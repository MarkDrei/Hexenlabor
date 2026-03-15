// All game type definitions for Das funkelnde Hexenlabor

export type IngredientType =
  | 'redMushroom'
  | 'blueMushroom'
  | 'crystal'
  | 'herb'
  | 'starDust'
  | 'essence';

export interface IngredientInstance {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
  collected: boolean;
  bobPhase: number;
  scale: number; // >1 when growth potion is active
}

export type IngredientMap = Partial<Record<IngredientType, number>>;

export type PotionType = 'speed' | 'growth' | 'star' | 'crystal' | 'friendship' | 'rainbow';

export interface PotionRecipe {
  id: PotionType;
  name: string;
  ingredients: IngredientMap;
  color: string;
  description: string;
  duration: number; // ms
}

export interface ActiveEffect {
  type: PotionType;
  remaining: number; // ms
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0–1, 1 = just born
  maxLife: number; // ms
  color: string;
  size: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number; // ms remaining
  color: string;
  size: number;
}

export interface FallingIngredient {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
  vy: number;
  spin: number;
  collected: boolean;
}

export interface Firefly {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  caught: boolean;
}

export type EventType =
  | 'ingredientRain'
  | 'fireflyDance'
  | 'catGift'
  | 'monsterSurprise'
  | 'magicGarden';

export interface GameEvent {
  type: EventType;
  timer: number;   // ms remaining
  duration: number; // ms total
  fallingIngredients?: FallingIngredient[];
  fireflies?: Firefly[];
  giftIngredient?: IngredientType;
  completed: boolean;
}

export interface NPC {
  x: number;
  y: number;
  vx: number;
  frameIndex: number;
  tickCount: number;
  giftCooldown: number;   // ms
  greeting: string | null;
  greetingTimer: number;  // ms
}

export interface WitchState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facingRight: boolean;
  frameIndex: number;
  tickCount: number;
  speed: number;
}

export interface CauldronState {
  x: number;
  y: number;
  bubblePhase: number;
  liquidColor: string;
  brewing: boolean;
  brewTimer: number;
}

export interface GameState {
  time: number; // ms, total elapsed
  witch: WitchState;
  cat: NPC;
  monster: NPC;
  cauldron: CauldronState;
  ingredients: IngredientInstance[];
  inventory: IngredientMap;
  potions: PotionType[];       // potions ready to use
  activePotions: ActiveEffect[];
  score: number;
  activeEvent: GameEvent | null;
  particles: Particle[];
  floatingTexts: FloatingText[];
  spawnTimer: number;  // ms until next ingredient spawn
  eventTimer: number;  // ms until next random event
  isNearCauldron: boolean;
  showBrewingUI: boolean;
  selectedForBrew: IngredientMap;
  message: { text: string; timer: number } | null; // heads-up message
  magicGardenActive: boolean;
  magicGardenTimer: number; // ms remaining
}
