import type { GameState, Butterfly, FallingStar, MemoryCard, IngredientType } from '@/shared/types';
import { nextIngredientId, spawnIngredient, randomIngredientType } from '@/game/state';

let butterflyIdCounter = 0;
let starIdCounter = 0;
let cardIdCounter = 0;

function nextButterflyId(): string {
  return `bf_${++butterflyIdCounter}`;
}
function nextStarId(): string {
  return `st_${++starIdCounter}`;
}
function nextCardId(): string {
  return `mc_${++cardIdCounter}`;
}

export function shouldTriggerEvent(state: GameState): boolean {
  return state.eventTimer <= 0 && state.miniGame.type === null;
}

export function triggerRandomEvent(state: GameState): void {
  const roll = Math.random();
  if (roll < 0.25) {
    triggerIngredientSpawn(state);
  } else if (roll < 0.5) {
    triggerButterflySwarm(state);
  } else if (roll < 0.65) {
    triggerMeteorShower(state);
  } else if (roll < 0.80) {
    triggerMagicFlowerBloom(state);
  } else if (roll < 0.90) {
    triggerThunderstorm(state);
  } else {
    triggerGnomeVisit(state);
  }
  state.eventTimer = 30000 + Math.random() * 15000;
}

function triggerIngredientSpawn(state: GameState): void {
  if (state.worldIngredients.filter((i) => !i.collected).length >= 12) return;
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    if (state.worldIngredients.filter((x) => !x.collected).length < 12) {
      state.worldIngredients.push(spawnIngredient(state.canvasWidth, state.canvasHeight));
    }
  }
  addMessage(state, '✨ New ingredients appeared!', '#a855f7');
}

function triggerButterflySwarm(state: GameState): void {
  startButterflyMiniGame(state, 8);
  addMessage(state, '🦋 MINI-GAME: Catch the Butterflies!', '#ec4899');
}

function triggerMeteorShower(state: GameState): void {
  startStarsMiniGame(state);
  addMessage(state, '⭐ MINI-GAME: Catch Falling Stars!', '#eab308');
}

function triggerMagicFlowerBloom(state: GameState): void {
  if (state.worldIngredients.filter((i) => !i.collected).length < 12) {
    const groundY = state.canvasHeight * 0.88;
    state.worldIngredients.push({
      id: nextIngredientId(),
      type: 'magic_flower',
      x: 80 + Math.random() * (state.canvasWidth - 160),
      y: groundY - 15 - Math.random() * 40,
      collected: false,
    });
    addMessage(state, '🌺 A Magic Flower bloomed!', '#f472b6');
  }
}

function triggerThunderstorm(state: GameState): void {
  state.rainTimer = 8000;
  addMessage(state, '⛈️ Thunderstorm! Water ingredients near the well!', '#38bdf8');
  // Spawn water near center (well position)
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    if (state.worldIngredients.filter((x) => !x.collected).length < 12) {
      const cx = state.canvasWidth / 2;
      const groundY = state.canvasHeight * 0.88;
      state.worldIngredients.push({
        id: nextIngredientId(),
        type: 'water',
        x: cx + 80 + (Math.random() - 0.5) * 120,
        y: groundY - 10 - Math.random() * 30,
        collected: false,
      });
    }
  }
}

function triggerGnomeVisit(state: GameState): void {
  state.gnomeActive = true;
  state.gnomeX = Math.random() < 0.5 ? 80 : state.canvasWidth - 80;
  state.gnomeY = state.canvasHeight * 0.84;
  state.gnomeIngredient = randomIngredientType();
  state.gnomeSpeech = `Trade? I have ${state.gnomeIngredient}!`;
  state.gnomeTimer = 12000;
  addMessage(state, '🧙 A Gnome appeared! Click to trade!', '#22c55e');
}

export function addMessage(
  state: GameState,
  text: string,
  color = '#ffffff',
  x?: number,
  y?: number
): void {
  state.messages.push({
    id: `msg_${Date.now()}_${Math.random()}`,
    text,
    x: x ?? state.canvasWidth / 2,
    y: y ?? state.canvasHeight * 0.35,
    timeLeft: 3000,
    color,
  });
}

export function startButterflyMiniGame(state: GameState, count = 8): void {
  const butterflies: Butterfly[] = [];
  for (let i = 0; i < count; i++) {
    butterflies.push({
      id: nextButterflyId(),
      x: 80 + Math.random() * (state.canvasWidth - 160),
      y: 60 + Math.random() * (state.canvasHeight * 0.5),
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 2,
      caught: false,
      phase: Math.random() * Math.PI * 2,
    });
  }
  state.miniGame = {
    type: 'butterfly',
    timeLeft: 20000,
    butterflies,
    fallingStars: [],
    memoryCards: [],
    flippedCards: [],
    lastFlipTime: 0,
    score: 0,
  };
}

