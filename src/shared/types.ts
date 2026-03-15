export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type IngredientType =
  | 'mushroom_red'
  | 'mushroom_blue'
  | 'crystal'
  | 'herb'
  | 'water_drop'
  | 'star'
  | 'flower'
  | 'key'
  | 'scroll';

export type PotionType =
  | 'speed_potion'
  | 'glow_potion'
  | 'rain_potion'
  | 'growth_potion'
  | 'magic_bomb'
  | 'sleep_potion';

export type ItemType = IngredientType | PotionType;

export interface IngredientDef {
  type: IngredientType;
  name: string;
  color: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
  nightOnly?: boolean;
  emoji: string;
}

export interface PotionDef {
  type: PotionType;
  name: string;
  color: string;
  description: string;
  recipe: IngredientType[];
  effectDuration?: number;
  emoji: string;
}

export interface InventoryItem {
  type: ItemType;
  quantity: number;
}

export interface WorldIngredient {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
  collected: boolean;
}

export interface NPC {
  id: string;
  type: 'cat' | 'monster';
  x: number;
  y: number;
  vx: number;
  frame: number;
  animTick: number;
  state: 'wandering' | 'idle' | 'talking';
  idleTimer: number;
  direction: 'left' | 'right';
  interactCooldown: number;
}

export type ActiveEffectType =
  | 'speed'
  | 'glow'
  | 'rain'
  | 'growth'
  | 'sleep'
  | 'double_score';

export interface ActiveEffect {
  type: ActiveEffectType;
  endTime: number;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

export interface MiniGameState {
  type: 'ingredient_rush';
  startTime: number;
  duration: number;
  score: number;
  targetIds: string[];
  collectedIds: string[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'event';
  timestamp: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export interface TreasureChest {
  id: string;
  x: number;
  y: number;
  opened: boolean;
}

export interface RainDrop {
  x: number;
  y: number;
  vy: number;
  length: number;
}

export type InteractionTarget =
  | { kind: 'cauldron' }
  | { kind: 'well' }
  | { kind: 'npc'; npcId: string }
  | { kind: 'chest'; chestId: string };

export interface GameState {
  gameTime: number;
  isNight: boolean;
  dayProgress: number;

  weather: WeatherType;
  weatherTimer: number;

  witchX: number;
  witchY: number;
  witchTargetX: number;
  witchTargetY: number;
  witchFacing: 'left' | 'right';
  witchState: 'idle' | 'walking' | 'interacting';
  witchFrame: number;
  witchAnimTick: number;
  witchSpeed: number;
  pendingInteraction: InteractionTarget | null;

  npcs: NPC[];

  worldIngredients: WorldIngredient[];
  ingredientSpawnTimer: number;

  wellCooldown: number;
  wellGlowing: boolean;
  cauldronGlowing: boolean;

  isBrewing: boolean;
  brewProgress: number;
  brewingPotionType: PotionType | null;

  inventory: InventoryItem[];
  selectedBrewIngredients: IngredientType[];
  showCraftingMenu: boolean;

  activeEffects: ActiveEffect[];
  particles: Particle[];
  rainDrops: RainDrop[];

  miniGame: MiniGameState | null;

  notifications: Notification[];

  score: number;
  potionsBrewed: number;
  ingredientsCollected: number;

  eventTimer: number;
  treasureChests: TreasureChest[];
  fairyActive: boolean;
  fairyTimer: number;
}
