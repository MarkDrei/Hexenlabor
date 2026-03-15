// Pure game-logic update functions (no canvas/DOM dependencies)

import type {
  GameState,
  IngredientInstance,
  IngredientType,
  PotionType,
  Particle,
  FloatingText,
  FallingIngredient,
  Firefly,
  GameEvent,
  NPC,
} from './types';
import {
  INGREDIENT_DEFS,
  POTION_RECIPES,
  SPAWN_WEIGHTS,
  CAULDRON_RANGE,
  INGREDIENT_COLLECT_RANGE,
  SPAWN_INTERVAL_BASE,
  EVENT_INTERVAL,
  MAX_INGREDIENTS_ON_MAP,
  NPC_GIFT_COOLDOWN,
  RAINBOW_CAULDRON_COLOR,
} from './constants';

let _idCounter = 0;
function uid(): string {
  return `id_${++_idCounter}`;
}

// ─── Initialisation ─────────────────────────────────────────────────────────

export function createInitialState(canvasW: number, canvasH: number): GameState {
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  return {
    time: 0,
    witch: {
      x: cx,
      y: canvasH * 0.75,
      targetX: cx,
      targetY: canvasH * 0.75,
      facingRight: true,
      frameIndex: 0,
      tickCount: 0,
      speed: 3,
    },
    cat: {
      x: canvasW * 0.2,
      y: canvasH * 0.78,
      vx: 1.2,
      frameIndex: 0,
      tickCount: 0,
      giftCooldown: NPC_GIFT_COOLDOWN * 0.5,
      greeting: null,
      greetingTimer: 0,
    },
    monster: {
      x: canvasW * 0.8,
      y: canvasH * 0.82,
      vx: -1,
      frameIndex: 0,
      tickCount: 0,
      giftCooldown: NPC_GIFT_COOLDOWN * 0.7,
      greeting: null,
      greetingTimer: 0,
    },
    cauldron: {
      x: canvasW * 0.5,
      y: canvasH * 0.72,
      bubblePhase: 0,
      liquidColor: '#1d4ed8',
      brewing: false,
      brewTimer: 0,
    },
    ingredients: [],
    inventory: {},
    potions: [],
    activePotions: [],
    score: 0,
    activeEvent: null,
    particles: [],
    floatingTexts: [],
    spawnTimer: 1000,
    eventTimer: EVENT_INTERVAL,
    isNearCauldron: false,
    showBrewingUI: false,
    selectedForBrew: {},
    message: null,
    magicGardenActive: false,
    magicGardenTimer: 0,
  };
}

// ─── Ingredient Spawning ─────────────────────────────────────────────────────

export function spawnIngredient(
  canvasW: number,
  canvasH: number,
  isCrystalActive: boolean,
): IngredientInstance {
  const margin = 80;
  const x = margin + Math.random() * (canvasW - margin * 2);
  // spawn in the "field" area (50%-88% of height)
  const y = canvasH * 0.5 + Math.random() * canvasH * 0.38;

  let pool = [...SPAWN_WEIGHTS];
  if (isCrystalActive) {
    // double chance of essence when Crystal Brew is active
    pool.push('essence', 'essence', 'essence');
  }

  const type = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: uid(),
    type,
    x,
    y,
    collected: false,
    bobPhase: Math.random() * Math.PI * 2,
    scale: 1,
  };
}

// ─── Particle Helpers ────────────────────────────────────────────────────────

