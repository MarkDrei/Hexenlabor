import type {
  GameState,
  WitchState,
  CauldronState,
  NPCState,
  MiniGameState,
  WorldIngredient,
  IngredientType,
} from '@/shared/types';

let ingredientIdCounter = 0;
let messageIdCounter = 0;

export function nextIngredientId(): string {
  return `ing_${++ingredientIdCounter}`;
}

export function nextMessageId(): string {
  return `msg_${++messageIdCounter}`;
}

const INGREDIENT_TYPES: IngredientType[] = [
  'red_mushroom',
  'blue_mushroom',
  'herbs',
  'fern',
  'crystal',
  'stardust',
  'fairy_dust',
  'water',
  'magic_flower',
];

export function randomIngredientType(): IngredientType {
  return INGREDIENT_TYPES[Math.floor(Math.random() * INGREDIENT_TYPES.length)];
}

export function createInitialIngredients(
  canvasWidth: number,
  canvasHeight: number,
  count = 10
): WorldIngredient[] {
  const items: WorldIngredient[] = [];
  const groundY = canvasHeight * 0.88;

  // Fixed starting positions spread across the play area
  const positions = [
    { x: canvasWidth * 0.15, y: groundY - 20 },
    { x: canvasWidth * 0.25, y: groundY - 40 },
    { x: canvasWidth * 0.35, y: groundY - 15 },
    { x: canvasWidth * 0.55, y: groundY - 30 },
    { x: canvasWidth * 0.65, y: groundY - 20 },
    { x: canvasWidth * 0.75, y: groundY - 50 },
    { x: canvasWidth * 0.82, y: groundY - 25 },
    { x: canvasWidth * 0.18, y: groundY - 60 },
    { x: canvasWidth * 0.45, y: groundY - 45 },
    { x: canvasWidth * 0.88, y: groundY - 35 },
  ];

  const types: IngredientType[] = [
    'red_mushroom',
    'water',
    'herbs',
    'blue_mushroom',
    'fern',
    'crystal',
    'fairy_dust',
    'red_mushroom',
    'stardust',
    'magic_flower',
  ];

  for (let i = 0; i < Math.min(count, positions.length); i++) {
    items.push({
      id: nextIngredientId(),
      type: types[i] ?? randomIngredientType(),
      x: positions[i].x,
      y: positions[i].y,
      collected: false,
    });
  }
  return items;
}

export function spawnIngredient(
  canvasWidth: number,
  canvasHeight: number
): WorldIngredient {
  const groundY = canvasHeight * 0.88;
  return {
    id: nextIngredientId(),
    type: randomIngredientType(),
    x: 60 + Math.random() * (canvasWidth - 120),
    y: groundY - 10 - Math.random() * 60,
    collected: false,
  };
}

function createInitialWitch(canvasWidth: number, canvasHeight: number): WitchState {
  const x = canvasWidth / 2;
  const y = canvasHeight * 0.82;
  return {
    x,
    y,
    targetX: x,
    targetY: y,
    frameIndex: 0,
    tickCount: 0,
    facingRight: true,
    isMoving: false,
  };
}

function createInitialCauldron(): CauldronState {
  return {
    isOpen: false,
    selectedIngredients: [],
    brewing: false,
    brewingTimeLeft: 0,
    bubbles: [],
    lastBrewedPotion: null,
  };
}

function createInitialNPCs(canvasWidth: number, canvasHeight: number): NPCState[] {
  const groundY = canvasHeight * 0.85;
  return [
    {
      x: canvasWidth * 0.2,
      y: groundY,
      targetX: canvasWidth * 0.2,
      targetY: groundY,
      frameIndex: 0,
      tickCount: 0,
      facingRight: true,
      type: 'cat',
      isCarryingIngredient: false,
      carryIngredient: null,
      deliveredIngredient: false,
      wanderTimer: 120,
      speechBubble: '',
      speechTimer: 0,
    },
    {
      x: canvasWidth * 0.8,
      y: groundY,
      targetX: canvasWidth * 0.8,
      targetY: groundY,
      frameIndex: 0,
      tickCount: 0,
      facingRight: false,
      type: 'monster',
      isCarryingIngredient: false,
      carryIngredient: null,
      deliveredIngredient: false,
      wanderTimer: 180,
      speechBubble: '',
      speechTimer: 0,
    },
  ];
}

function createInitialMiniGame(): MiniGameState {
  return {
    type: null,
    timeLeft: 0,
    butterflies: [],
    fallingStars: [],
    memoryCards: [],
    flippedCards: [],
    lastFlipTime: 0,
    score: 0,
  };
}

export function createInitialState(
  canvasWidth: number,
  canvasHeight: number
): GameState {
  return {
    witch: createInitialWitch(canvasWidth, canvasHeight),
    inventory: {},
    potions: {},
    worldIngredients: createInitialIngredients(canvasWidth, canvasHeight),
    cauldron: createInitialCauldron(),
    npcs: createInitialNPCs(canvasWidth, canvasHeight),
    miniGame: createInitialMiniGame(),
    activeEffects: [],
    messages: [],
    score: 0,
    day: 1,
    timeOfDay: 0.3, // start in morning
    spawnTimer: 15000,
    eventTimer: 30000,
    isNight: false,
    rainTimer: 0,
    gnomeActive: false,
    gnomeX: 0,
    gnomeY: 0,
    gnomeSpeech: '',
    gnomeTimer: 0,
    gnomeIngredient: null,
    rainbowActive: false,
    rainbowTimer: 0,
    canvasWidth,
    canvasHeight,
  };
}