export function startStarsMiniGame(state: GameState): void {
  const stars: FallingStar[] = [];
  for (let i = 0; i < 10; i++) {
    stars.push({
      id: nextStarId(),
      x: 40 + Math.random() * (state.canvasWidth - 80),
      y: -30 - Math.random() * 200,
      vy: 2 + Math.random() * 3,
      caught: false,
      trail: [],
    });
  }
  state.miniGame = {
    type: 'stars',
    timeLeft: 25000,
    butterflies: [],
    fallingStars: stars,
    memoryCards: [],
    flippedCards: [],
    lastFlipTime: 0,
    score: 0,
  };
}

const MEMORY_INGREDIENTS: IngredientType[] = [
  'red_mushroom',
  'blue_mushroom',
  'herbs',
  'fern',
  'crystal',
  'stardust',
  'fairy_dust',
  'water',
];

export function startMemoryMiniGame(state: GameState): void {
  const cards: MemoryCard[] = [];
  // 8 pairs = 16 cards in 4x4 grid
  const pairs = [...MEMORY_INGREDIENTS, ...MEMORY_INGREDIENTS];
  // Shuffle using Fisher-Yates with a temp variable for clarity
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pairs[i];
    pairs[i] = pairs[j];
    pairs[j] = temp;
  }

  const cols = 4;
  const rows = 4;
  const cardW = 90;
  const cardH = 70;
  const gapX = 20;
  const gapY = 15;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startX = (state.canvasWidth - totalW) / 2;
  const startY = (state.canvasHeight - totalH) / 2 + 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      cards.push({
        id: nextCardId(),
        ingredient: pairs[idx],
        pairId: MEMORY_INGREDIENTS.indexOf(pairs[idx]),
        flipped: false,
        matched: false,
        x: startX + c * (cardW + gapX),
        y: startY + r * (cardH + gapY),
        width: cardW,
        height: cardH,
      });
    }
  }

  state.miniGame = {
    type: 'memory',
    timeLeft: 60000,
    butterflies: [],
    fallingStars: [],
    memoryCards: cards,
    flippedCards: [],
    lastFlipTime: 0,
    score: 0,
  };
}

export function updateEvents(state: GameState, deltaMs: number): void {
  state.eventTimer -= deltaMs;

  // Day/night cycle: 1 real minute = 1 game day
  state.timeOfDay += deltaMs / 60000;
  if (state.timeOfDay >= 1) {
    state.timeOfDay -= 1;
    state.day += 1;
  }
  state.isNight = state.timeOfDay > 0.6 || state.timeOfDay < 0.1;

  // Ingredient spawn timer
  state.spawnTimer -= deltaMs;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = 15000;
    const active = state.worldIngredients.filter((i) => !i.collected).length;
    if (active < 12) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count && active + i < 12; i++) {
        state.worldIngredients.push(spawnIngredient(state.canvasWidth, state.canvasHeight));
      }
    }
  }

  // Rain timer
  if (state.rainTimer > 0) state.rainTimer -= deltaMs;

  // Gnome timer
  if (state.gnomeActive) {
    state.gnomeTimer -= deltaMs;
    if (state.gnomeTimer <= 0) {
      state.gnomeActive = false;
    }
  }

  // Rainbow timer
  if (state.rainbowActive) {
    state.rainbowTimer -= deltaMs;
    if (state.rainbowTimer <= 0) state.rainbowActive = false;
  }

  // Message timers
  state.messages = state.messages.filter((m) => {
    m.timeLeft -= deltaMs;
    m.y -= deltaMs * 0.025;
    return m.timeLeft > 0;
  });

  // Active effects timers
  state.activeEffects = state.activeEffects.filter((e) => {
    e.timeLeft -= deltaMs;
    return e.timeLeft > 0;
  });

  // Cauldron brewing
  if (state.cauldron.brewing) {
    state.cauldron.brewingTimeLeft -= deltaMs;
    // Bubble update
    for (const b of state.cauldron.bubbles) {
      b.y += b.vy;
      b.alpha -= 0.01;
    }
    state.cauldron.bubbles = state.cauldron.bubbles.filter((b) => b.alpha > 0);
    if (Math.random() < 0.3) {
      state.cauldron.bubbles.push({
        x: 0 + (Math.random() - 0.5) * 20,
        y: 0,
        vy: -1.5 - Math.random(),
        r: 3 + Math.random() * 5,
        alpha: 0.9,
      });
    }
  }

  // Mini-game ticks
  if (state.miniGame.type !== null) {
    state.miniGame.timeLeft -= deltaMs;

    if (state.miniGame.type === 'butterfly') {
      updateButterflies(state, deltaMs);
      if (
        state.miniGame.timeLeft <= 0 ||
        state.miniGame.butterflies.every((b) => b.caught)
      ) {
        endMiniGame(state);
      }
    } else if (state.miniGame.type === 'stars') {
      updateStars(state, deltaMs);
      if (
        state.miniGame.timeLeft <= 0 ||
        state.miniGame.fallingStars.every((s) => s.caught || s.y > state.canvasHeight + 50)
      ) {
        endMiniGame(state);
      }
    } else if (state.miniGame.type === 'memory') {
      updateMemoryFlip(state);
      const allMatched = state.miniGame.memoryCards.every((c) => c.matched);
      if (state.miniGame.timeLeft <= 0 || allMatched) {
        endMiniGame(state);
      }
    }
  }

  // NPC behaviour
  updateNPCs(state, deltaMs);

  // Random event check
  if (shouldTriggerEvent(state)) {
    if (Math.random() < 0.3) {
      triggerRandomEvent(state);
    } else {
      state.eventTimer = 30000;
    }
  }
}