export function spawnParticles(
  state: GameState,
  x: number,
  y: number,
  color: string,
  count: number,
  speedMult = 1,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = (1.5 + Math.random() * 2) * speedMult;
    state.particles.push({
      id: uid(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      maxLife: 600 + Math.random() * 400,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

export function addFloatingText(
  state: GameState,
  text: string,
  x: number,
  y: number,
  color = '#facc15',
  size = 18,
): void {
  state.floatingTexts.push({
    id: uid(),
    text,
    x,
    y,
    vy: -1.2,
    life: 1800,
    color,
    size,
  });
}

export function showMessage(state: GameState, text: string): void {
  state.message = { text, timer: 3000 };
}

// ─── Witch Update ────────────────────────────────────────────────────────────

export function updateWitch(state: GameState, dt: number): void {
  const { witch, activePotions, cauldron } = state;
  const speedBoost = activePotions.some((p) => p.type === 'speed') ? 2.2 : 1;
  const effectiveSpeed = witch.speed * speedBoost;

  const dx = witch.targetX - witch.x;
  const dy = witch.targetY - witch.y;
  const dist = Math.hypot(dx, dy);
  const isMoving = dist > effectiveSpeed;

  if (isMoving) {
    witch.x += (dx / dist) * effectiveSpeed;
    witch.y += (dy / dist) * effectiveSpeed;
    if (dx > 0.5) witch.facingRight = true;
    else if (dx < -0.5) witch.facingRight = false;
    witch.tickCount++;
    if (witch.tickCount > 8) {
      witch.tickCount = 0;
      witch.frameIndex = (witch.frameIndex + 1) % 5;
    }
  } else {
    witch.frameIndex = 0;
    witch.tickCount = 0;
  }

  // cauldron proximity
  const dCauldron = Math.hypot(witch.x - cauldron.x, witch.y - cauldron.y);
  state.isNearCauldron = dCauldron <= CAULDRON_RANGE;
}

// ─── NPC Update ─────────────────────────────────────────────────────────────

function updateNPC(
  npc: NPC,
  dt: number,
  canvasW: number,
  canvasH: number,
  isFriendshipActive: boolean,
  label: 'cat' | 'monster',
  state: GameState,
): void {
  const yBase = label === 'cat' ? canvasH * 0.78 : canvasH * 0.82;
  const baseSpeed = label === 'cat' ? 1.3 : 0.9;
  const speed = isFriendshipActive ? baseSpeed * 1.5 : baseSpeed;

  npc.x += npc.vx * speed;
  if (npc.x > canvasW + 100) npc.x = -100;
  if (npc.x < -100) npc.x = canvasW + 100;
  npc.y = yBase;

  // Animate walking frames
  npc.tickCount++;
  if (npc.tickCount > 10) {
    npc.tickCount = 0;
    npc.frameIndex = (npc.frameIndex + 1) % 5;
  }

  // Greeting timer
  if (npc.greetingTimer > 0) {
    npc.greetingTimer -= dt;
    if (npc.greetingTimer <= 0) npc.greeting = null;
  }

  // Gift logic
  npc.giftCooldown -= dt;
  if (npc.giftCooldown <= 0) {
    npc.giftCooldown = isFriendshipActive ? NPC_GIFT_COOLDOWN * 0.4 : NPC_GIFT_COOLDOWN;
    // Give a random ingredient
    const commonTypes: IngredientType[] = ['redMushroom', 'herb', 'blueMushroom', 'crystal'];
    const giftType = commonTypes[Math.floor(Math.random() * commonTypes.length)];
    state.inventory[giftType] = (state.inventory[giftType] ?? 0) + 1;
    state.score += INGREDIENT_DEFS[giftType].scoreValue;
    const names = { cat: '🐱 Cat', monster: '🦕 Monster' };
    npc.greeting = `Here's a ${INGREDIENT_DEFS[giftType].name} for you! 🎁`;
    npc.greetingTimer = 2500;
    addFloatingText(
      state,
      `${names[label]}: ${INGREDIENT_DEFS[giftType].name}!`,
      npc.x,
      npc.y - 60,
      '#facc15',
      16,
    );
    spawnParticles(state, npc.x, npc.y, INGREDIENT_DEFS[giftType].glowColor, 8);
  }
}

export function updateNPCs(
  state: GameState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  const isFriendshipActive = state.activePotions.some((p) => p.type === 'friendship');
  updateNPC(state.cat, dt, canvasW, canvasH, isFriendshipActive, 'cat', state);
  updateNPC(state.monster, dt, canvasW, canvasH, isFriendshipActive, 'monster', state);
}

// ─── Ingredient Collection ───────────────────────────────────────────────────

export function checkIngredientCollection(state: GameState): void {
  const { witch, ingredients } = state;
  const isGrowthActive = state.activePotions.some((p) => p.type === 'growth');

  for (const ing of ingredients) {
    if (ing.collected) continue;
    const dist = Math.hypot(witch.x - ing.x, witch.y - ing.y);
    const range = isGrowthActive ? INGREDIENT_COLLECT_RANGE * 1.5 : INGREDIENT_COLLECT_RANGE;
    if (dist <= range) {
      ing.collected = true;
      const def = INGREDIENT_DEFS[ing.type];
      state.inventory[ing.type] = (state.inventory[ing.type] ?? 0) + 1;
      state.score += def.scoreValue;
      spawnParticles(state, ing.x, ing.y, def.glowColor, 12);
      addFloatingText(state, `+${def.name}!`, ing.x, ing.y - 20, def.color);
    }
  }
  // Remove collected after a tick
  state.ingredients = state.ingredients.filter((i) => !i.collected);
}

// ─── Cauldron Update ─────────────────────────────────────────────────────────

export function updateCauldron(state: GameState, dt: number): void {
  const c = state.cauldron;
  c.bubblePhase += dt * 0.003;
  if (c.brewing) {
    c.brewTimer -= dt;
    if (c.brewTimer <= 0) {
      c.brewing = false;
    }
  }
}

// ─── Brewing ─────────────────────────────────────────────────────────────────

export function canBrewRecipe(
  inventory: GameState['inventory'],
  selected: GameState['selectedForBrew'],
  potionId: PotionType,
): boolean {
  const recipe = POTION_RECIPES.find((r) => r.id === potionId);
  if (!recipe) return false;
  for (const [ing, needed] of Object.entries(recipe.ingredients) as [IngredientType, number][]) {
    const have = inventory[ing] ?? 0;
    const sel = selected[ing] ?? 0;
    if (have < needed || sel < needed) return false;
  }
  return true;
}

export function brewPotion(state: GameState, potionId: PotionType): string {
  const recipe = POTION_RECIPES.find((r) => r.id === potionId);
  if (!recipe) return 'Unknown recipe!';

  // Consume ingredients
  for (const [ing, needed] of Object.entries(recipe.ingredients) as [IngredientType, number][]) {
    state.inventory[ing] = Math.max(0, (state.inventory[ing] ?? 0) - needed);
  }

  state.potions.push(potionId);
  state.cauldron.brewing = true;
  state.cauldron.brewTimer = 1200;
  state.cauldron.liquidColor = recipe.color === 'rainbow' ? RAINBOW_CAULDRON_COLOR : recipe.color;
  state.score += 100;

  spawnParticles(state, state.cauldron.x, state.cauldron.y, recipe.color, 20, 1.5);
  addFloatingText(state, `✨ ${recipe.name} brewed! ✨`, state.cauldron.x, state.cauldron.y - 60, recipe.color, 20);

  // Clear selection
  state.selectedForBrew = {};
  state.showBrewingUI = false;

  return recipe.description;
}

// ─── Potion Use ───────────────────────────────────────────────────────────────

export function usePotion(
  state: GameState,
  potionType: PotionType,
  canvasW: number,
  canvasH: number,
): void {
  const recipe = POTION_RECIPES.find((r) => r.id === potionType);
  if (!recipe) return;
  const idx = state.potions.indexOf(potionType);
  if (idx === -1) return;
  state.potions.splice(idx, 1);

  // Remove existing effect of same type first
  state.activePotions = state.activePotions.filter((p) => p.type !== potionType);
  state.activePotions.push({ type: potionType, remaining: recipe.duration });

  // Special immediate effects
  switch (potionType) {
    case 'star': {
      // Trigger ingredient rain with mostly starDust
      state.activeEvent = {
        type: 'ingredientRain',
        timer: 10000,
        duration: 10000,
        fallingIngredients: createFallingIngredients(canvasW, 18, 'starDust'),
        completed: false,
      };
      break;
    }
    case 'rainbow': {
      // Epic event: both rain and fireflies
      state.activeEvent = {
        type: 'ingredientRain',
        timer: 20000,
        duration: 20000,
        fallingIngredients: createFallingIngredients(canvasW, 30, null),
        fireflies: createFireflies(canvasW, canvasH, 20),
        completed: false,
      };
      state.score += 200;
      break;
    }
    case 'growth': {
      // Scale up ingredients currently on map
      for (const ing of state.ingredients) {
        ing.scale = 1.8;
      }
      break;
    }
    case 'crystal': {
      // Spawn a burst of essence
      for (let i = 0; i < 4; i++) {
        state.ingredients.push(spawnIngredient(canvasW, canvasH, true));
      }
      break;
    }
    default:
      break;
  }

  showMessage(state, recipe.description);
  spawnParticles(state, state.witch.x, state.witch.y, recipe.color, 16);
}

// ─── Events ──────────────────────────────────────────────────────────────────

function createFallingIngredients(
  canvasW: number,
  count: number,
  forceType: IngredientType | null,
): FallingIngredient[] {
  const result: FallingIngredient[] = [];
  for (let i = 0; i < count; i++) {
    const type = forceType ?? SPAWN_WEIGHTS[Math.floor(Math.random() * SPAWN_WEIGHTS.length)];
    result.push({
      id: uid(),
      type,
      x: 50 + Math.random() * (canvasW - 100),
      y: -30 - Math.random() * 200,
      vy: 1.5 + Math.random() * 1.5,
      spin: (Math.random() - 0.5) * 0.05,
      collected: false,
    });
  }
  return result;
}

function createFireflies(canvasW: number, canvasH: number, count: number): Firefly[] {
  const result: Firefly[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: uid(),
      x: 60 + Math.random() * (canvasW - 120),
      y: canvasH * 0.3 + Math.random() * canvasH * 0.45,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2,
      caught: false,
    });
  }
  return result;
}

export function triggerRandomEvent(state: GameState, canvasW: number, canvasH: number): void {
  const events: GameEvent['type'][] = [
    'ingredientRain',
    'fireflyDance',
    'magicGarden',
    'catGift',
    'monsterSurprise',
  ];
  const type = events[Math.floor(Math.random() * events.length)];

  switch (type) {
    case 'ingredientRain':
      state.activeEvent = {
        type,
        timer: 12000,
        duration: 12000,
        fallingIngredients: createFallingIngredients(canvasW, 20, null),
        completed: false,
      };
      showMessage(state, '🌧️ Ingredient Rain! Click falling items to catch them!');
      break;
    case 'fireflyDance':
      state.activeEvent = {
        type,
        timer: 15000,
        duration: 15000,
        fireflies: createFireflies(canvasW, canvasH, 12),
        completed: false,
      };
      showMessage(state, '🌟 Firefly Dance! Catch the magical fireflies for Star Dust!');
      break;
    case 'magicGarden':
      state.magicGardenActive = true;
      state.magicGardenTimer = 25000;
      showMessage(state, '🌱 Magic Garden! Ingredients appear 2.5× faster for 25 seconds!');
      break;
    case 'catGift': {
      const gifts: IngredientType[] = ['crystal', 'starDust', 'essence'];
      const gift = gifts[Math.floor(Math.random() * gifts.length)];
      state.cat.giftCooldown = 0; // immediate gift on next update
      state.activeEvent = { type, timer: 3000, duration: 3000, giftIngredient: gift, completed: false };
      showMessage(state, `🐱 The cat found something special for you!`);
      break;
    }
    case 'monsterSurprise': {
      const gifts: IngredientType[] = ['redMushroom', 'blueMushroom', 'starDust'];
      const gift = gifts[Math.floor(Math.random() * gifts.length)];
      state.monster.giftCooldown = 0;
      state.activeEvent = { type, timer: 3000, duration: 3000, giftIngredient: gift, completed: false };
      showMessage(state, `🦕 The monster brought a surprise!`);
      break;
    }
  }
}

// ─── Event Update ────────────────────────────────────────────────────────────

export function updateEvent(
  state: GameState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  const ev = state.activeEvent;
  if (!ev) return;

  ev.timer -= dt;

  if (ev.type === 'ingredientRain' && ev.fallingIngredients) {
    for (const fi of ev.fallingIngredients) {
      if (fi.collected) continue;
      fi.y += fi.vy * (dt / 16);
      fi.spin += 0.02;
      if (fi.y > canvasH + 50) fi.collected = true; // fell off screen
    }
    ev.fallingIngredients = ev.fallingIngredients.filter((f) => !f.collected);

    // also update fireflies if rainbow event
    if (ev.fireflies) {
      updateFireflies(ev.fireflies, dt, canvasW, canvasH);
    }
  }

  if (ev.type === 'fireflyDance' && ev.fireflies) {
    updateFireflies(ev.fireflies, dt, canvasW, canvasH);
    if (ev.fireflies.every((f) => f.caught)) ev.timer = 0; // all caught, end early
  }

  if (ev.timer <= 0) {
    ev.completed = true;
    state.activeEvent = null;
  }
}

function updateFireflies(
  fireflies: Firefly[],
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  for (const ff of fireflies) {
    if (ff.caught) continue;
    ff.phase += dt * 0.002;
    ff.x += ff.vx + Math.sin(ff.phase * 1.3) * 0.5;
    ff.y += ff.vy + Math.cos(ff.phase) * 0.5;
    if (ff.x < 20 || ff.x > canvasW - 20) ff.vx *= -1;
    if (ff.y < canvasH * 0.2 || ff.y > canvasH * 0.9) ff.vy *= -1;
  }
}

// ─── Click / Tap Handling ────────────────────────────────────────────────────

export function handleEventClick(
  state: GameState,
  clickX: number,
  clickY: number,
): void {
  const ev = state.activeEvent;
  if (!ev) return;

  if (ev.fallingIngredients) {
    for (const fi of ev.fallingIngredients) {
      if (fi.collected) continue;
      if (Math.hypot(clickX - fi.x, clickY - fi.y) < 28) {
        fi.collected = true;
        const def = INGREDIENT_DEFS[fi.type];
        state.inventory[fi.type] = (state.inventory[fi.type] ?? 0) + 1;
        state.score += def.scoreValue;
        spawnParticles(state, fi.x, fi.y, def.glowColor, 10);
        addFloatingText(state, `+${def.name}!`, fi.x, fi.y - 20, def.color);
      }
    }
  }

  if (ev.fireflies) {
    for (const ff of ev.fireflies) {
      if (ff.caught) continue;
      if (Math.hypot(clickX - ff.x, clickY - ff.y) < 30) {
        ff.caught = true;
        state.inventory['starDust'] = (state.inventory['starDust'] ?? 0) + 1;
        state.score += 40;
        spawnParticles(state, ff.x, ff.y, '#facc15', 12);
        addFloatingText(state, '+Star Dust! ⭐', ff.x, ff.y - 20, '#facc15');
      }
    }
  }
}

// ─── Tick Update ─────────────────────────────────────────────────────────────

export function updateParticles(state: GameState, dt: number): void {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    p.life -= dt / p.maxLife;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

export function updateFloatingTexts(state: GameState, dt: number): void {
  for (const ft of state.floatingTexts) {
    ft.y += ft.vy;
    ft.life -= dt;
  }
  state.floatingTexts = state.floatingTexts.filter((ft) => ft.life > 0);
}

export function updateActiveEffects(state: GameState, dt: number): void {
  for (const effect of state.activePotions) {
    effect.remaining -= dt;
  }
  state.activePotions = state.activePotions.filter((e) => e.remaining > 0);

  // Growth: reset scale when effect ends
  const isGrowthActive = state.activePotions.some((p) => p.type === 'growth');
  if (!isGrowthActive) {
    for (const ing of state.ingredients) {
      ing.scale = 1;
    }
  }
}

export function updateIngredients(state: GameState, time: number): void {
  for (const ing of state.ingredients) {
    const isGrowthActive = state.activePotions.some((p) => p.type === 'growth');
    ing.scale = isGrowthActive ? 1.8 : 1;
    // Bob animation is handled in rendering
  }
}

export function updateSpawnTimer(
  state: GameState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  state.spawnTimer -= dt;
  const interval = state.magicGardenActive
    ? SPAWN_INTERVAL_BASE * 0.4
    : SPAWN_INTERVAL_BASE;

  if (state.spawnTimer <= 0 && state.ingredients.length < MAX_INGREDIENTS_ON_MAP) {
    const isCrystalActive = state.activePotions.some((p) => p.type === 'crystal');
    state.ingredients.push(spawnIngredient(canvasW, canvasH, isCrystalActive));
    state.spawnTimer = interval;
  }
}

export function updateEventTimer(
  state: GameState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  if (state.activeEvent) return; // no new event while one is running
  state.eventTimer -= dt;
  if (state.eventTimer <= 0) {
    triggerRandomEvent(state, canvasW, canvasH);
    state.eventTimer = EVENT_INTERVAL + Math.random() * 10000;
  }
}

export function updateMagicGarden(state: GameState, dt: number): void {
  if (!state.magicGardenActive) return;
  state.magicGardenTimer -= dt;
  if (state.magicGardenTimer <= 0) {
    state.magicGardenActive = false;
    showMessage(state, '🌱 The magic garden fades away…');
  }
}

export function updateMessage(state: GameState, dt: number): void {
  if (state.message) {
    state.message.timer -= dt;
    if (state.message.timer <= 0) state.message = null;
  }
}
