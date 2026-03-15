import type {
  GameState,
  IngredientType,
  ItemType,
  IngredientDef,
  PotionDef,
  WorldIngredient,
  NPC,
} from '@/shared/types';

// ── Timing ────────────────────────────────────────────────────────────────────
export const DAY_DURATION = 60_000; // ms per full day/night cycle
export const INGREDIENT_SPAWN_INTERVAL = 4_500; // ms between spawns
export const MAX_WORLD_INGREDIENTS = 12;

// ── Interaction distances ─────────────────────────────────────────────────────
export const INTERACT_DISTANCE = 90; // px – show prompt
export const COLLECT_DISTANCE = 48;  // px – auto-collect ingredient

// ── World-object positions (relative fractions of canvas size) ────────────────
export const CAULDRON_REL = { x: 0.5 - 0.017, y: 0.5 + 0.115 }; // cx-20, cy+80
export const WELL_REL = { x: 0.5 + 0.1, y: 0.5 };               // cx+120, cy
export const HOUSE_REL = { x: 0.5 - 0.1, y: 0.5 + 0.029 };      // cx-120, cy+20

// ── Ingredient definitions ────────────────────────────────────────────────────
export const INGREDIENT_DEFS: Record<IngredientType, IngredientDef> = {
  mushroom_red: {
    type: 'mushroom_red', name: 'Red Mushroom', color: '#ef4444',
    description: 'Common in the forest', rarity: 'common', emoji: '🍄',
  },
  mushroom_blue: {
    type: 'mushroom_blue', name: 'Blue Mushroom', color: '#3b82f6',
    description: 'Found in shady spots', rarity: 'common', emoji: '🔵',
  },
  crystal: {
    type: 'crystal', name: 'Crystal', color: '#06b6d4',
    description: 'Sparkles near rocks', rarity: 'uncommon', emoji: '💎',
  },
  herb: {
    type: 'herb', name: 'Magic Herb', color: '#22c55e',
    description: 'Grows near bushes', rarity: 'common', emoji: '🌿',
  },
  water_drop: {
    type: 'water_drop', name: 'Water Drop', color: '#60a5fa',
    description: 'Collected from the well', rarity: 'common', emoji: '💧',
  },
  star: {
    type: 'star', name: 'Star Dust', color: '#fbbf24',
    description: 'Only appears at night', rarity: 'uncommon', nightOnly: true, emoji: '⭐',
  },
  flower: {
    type: 'flower', name: 'Magic Flower', color: '#ec4899',
    description: 'Blooms in meadows', rarity: 'common', emoji: '🌸',
  },
  key: {
    type: 'key', name: 'Ancient Key', color: '#d97706',
    description: 'Rare – dropped by the monster', rarity: 'rare', emoji: '🗝️',
  },
  scroll: {
    type: 'scroll', name: 'Magic Scroll', color: '#a78bfa',
    description: 'Given by the friendly cat', rarity: 'rare', emoji: '📜',
  },
};

// ── Potion recipes ────────────────────────────────────────────────────────────
export const POTION_RECIPES: PotionDef[] = [
  {
    type: 'speed_potion', name: 'Speed Potion', color: '#f97316', emoji: '⚡',
    description: 'Move twice as fast for 30 s',
    recipe: ['mushroom_red', 'mushroom_blue'], effectDuration: 30_000,
  },
  {
    type: 'glow_potion', name: 'Glow Potion', color: '#fbbf24', emoji: '✨',
    description: 'All ingredients glow for 30 s',
    recipe: ['crystal', 'star'], effectDuration: 30_000,
  },
  {
    type: 'rain_potion', name: 'Rain Potion', color: '#60a5fa', emoji: '🌧️',
    description: 'Summons rain – water drops appear more often',
    recipe: ['herb', 'water_drop'], effectDuration: 45_000,
  },
  {
    type: 'growth_potion', name: 'Growth Potion', color: '#4ade80', emoji: '🌱',
    description: 'Ingredients sprout 3× faster for 30 s',
    recipe: ['flower', 'herb'], effectDuration: 30_000,
  },
  {
    type: 'magic_bomb', name: 'Magic Bomb', color: '#c084fc', emoji: '💥',
    description: 'Triggers an Ingredient Rush mini-game!',
    recipe: ['crystal', 'mushroom_red', 'star'],
  },
  {
    type: 'sleep_potion', name: 'Sleep Potion', color: '#818cf8', emoji: '😴',
    description: 'NPCs fall asleep and drop their items',
    recipe: ['star', 'flower'], effectDuration: 15_000,
  },
];

// ── Spawn zones (xMin..xMax, yMin..yMax as canvas fractions) ─────────────────
const SPAWN_ZONES = [
  { x0: 0.05, x1: 0.35, y0: 0.55, y1: 0.88 }, // left  (near house)
  { x0: 0.35, x1: 0.65, y0: 0.62, y1: 0.88 }, // center meadow
  { x0: 0.60, x1: 0.95, y0: 0.55, y1: 0.88 }, // right (near well)
];