function updateButterflies(state: GameState, deltaMs: number): void {
  const dt = deltaMs / 16;
  for (const bf of state.miniGame.butterflies) {
    if (bf.caught) continue;
    bf.phase += 0.05 * dt;
    bf.x += bf.vx * dt;
    bf.y += bf.vy * dt + Math.sin(bf.phase) * 0.5;
    // Bounce off walls
    if (bf.x < 30 || bf.x > state.canvasWidth - 30) bf.vx *= -1;
    if (bf.y < 30 || bf.y > state.canvasHeight * 0.65) bf.vy *= -1;
  }
}

function updateStars(state: GameState, deltaMs: number): void {
  const dt = deltaMs / 16;
  for (const star of state.miniGame.fallingStars) {
    if (star.caught) continue;
    star.trail.push({ x: star.x, y: star.y });
    if (star.trail.length > 12) star.trail.shift();
    star.y += star.vy * dt;
    star.x += Math.sin(star.y * 0.03) * 0.5;
  }
}

function updateMemoryFlip(state: GameState): void {
  const mg = state.miniGame;
  // After 1 second, flip back non-matching flipped cards
  if (mg.flippedCards.length === 2) {
    const now = Date.now();
    if (now - mg.lastFlipTime > 1000) {
      const [id1, id2] = mg.flippedCards;
      const c1 = mg.memoryCards.find((c) => c.id === id1);
      const c2 = mg.memoryCards.find((c) => c.id === id2);
      if (c1 && c2 && c1.pairId !== c2.pairId) {
        c1.flipped = false;
        c2.flipped = false;
      }
      mg.flippedCards = [];
    }
  }
}

function endMiniGame(state: GameState): void {
  const type = state.miniGame.type;
  const score = state.miniGame.score;
  state.score += score;
  let msg = `Mini-game ended! +${score} score!`;
  if (type === 'butterfly') msg = `🦋 Butterfly hunt over! +${score} score!`;
  if (type === 'stars') msg = `⭐ Star shower over! +${score} score!`;
  if (type === 'memory') msg = `🃏 Memory match over! +${score} score!`;
  addMessage(state, msg, '#f59e0b');
  state.miniGame = {
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

function updateNPCs(state: GameState, deltaMs: number): void {
  const dt = deltaMs / 16;
  const friendshipActive = state.activeEffects.some((e) => e.type === 'friendship_potion');

  for (const npc of state.npcs) {
    npc.wanderTimer -= deltaMs;
    if (npc.speechTimer > 0) npc.speechTimer -= deltaMs;

    // If friendship potion active and npc has not delivered yet
    if (friendshipActive && !npc.deliveredIngredient && !npc.isCarryingIngredient) {
      npc.isCarryingIngredient = true;
      npc.carryIngredient = randomIngredientType();
    }

    if (npc.isCarryingIngredient && npc.carryIngredient) {
      // Walk toward witch
      npc.targetX = state.witch.x;
      npc.targetY = state.witch.y;

      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 50) {
        // Deliver
        const ing = npc.carryIngredient;
        state.inventory[ing] = (state.inventory[ing] ?? 0) + 1;
        addMessage(state, `${npc.type === 'cat' ? '🐱' : '👹'} gave you ${ing.replace('_', ' ')}!`, '#22c55e');
        npc.isCarryingIngredient = false;
        npc.carryIngredient = null;
        npc.deliveredIngredient = true;
        npc.speechBubble = 'Here you go! ❤️';
        npc.speechTimer = 2500;
      } else {
        const speed = 2;
        npc.x += (dx / dist) * speed * dt;
        npc.y += (dy / dist) * speed * dt;
        npc.facingRight = dx > 0;
      }
    } else if (npc.wanderTimer <= 0) {
      // Pick new random wander target
      npc.wanderTimer = 3000 + Math.random() * 5000;
      const groundY = state.canvasHeight * 0.85;
      npc.targetX = 60 + Math.random() * (state.canvasWidth - 120);
      npc.targetY = groundY - Math.random() * 30;
    } else {
      // Move toward wander target
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const speed = 1.2;
        npc.x += (dx / dist) * speed * dt;
        npc.y += (dy / dist) * speed * dt;
        npc.facingRight = dx > 0;
      }
    }

    // Animate NPC frames
    npc.tickCount++;
    if (npc.tickCount > 8) {
      npc.tickCount = 0;
      npc.frameIndex = (npc.frameIndex + 1) % 5;
    }
  }
}