const COMMON_POOL: IngredientType[] = [
  'mushroom_red', 'mushroom_red', 'mushroom_blue', 'mushroom_blue',
  'herb', 'herb', 'flower', 'flower', 'crystal',
];
const NIGHT_POOL: IngredientType[] = ['star', 'star', 'crystal', 'mushroom_blue'];

// ── Pure helper functions ─────────────────────────────────────────────────────

export function addToInventory(
  inventory: GameState['inventory'],
  type: ItemType,
): GameState['inventory'] {
  const existing = inventory.find(i => i.type === type);
  if (existing) {
    return inventory.map(i => i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...inventory, { type, quantity: 1 }];
}

export function removeFromInventory(
  inventory: GameState['inventory'],
  type: ItemType,
  amount = 1,
): GameState['inventory'] {
  return inventory.reduce<GameState['inventory']>((acc, i) => {
    if (i.type !== type) { acc.push(i); return acc; }
    const newQty = i.quantity - amount;
    if (newQty > 0) acc.push({ ...i, quantity: newQty });
    return acc;
  }, []);
}

export function hasIngredients(
  inventory: GameState['inventory'],
  recipe: IngredientType[],
): boolean {
  const counts: Partial<Record<IngredientType, number>> = {};
  for (const t of recipe) counts[t] = (counts[t] ?? 0) + 1;
  for (const [type, need] of Object.entries(counts) as [IngredientType, number][]) {
    const have = inventory.find(i => i.type === type)?.quantity ?? 0;
    if (have < need) return false;
  }
  return true;
}

export function spawnIngredient(
  state: Pick<GameState, 'worldIngredients' | 'activeEffects' | 'gameTime'>,
  canvasW: number,
  canvasH: number,
  isNight: boolean,
): WorldIngredient | null {
  const active = state.worldIngredients.filter(i => !i.collected).length;
  if (active >= MAX_WORLD_INGREDIENTS) return null;

  const isRain = state.activeEffects.some(e => e.type === 'rain' && e.endTime > state.gameTime);
  let type: IngredientType;
  if (isRain && Math.random() < 0.5) {
    type = 'water_drop';
  } else {
    const pool = isNight ? NIGHT_POOL : COMMON_POOL;
    type = pool[Math.floor(Math.random() * pool.length)];
  }
  if (!isNight && INGREDIENT_DEFS[type].nightOnly) return null;

  const zone = SPAWN_ZONES[Math.floor(Math.random() * SPAWN_ZONES.length)];
  return {
    id: `ing_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    x: (zone.x0 + Math.random() * (zone.x1 - zone.x0)) * canvasW,
    y: (zone.y0 + Math.random() * (zone.y1 - zone.y0)) * canvasH,
    collected: false,
  };
}

export function createInitialNPCs(canvasW: number, canvasH: number): NPC[] {
  return [
    {
      id: 'cat', type: 'cat',
      x: canvasW * 0.25, y: canvasH * 0.76,
      vx: 1.4, frame: 0, animTick: 0,
      state: 'wandering', idleTimer: 0, direction: 'right', interactCooldown: 0,
    },
    {
      id: 'monster', type: 'monster',
      x: canvasW * 0.78, y: canvasH * 0.71,
      vx: -1.6, frame: 0, animTick: 0,
      state: 'wandering', idleTimer: 0, direction: 'left', interactCooldown: 0,
    },
  ];
}

export function createInitialState(canvasW: number, canvasH: number): GameState {
  return {
    gameTime: 0,
    isNight: false,
    dayProgress: 0,
    weather: 'sunny',
    weatherTimer: 45_000,
    witchX: canvasW / 2,
    witchY: canvasH * 0.72,
    witchTargetX: canvasW / 2,
    witchTargetY: canvasH * 0.72,
    witchFacing: 'right',
    witchState: 'idle',
    witchFrame: 0,
    witchAnimTick: 0,
    witchSpeed: 4,
    pendingInteraction: null,
    npcs: createInitialNPCs(canvasW, canvasH),
    worldIngredients: [],
    ingredientSpawnTimer: 1_000,
    wellCooldown: 0,
    wellGlowing: false,
    cauldronGlowing: false,
    isBrewing: false,
    brewProgress: 0,
    brewingPotionType: null,
    inventory: [],
    selectedBrewIngredients: [],
    showCraftingMenu: false,
    activeEffects: [],
    particles: [],
    rainDrops: [],
    miniGame: null,
    notifications: [],
    score: 0,
    potionsBrewed: 0,
    ingredientsCollected: 0,
    eventTimer: 30_000,
    treasureChests: [],
    fairyActive: false,
    fairyTimer: 0,
  };
}
