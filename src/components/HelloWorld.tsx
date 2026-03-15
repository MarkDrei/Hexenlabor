'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { drawBackground } from '@/renderers/background';
import { drawThings } from '@/renderers/things';
import type {
  GameState,
  IngredientType,
  PotionType,
  InventoryItem,
  NPC,
  WorldIngredient,
  TreasureChest,
  Notification,
} from '@/shared/types';
import {
  createInitialState,
  INGREDIENT_DEFS,
  POTION_RECIPES,
  spawnIngredient,
  addToInventory,
  removeFromInventory,
  hasIngredients,
  INTERACT_DISTANCE,
  COLLECT_DISTANCE,
  DAY_DURATION,
  INGREDIENT_SPAWN_INTERVAL,
  CAULDRON_REL,
  WELL_REL,
} from '@/game/engine';

// ── Sprite mappings (things2.png) ─────────────────────────────────────────────
// things2.png has 3 rows (each ~33.3% tall)
const ING_SPRITES: Record<IngredientType, { rs: number; re: number; cs: number; ce: number }> = {
  mushroom_red:  { rs: 0.33, re: 0.66, cs: 0.00, ce: 0.16 },
  mushroom_blue: { rs: 0.33, re: 0.66, cs: 0.16, ce: 0.33 },
  crystal:       { rs: 0.66, re: 1.00, cs: 0.66, ce: 0.83 },
  herb:          { rs: 0.66, re: 1.00, cs: 0.50, ce: 0.66 },
  water_drop:    { rs: 0.33, re: 0.66, cs: 0.50, ce: 0.66 },
  star:          { rs: 0.66, re: 1.00, cs: 0.00, ce: 0.16 },
  flower:        { rs: 0.33, re: 0.66, cs: 0.33, ce: 0.50 },
  key:           { rs: 0.33, re: 0.66, cs: 0.90, ce: 1.00 },
  scroll:        { rs: 0.00, re: 0.33, cs: 0.25, ce: 0.50 },
};
const CHEST_SPRITE = { rs: 0.66, re: 1.00, cs: 0.33, ce: 0.50 };

// ── Canvas rendering helpers ──────────────────────────────────────────────────

function drawIngredientAt(
  ctx: CanvasRenderingContext2D,
  img2: HTMLImageElement,
  type: IngredientType,
  wx: number,
  wy: number,
  isGlowing: boolean,
  gameTime: number,
) {
  const sp = ING_SPRITES[type];
  const sx = sp.cs * img2.width;
  const sy = sp.rs * img2.height;
  const sw = (sp.ce - sp.cs) * img2.width;
  const sh = (sp.re - sp.rs) * img2.height;
  const size = 34;
  const bob = Math.sin(gameTime * 0.002 + wx * 0.05) * 3;
  const dx = wx - size / 2;
  const dy = wy - size + bob;

  if (isGlowing) {
    ctx.save();
    ctx.shadowColor = INGREDIENT_DEFS[type].color;
    ctx.shadowBlur = 18;
    ctx.drawImage(img2, sx, sy, sw, sh, dx, dy, size, size);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(gameTime * 0.004) * 0.15;
    ctx.strokeStyle = INGREDIENT_DEFS[type].color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wx, wy - size / 2 + bob, size / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.drawImage(img2, sx, sy, sw, sh, dx, dy, size, size);
  }
}

function drawChestAt(
  ctx: CanvasRenderingContext2D,
  img2: HTMLImageElement,
  chest: TreasureChest,
  witchNearby: boolean,
  animTime: number,
) {
  const sp = CHEST_SPRITE;
  const size = 48;
  const sx = sp.cs * img2.width;
  const sy = sp.rs * img2.height;
  const sw = (sp.ce - sp.cs) * img2.width;
  const sh = (sp.re - sp.rs) * img2.height;
  const bob = chest.opened ? 0 : Math.sin(animTime * 0.003 + chest.x) * 2;
  ctx.globalAlpha = chest.opened ? 0.4 : 1;
  ctx.drawImage(img2, sx, sy, sw, sh, chest.x - size / 2, chest.y - size + bob, size, size);
  ctx.globalAlpha = 1;
  if (witchNearby && !chest.opened) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click to open! 🎁', chest.x, chest.y - size - 6 + bob);
  }
}

function drawParticlesLayer(ctx: CanvasRenderingContext2D, state: GameState) {
  state.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawWitch(ctx: CanvasRenderingContext2D, img: HTMLImageElement, state: GameState) {
  if (!img.complete || !img.naturalWidth) return;
  const sw = img.width / 5;
  const sh = img.height / 2;
  const sx = state.witchFrame * sw;
  ctx.save();
  if (state.witchFacing === 'left') {
    ctx.translate(state.witchX, state.witchY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, 0, sw, sh, -sw / 2, -sh, sw, sh);
  } else {
    ctx.drawImage(img, sx, 0, sw, sh, state.witchX - sw / 2, state.witchY - sh, sw, sh);
  }
  ctx.restore();
  if (state.isBrewing) {
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨', state.witchX, state.witchY - sh - 8);
  }
}

function drawNPCLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  npcs: NPC[],
  witchX: number,
  witchY: number,
  isSleepActive: boolean,
) {
  if (!img.complete || !img.naturalWidth) return;
  const sw = img.width / 5;
  const sh = img.height / 2;
  npcs.forEach(npc => {
    const row = npc.type === 'cat' ? 0 : sh;
    const sx = npc.frame * sw;
    ctx.save();
    if (npc.direction === 'left') {
      ctx.translate(npc.x, npc.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, row, sw, sh, -sw / 2, -sh, sw, sh);
    } else {
      ctx.drawImage(img, sx, row, sw, sh, npc.x - sw / 2, npc.y - sh, sw, sh);
    }
    ctx.restore();

    const dist = Math.hypot(witchX - npc.x, witchY - npc.y);
    if (dist < INTERACT_DISTANCE && npc.interactCooldown <= 0) {
      ctx.fillStyle = 'white';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      const label = npc.type === 'cat' ? 'Click for a gift! 🎁' : 'Click to trade! 🤝';
      ctx.fillText(label, npc.x, npc.y - sh - 8);
    }
    if (isSleepActive) {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💤', npc.x + 14, npc.y - sh + 4);
    }
  });
}

function drawBrewingProgress(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cauldronX: number,
  cauldronY: number,
) {
  if (!state.isBrewing) return;
  const barW = 80;
  const barH = 10;
  const bx = cauldronX - barW / 2;
  const by = cauldronY - 80;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
  ctx.fillStyle = '#a78bfa';
  ctx.fillRect(bx, by, barW * state.brewProgress, barH);
  ctx.fillStyle = 'white';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Brewing…', cauldronX, by - 6);
}

// ── Game-logic helpers ────────────────────────────────────────────────────────

function pushNotification(state: GameState, message: string, type: Notification['type'], now: number) {
  state.notifications.push({
    id: `n_${now}_${Math.random().toString(36).slice(2)}`,
    message, type, timestamp: now, duration: 3_500,
  });
  if (state.notifications.length > 6) state.notifications.shift();
}

function interactWithNPC(state: GameState, npc: NPC, now: number) {
  npc.interactCooldown = 25_000;
  npc.state = 'talking';
  npc.idleTimer = 2_000;
  if (npc.type === 'cat') {
    const pool: IngredientType[] = ['mushroom_red', 'mushroom_blue', 'herb', 'flower', 'scroll'];
    const gift: IngredientType = Math.random() < 0.25 ? 'scroll' : pool[Math.floor(Math.random() * (pool.length - 1))];
    state.inventory = addToInventory(state.inventory, gift);
    state.score += 20;
    pushNotification(state, `🐱 The cat gave you ${INGREDIENT_DEFS[gift].name}!`, 'success', now);
  } else {
    const hasKey = state.inventory.some(i => i.type === 'key' && i.quantity > 0);
    if (hasKey) {
      state.inventory = removeFromInventory(state.inventory, 'key');
      state.inventory = addToInventory(state.inventory, 'crystal');
      state.inventory = addToInventory(state.inventory, 'crystal');
      state.score += 30;
      pushNotification(state, '🐾 Monster traded your key for 2 crystals!', 'success', now);
    } else {
      const hints = [
        '🐾 "Crystals only glow at night…"',
        '🐾 "Mix mushrooms for a speed boost!"',
        '🐾 "Stars fall from the sky after dark!"',
        '🐾 "Bring me a key next time!"',
      ];
      pushNotification(state, hints[Math.floor(Math.random() * hints.length)], 'info', now);
    }
  }
}

function collectWater(state: GameState, now: number) {
  state.inventory = addToInventory(state.inventory, 'water_drop');
  state.wellCooldown = 12_000;
  state.score += 10;
  pushNotification(state, '💧 Collected Water Drop from the well!', 'success', now);
}

function openChest(state: GameState, chest: TreasureChest, now: number) {
  chest.opened = true;
  const rewards: IngredientType[] = ['crystal', 'star', 'scroll', 'key', 'mushroom_red', 'herb'];
  const count = 2 + Math.floor(Math.random() * 2);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = rewards[Math.floor(Math.random() * rewards.length)];
    state.inventory = addToInventory(state.inventory, t);
    names.push(INGREDIENT_DEFS[t].name);
  }
  state.score += 60;
  pushNotification(state, `🎁 Treasure! Found: ${names.join(', ')}`, 'event', now);
}

function finishBrewing(state: GameState, potionType: PotionType, now: number) {
  state.isBrewing = false;
  state.brewProgress = 0;
  state.brewingPotionType = null;
  state.inventory = addToInventory(state.inventory, potionType);
  state.potionsBrewed++;
  state.score += 120;
  const recipe = POTION_RECIPES.find(r => r.type === potionType)!;
  pushNotification(state, `✨ Brewed ${recipe.name}! ${recipe.emoji}`, 'success', now);
}

function applyPotion(
  state: GameState,
  potionType: PotionType,
  canvasW: number,
  canvasH: number,
  animTime: number,
  now: number,
) {
  if (!state.inventory.some(i => i.type === potionType && i.quantity > 0)) return;
  state.inventory = removeFromInventory(state.inventory, potionType);

  switch (potionType) {
    case 'speed_potion':
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'speed');
      state.activeEffects.push({ type: 'speed', endTime: state.gameTime + 30_000 });
      pushNotification(state, '⚡ Speed Potion! 30 seconds of turbo!', 'success', now);
      break;
    case 'glow_potion':
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'glow');
      state.activeEffects.push({ type: 'glow', endTime: state.gameTime + 30_000 });
      pushNotification(state, '✨ Glow Potion! All ingredients visible!', 'success', now);
      break;
    case 'rain_potion':
      state.weather = 'rainy';
      state.weatherTimer = 45_000;
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'rain');
      state.activeEffects.push({ type: 'rain', endTime: state.gameTime + 45_000 });
      pushNotification(state, '🌧️ Rain Potion! Water drops everywhere!', 'event', now);
      break;
    case 'growth_potion':
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'growth');
      state.activeEffects.push({ type: 'growth', endTime: state.gameTime + 30_000 });
      pushNotification(state, '🌱 Growth Potion! Ingredients sprout faster!', 'success', now);
      break;
    case 'magic_bomb':
      triggerIngredientRush(state, canvasW, canvasH, animTime, now);
      break;
    case 'sleep_potion':
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'sleep');
      state.activeEffects.push({ type: 'sleep', endTime: state.gameTime + 15_000 });
      pushNotification(state, '😴 Sleep Potion! NPCs drop their items!', 'success', now);
      state.npcs.forEach(npc => {
        npc.state = 'idle';
        npc.idleTimer = 15_000;
        const dropType: IngredientType = npc.type === 'cat' ? 'scroll' : 'key';
        state.worldIngredients.push({
          id: `sleep_${Date.now()}_${Math.random()}`,
          type: dropType,
          x: npc.x + (Math.random() - 0.5) * 40,
          y: npc.y - 10,
          collected: false,
        });
      });
      break;
  }
}

function triggerIngredientRush(
  state: GameState,
  canvasW: number,
  canvasH: number,
  animTime: number,
  now: number,
) {
  const types: IngredientType[] = ['mushroom_red', 'mushroom_blue', 'crystal', 'herb', 'flower'];
  const newIngs: WorldIngredient[] = [];
  for (let i = 0; i < 22; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    newIngs.push({
      id: `rush_${i}_${Date.now()}`,
      type,
      x: (0.08 + Math.random() * 0.84) * canvasW,
      y: (0.52 + Math.random() * 0.38) * canvasH,
      collected: false,
    });
  }
  state.worldIngredients = [...state.worldIngredients.filter(i => !i.collected), ...newIngs];
  state.miniGame = {
    type: 'ingredient_rush',
    startTime: animTime,
    duration: 20_000,
    score: 0,
    targetIds: newIngs.map(i => i.id),
    collectedIds: [],
  };
  pushNotification(state, '💥 MAGIC BOMB! Ingredient Rush! Collect fast!', 'event', now);
}

function triggerRandomEvent(state: GameState, canvasW: number, canvasH: number, now: number) {
  const roll = Math.random();
  if (roll < 0.38) {
    state.treasureChests = state.treasureChests.filter(c => !c.opened);
    state.treasureChests.push({
      id: `chest_${Date.now()}`,
      x: (0.1 + Math.random() * 0.8) * canvasW,
      y: (0.56 + Math.random() * 0.3) * canvasH,
      opened: false,
    });
    pushNotification(state, '🎁 A treasure chest appeared somewhere!', 'event', now);
  } else if (roll < 0.60) {
    state.fairyActive = true;
    state.fairyTimer = 30_000;
    state.activeEffects = state.activeEffects.filter(e => e.type !== 'double_score');
    state.activeEffects.push({ type: 'double_score', endTime: state.gameTime + 30_000 });
    pushNotification(state, '🧚 A fairy visits! Double score for 30 s!', 'event', now);
  } else if (roll < 0.78) {
    pushNotification(state, '🐱 The cat is restless — go say hi!', 'info', now);
  } else {
    const opts: GameState['weather'][] = ['sunny', 'cloudy', 'rainy', 'stormy'];
    state.weather = opts[Math.floor(Math.random() * opts.length)];
    state.weatherTimer = 35_000;
    pushNotification(state, `Weather changed to ${state.weather}! 🌤️`, 'info', now);
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<GameState | null>(null);

  const [uiInventory,       setUiInventory]       = useState<InventoryItem[]>([]);
  const [showCrafting,      setShowCrafting]       = useState(false);
  const [selectedBrew,      setSelectedBrew]       = useState<IngredientType[]>([]);
  const [notifications,     setNotifications]      = useState<Notification[]>([]);
  const [score,             setScore]              = useState(0);
  const [isNight,           setIsNight]            = useState(false);
  const [activeEffectNames, setActiveEffectNames]  = useState<string[]>([]);
  const [weather,           setWeather]            = useState<string>('sunny');
  const [miniGameUI,        setMiniGameUI]         = useState<{ timeLeft: number; score: number } | null>(null);
  const [dayProgress,       setDayProgress]        = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      canvas.width  = window.innerWidth  - 40;
      canvas.height = window.innerHeight - 40;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    stateRef.current = createInitialState(canvas.width, canvas.height);

    const witchImg   = new Image(); witchImg.src   = '/assets/witch.png';
    const catImg     = new Image(); catImg.src     = '/assets/catFluffy.png';
    const thingsImg  = new Image(); thingsImg.src  = '/assets/things.png';
    const things2Img = new Image(); things2Img.src = '/assets/things2.png';

    let rafId  = 0;
    let lastT  = 0;
    let frame  = 0;

    const loop = (t: number) => {
      const state = stateRef.current!;
      const dt  = Math.min(t - lastT, 80);
      lastT = t;
      frame++;

      const now = Date.now();
      const cW  = canvas.width;
      const cH  = canvas.height;
      const cauldronX = cW * CAULDRON_REL.x;
      const cauldronY = cH * CAULDRON_REL.y;
      const wellX     = cW * WELL_REL.x;
      const wellY     = cH * WELL_REL.y;

      // ── Time / Day-Night ────────────────────────────────────────────────────
      state.gameTime   += dt;
      state.dayProgress = (state.gameTime % DAY_DURATION) / DAY_DURATION;
      state.isNight     = state.dayProgress > 0.5;

      // ── Weather ─────────────────────────────────────────────────────────────
      state.weatherTimer -= dt;
      if (state.weatherTimer <= 0) {
        const isRainEffect = state.activeEffects.some(e => e.type === 'rain');
        const opts: GameState['weather'][] = ['sunny', 'sunny', 'cloudy', 'cloudy', 'rainy'];
        state.weather = isRainEffect ? 'rainy' : opts[Math.floor(Math.random() * opts.length)];
        state.weatherTimer = 30_000 + Math.random() * 30_000;
      }

      // ── Rain drops ──────────────────────────────────────────────────────────
      if (state.weather === 'rainy' || state.weather === 'stormy') {
        while (state.rainDrops.length < 120) {
          state.rainDrops.push({ x: Math.random() * cW, y: -10, vy: 8 + Math.random() * 5, length: 10 + Math.random() * 8 });
        }
        state.rainDrops.forEach(r => { r.y += r.vy; });
        state.rainDrops = state.rainDrops.filter(r => r.y < cH + 20);
      } else {
        state.rainDrops = [];
      }

      // ── Ingredient spawning ─────────────────────────────────────────────────
      state.ingredientSpawnTimer += dt;
      const isGrowth     = state.activeEffects.some(e => e.type === 'growth' && e.endTime > state.gameTime);
      const spawnInterval = isGrowth ? INGREDIENT_SPAWN_INTERVAL / 3 : INGREDIENT_SPAWN_INTERVAL;
      if (state.ingredientSpawnTimer >= spawnInterval) {
        state.ingredientSpawnTimer = 0;
        const ing = spawnIngredient(state, cW, cH, state.isNight);
        if (ing) state.worldIngredients.push(ing);
      }
      state.worldIngredients = state.worldIngredients.filter(i => !i.collected);

      // ── Witch movement ───────────────────────────────────────────────────────
      const isSpeed = state.activeEffects.some(e => e.type === 'speed' && e.endTime > state.gameTime);
      const spd = state.witchSpeed * (isSpeed ? 2.2 : 1);
      const dx  = state.witchTargetX - state.witchX;
      const dy  = state.witchTargetY - state.witchY;
      const dist = Math.hypot(dx, dy);

      if (dist > spd) {
        state.witchX      += (dx / dist) * spd;
        state.witchY      += (dy / dist) * spd;
        state.witchFacing  = dx > 0 ? 'right' : 'left';
        state.witchState   = 'walking';
        state.witchAnimTick++;
        if (state.witchAnimTick > 8) {
          state.witchAnimTick = 0;
          state.witchFrame = (state.witchFrame + 1) % 5;
        }
      } else {
        state.witchX     = state.witchTargetX;
        state.witchY     = state.witchTargetY;
        state.witchState = 'idle';
        state.witchFrame = 0;

        // Resolve pending interaction on arrival
        if (state.pendingInteraction) {
          const pi = state.pendingInteraction;
          state.pendingInteraction = null;
          if (pi.kind === 'well' && state.wellCooldown <= 0) {
            collectWater(state, now);
          } else if (pi.kind === 'npc') {
            const npc = state.npcs.find(n => n.id === (pi as { kind: 'npc'; npcId: string }).npcId);
            if (npc && npc.interactCooldown <= 0) interactWithNPC(state, npc, now);
          } else if (pi.kind === 'chest') {
            const chest = state.treasureChests.find(c => c.id === (pi as { kind: 'chest'; chestId: string }).chestId);
            if (chest && !chest.opened) openChest(state, chest, now);
          } else if (pi.kind === 'cauldron') {
            state.showCraftingMenu = true;
          }
        }
      }

      // ── Auto-collect ingredients ─────────────────────────────────────────────
      const isDouble = state.fairyActive &&
        state.activeEffects.some(e => e.type === 'double_score' && e.endTime > state.gameTime);
      state.worldIngredients.forEach(ing => {
        if (ing.collected) return;
        if (Math.hypot(ing.x - state.witchX, ing.y - state.witchY) < COLLECT_DISTANCE) {
          ing.collected = true;
          state.inventory = addToInventory(state.inventory, ing.type);
          state.ingredientsCollected++;
          state.score += isDouble ? 20 : 10;
          const col = INGREDIENT_DEFS[ing.type].color;
          for (let i = 0; i < 8; i++) {
            state.particles.push({
              x: ing.x, y: ing.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              color: col, size: 4 + Math.random() * 4, life: 1,
            });
          }
          if (state.miniGame?.targetIds.includes(ing.id)) {
            state.miniGame.collectedIds.push(ing.id);
            state.miniGame.score += 15;
          }
          pushNotification(state, `Collected ${INGREDIENT_DEFS[ing.type].name}! ${INGREDIENT_DEFS[ing.type].emoji}`, 'success', now);
        }
      });

      // ── NPC updates ──────────────────────────────────────────────────────────
      state.npcs.forEach(npc => {
        npc.interactCooldown = Math.max(0, npc.interactCooldown - dt);
        if (npc.state === 'wandering') {
          npc.x += npc.vx;
          if (npc.x < 60 || npc.x > cW - 60) {
            npc.vx = -npc.vx;
            npc.direction = npc.vx > 0 ? 'right' : 'left';
          }
          npc.animTick++;
          if (npc.animTick > 8) { npc.animTick = 0; npc.frame = (npc.frame + 1) % 5; }
          if (Math.random() < 0.0015) { npc.state = 'idle'; npc.idleTimer = 2_000 + Math.random() * 3_000; }
        } else {
          npc.idleTimer -= dt;
          if (npc.idleTimer <= 0) {
            npc.state = 'wandering';
            npc.vx = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8);
            npc.direction = npc.vx > 0 ? 'right' : 'left';
          }
        }
      });

      // ── Proximity ───────────────────────────────────────────────────────────
      state.cauldronGlowing = Math.hypot(state.witchX - cauldronX, state.witchY - cauldronY) < INTERACT_DISTANCE;
      state.wellGlowing     = Math.hypot(state.witchX - wellX,     state.witchY - wellY)     < INTERACT_DISTANCE;
      state.wellCooldown    = Math.max(0, state.wellCooldown - dt);

      // ── Cauldron brewing ─────────────────────────────────────────────────────
      if (state.isBrewing) {
        state.brewProgress += dt / 3_000;
        if (state.brewProgress >= 1) {
          finishBrewing(state, state.brewingPotionType!, now);
        } else if (Math.random() < 0.25) {
          state.particles.push({
            x: cauldronX + (Math.random() - 0.5) * 28,
            y: cauldronY - 18,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.5 - Math.random() * 2,
            color: '#a78bfa', size: 4 + Math.random() * 5, life: 1,
          });
        }
      }

      // ── Particles ────────────────────────────────────────────────────────────
      state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.022; });
      state.particles = state.particles.filter(p => p.life > 0);

      // ── Effects / fairy ──────────────────────────────────────────────────────
      state.activeEffects = state.activeEffects.filter(e => e.endTime > state.gameTime);
      if (state.fairyActive) {
        state.fairyTimer -= dt;
        if (state.fairyTimer <= 0) {
          state.fairyActive = false;
          pushNotification(state, 'The fairy waved goodbye! ✨', 'info', now);
        }
      }

      // ── Random events ────────────────────────────────────────────────────────
      state.eventTimer -= dt;
      if (state.eventTimer <= 0) {
        triggerRandomEvent(state, cW, cH, now);
        state.eventTimer = 25_000 + Math.random() * 35_000;
      }

      // ── Mini-game ────────────────────────────────────────────────────────────
      if (state.miniGame) {
        const elapsed = t - state.miniGame.startTime;
        if (elapsed >= state.miniGame.duration) {
          const bonus = state.miniGame.score;
          state.score += bonus;
          pushNotification(state, `Ingredient Rush over! +${bonus} pts! 🎉`, 'event', now);
          state.miniGame = null;
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // RENDERING
      // ═══════════════════════════════════════════════════════════════════════
      const glowActive  = state.activeEffects.some(e => e.type === 'glow'  && e.endTime > state.gameTime);
      const isSleepActive = state.activeEffects.some(e => e.type === 'sleep' && e.endTime > state.gameTime);

      drawBackground(ctx, cW, cH, t, state.isNight, state.weather, state.dayProgress);

      // Rain
      if (state.rainDrops.length > 0) {
        ctx.strokeStyle = 'rgba(150,210,255,0.55)';
        ctx.lineWidth = 1;
        state.rainDrops.forEach(r => {
          ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 1, r.y + r.length); ctx.stroke();
        });
      }

      // Environment
      if (thingsImg.complete && thingsImg.naturalWidth) {
        drawThings(ctx, cW, cH, thingsImg, things2Img.complete ? things2Img : undefined);
      }

      // Ingredients
      if (things2Img.complete && things2Img.naturalWidth) {
        state.worldIngredients.forEach(ing => {
          if (!ing.collected) drawIngredientAt(ctx, things2Img, ing.type, ing.x, ing.y, glowActive, state.gameTime);
        });
        state.treasureChests.forEach(chest => {
          const near = Math.hypot(state.witchX - chest.x, state.witchY - chest.y) < INTERACT_DISTANCE;
          drawChestAt(ctx, things2Img, chest, near, t);
        });
      } else {
        // Fallback coloured circles if images not loaded
        state.worldIngredients.forEach(ing => {
          if (!ing.collected) {
            const def = INGREDIENT_DEFS[ing.type];
            ctx.fillStyle = def.color;
            ctx.beginPath(); ctx.arc(ing.x, ing.y - 16, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(def.emoji, ing.x, ing.y - 10);
          }
        });
      }

      // Cauldron glow
      if (state.cauldronGlowing) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(t * 0.005) * 0.15;
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath(); ctx.arc(cauldronX, cauldronY - 28, 42, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'white'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Click to brew! ✨', cauldronX, cauldronY - 72);
      }

      // Well glow
      if (state.wellGlowing && state.wellCooldown <= 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.arc(wellX, wellY - 26, 36, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'white'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Click for water! 💧', wellX, wellY - 66);
      }

      drawNPCLayer(ctx, catImg, state.npcs, state.witchX, state.witchY, isSleepActive);
      drawParticlesLayer(ctx, state);
      drawWitch(ctx, witchImg, state);
      drawBrewingProgress(ctx, state, cauldronX, cauldronY);

      // Fairy
      if (state.fairyActive) {
        ctx.save();
        ctx.globalAlpha = 0.12 + Math.sin(t * 0.003) * 0.04;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, cW, cH);
        ctx.restore();
        const fx = cW * 0.84 + Math.sin(t * 0.0018) * 28;
        const fy = cH * 0.22 + Math.cos(t * 0.0025) * 18;
        ctx.font = '32px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🧚', fx, fy);
      }

      // Mini-game canvas overlay
      if (state.miniGame) {
        const elapsed = t - state.miniGame.startTime;
        const left    = Math.max(0, (state.miniGame.duration - elapsed) / 1000);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(cW / 2 - 170, 12, 340, 52);
        ctx.fillStyle = left < 5 ? '#f87171' : '#fbbf24';
        ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`🍄 INGREDIENT RUSH  ${left.toFixed(1)}s  +${state.miniGame.score}pts`, cW / 2, 46);
        ctx.restore();
      }

      // ── Sync React state ─────────────────────────────────────────────────────
      if (frame % 5 === 0) {
        const vis = state.notifications.filter(n => now - n.timestamp < n.duration);
        setUiInventory([...state.inventory]);
        setNotifications([...vis]);
        setScore(state.score);
        setIsNight(state.isNight);
        setWeather(state.weather);
        setDayProgress(state.dayProgress);
        setActiveEffectNames(state.activeEffects.filter(e => e.endTime > state.gameTime).map(e => e.type));
        setShowCrafting(state.showCraftingMenu);
        if (state.miniGame) {
          const elapsed = t - state.miniGame.startTime;
          setMiniGameUI({ timeLeft: Math.ceil(Math.max(0, state.miniGame.duration - elapsed) / 1000), score: state.miniGame.score });
        } else {
          setMiniGameUI(null);
        }
        state.notifications = vis;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    // ── Input ─────────────────────────────────────────────────────────────────
    const handleClick = (e: MouseEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;
      const cW   = canvas.width;
      const cH   = canvas.height;
      const cauldronX = cW * CAULDRON_REL.x;
      const cauldronY = cH * CAULDRON_REL.y;
      const wellX     = cW * WELL_REL.x;
      const wellY     = cH * WELL_REL.y;

      // NPC?
      for (const npc of state.npcs) {
        if (Math.hypot(cx - npc.x, cy - npc.y) < 50) {
          state.witchTargetX = npc.x;
          state.witchTargetY = npc.y;
          state.pendingInteraction = { kind: 'npc', npcId: npc.id };
          state.showCraftingMenu   = false;
          return;
        }
      }
      // Cauldron?
      if (Math.hypot(cx - cauldronX, cy - cauldronY) < 60) {
        state.witchTargetX = cauldronX;
        state.witchTargetY = cauldronY + 20;
        state.pendingInteraction = { kind: 'cauldron' };
        return;
      }
      // Well?
      if (Math.hypot(cx - wellX, cy - wellY) < 55) {
        state.witchTargetX = wellX;
        state.witchTargetY = wellY + 10;
        state.pendingInteraction = { kind: 'well' };
        return;
      }
      // Treasure chest?
      for (const chest of state.treasureChests) {
        if (!chest.opened && Math.hypot(cx - chest.x, cy - chest.y) < 44) {
          state.witchTargetX = chest.x;
          state.witchTargetY = chest.y;
          state.pendingInteraction = { kind: 'chest', chestId: chest.id };
          return;
        }
      }
      // Move witch
      state.witchTargetX       = cx;
      state.witchTargetY       = cy;
      state.pendingInteraction = null;
      state.showCraftingMenu   = false;
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  // ── Brew action ───────────────────────────────────────────────────────────
  const handleBrew = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.isBrewing || selectedBrew.length < 2) return;

    const sorted = [...selectedBrew].sort();
    const recipe = POTION_RECIPES.find(r => {
      if (r.recipe.length !== sorted.length) return false;
      return [...r.recipe].sort().every((t, i) => t === sorted[i]);
    });

    const now = Date.now();
    if (!recipe) { pushNotification(state, 'No recipe matches those ingredients! 🤔', 'warning', now); return; }
    if (!hasIngredients(state.inventory, recipe.recipe)) { pushNotification(state, 'Not enough ingredients! 📦', 'warning', now); return; }

    recipe.recipe.forEach(t => { state.inventory = removeFromInventory(state.inventory, t); });
    state.isBrewing       = true;
    state.brewProgress    = 0;
    state.brewingPotionType = recipe.type;
    state.showCraftingMenu  = false;
    setSelectedBrew([]);
    pushNotification(state, `Brewing ${recipe.name}… ⚗️`, 'info', now);
  }, [selectedBrew]);

  // ── Use potion ────────────────────────────────────────────────────────────
  const handleUsePotion = useCallback((potionType: PotionType) => {
    const state  = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    applyPotion(state, potionType, canvas.width, canvas.height, performance.now(), Date.now());
  }, []);

  const handleCloseCrafting = useCallback(() => {
    if (stateRef.current) stateRef.current.showCraftingMenu = false;
    setShowCrafting(false);
    setSelectedBrew([]);
  }, []);

  const potionSet    = new Set(POTION_RECIPES.map(r => r.type as string));
  const uiIngredients = uiInventory.filter(i => !potionSet.has(i.type));
  const uiPotions     = uiInventory.filter(i =>  potionSet.has(i.type));

  const dayPct   = isNight ? Math.round((dayProgress - 0.5) * 200) : Math.round(dayProgress * 200);
  const timeLabel = isNight ? `🌙 Night ${dayPct}%` : `☀️ Day ${dayPct}%`;

  return (
    <div className="fixed inset-0 bg-slate-900">
      <canvas ref={canvasRef} className="border-2 border-purple-600 rounded-lg" />

      {/* HUD */}
      <div className="absolute top-4 left-4 bg-slate-900/85 rounded-xl p-3 text-white text-sm space-y-0.5 pointer-events-none select-none">
        <div className="text-yellow-400 font-bold text-base">⭐ {score}</div>
        <div>{timeLabel}</div>
        {weather === 'rainy'  && <div>🌧️ Raining</div>}
        {weather === 'stormy' && <div>⛈️ Storm!</div>}
        {weather === 'cloudy' && <div>☁️ Cloudy</div>}
      </div>

      {/* Active effects */}
      {activeEffectNames.length > 0 && (
        <div className="absolute top-4 right-4 bg-slate-900/85 rounded-xl p-2 text-white text-xs space-y-1 pointer-events-none select-none">
          {activeEffectNames.map(e => (
            <div key={e}>
              {e === 'speed'        && '⚡ Speed Boost'}
              {e === 'glow'         && '✨ Glow Vision'}
              {e === 'rain'         && '🌧️ Rain Dance'}
              {e === 'growth'       && '🌱 Fast Growth'}
              {e === 'sleep'        && '😴 NPCs Asleep'}
              {e === 'double_score' && '🧚 Double Score'}
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        {notifications.slice(-4).map(n => (
          <div key={n.id} className={`px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg backdrop-blur ${
            n.type === 'success' ? 'bg-green-700/90' :
            n.type === 'warning' ? 'bg-yellow-600/90' :
            n.type === 'event'   ? 'bg-purple-700/90' :
            'bg-blue-700/90'
          }`}>
            {n.message}
          </div>
        ))}
      </div>

      {/* Inventory */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col gap-1 items-center pointer-events-auto">
        {uiPotions.length > 0 && (
          <div className="flex gap-1 bg-slate-900/90 rounded-xl px-2 py-1 border border-purple-500/40">
            {uiPotions.map(item => {
              const def = POTION_RECIPES.find(p => p.type === item.type);
              if (!def) return null;
              return (
                <button key={item.type} onClick={() => handleUsePotion(item.type as PotionType)}
                  title={def.description}
                  className="flex flex-col items-center bg-purple-900 hover:bg-purple-700 rounded-lg px-2 py-1 min-w-[52px] transition">
                  <span className="text-xl">{def.emoji}</span>
                  <span className="text-white text-[10px]">{def.name.split(' ')[0]}</span>
                  <span className="text-purple-300 text-[10px] font-bold">x{item.quantity}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-1 bg-slate-900/90 rounded-xl px-2 py-1 border border-purple-500/60 min-w-[200px] justify-center">
          {uiIngredients.length === 0
            ? <span className="text-slate-400 text-xs px-2 py-1">Walk near ingredients to collect!</span>
            : uiIngredients.map(item => {
                const def = INGREDIENT_DEFS[item.type as IngredientType];
                if (!def) return null;
                return (
                  <div key={item.type} title={def.description}
                    className="flex flex-col items-center bg-slate-800 rounded-lg px-2 py-1 min-w-[50px]">
                    <span className="text-xl">{def.emoji}</span>
                    <span className="text-white text-[10px]">{def.name.split(' ')[0]}</span>
                    <span className="text-yellow-400 text-[10px] font-bold">x{item.quantity}</span>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Crafting menu */}
      {showCrafting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto">
          <div className="bg-slate-900 border border-purple-500 rounded-2xl p-6 w-[620px] max-h-[85vh] overflow-y-auto shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-4 text-center">✨ Cauldron Crafting ✨</h2>

            <div className="mb-4">
              <p className="text-slate-400 text-xs mb-1">Selected for brew:</p>
              <div className="flex gap-2 flex-wrap min-h-[40px] bg-slate-800 rounded-lg p-2">
                {selectedBrew.map((type, i) => {
                  const def = INGREDIENT_DEFS[type];
                  return (
                    <span key={i} className="bg-purple-700 text-white rounded-full px-3 py-1 text-xs flex items-center gap-1">
                      {def.emoji} {def.name}
                      <button onClick={() => setSelectedBrew(prev => { const a = [...prev]; a.splice(i, 1); return a; })}
                        className="ml-1 text-purple-300 hover:text-white">×</button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-slate-400 text-xs mb-1">Your ingredients:</p>
              <div className="flex gap-2 flex-wrap">
                {uiIngredients.map(item => {
                  const def = INGREDIENT_DEFS[item.type as IngredientType];
                  if (!def) return null;
                  const sel = selectedBrew.filter(t => t === item.type).length;
                  return (
                    <button key={item.type} disabled={sel >= item.quantity}
                      onClick={() => setSelectedBrew(prev => [...prev, item.type as IngredientType])}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                        sel > 0 ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      } disabled:opacity-40`}>
                      {def.emoji} {def.name} ({item.quantity - sel} left)
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-slate-400 text-xs mb-2">Known recipes:</p>
              <div className="grid grid-cols-2 gap-2">
                {POTION_RECIPES.map(r => {
                  const canBrew = hasIngredients(uiInventory, r.recipe);
                  return (
                    <div key={r.type} className={`p-3 rounded-xl border ${
                      canBrew ? 'border-green-500 bg-slate-800' : 'border-slate-600 bg-slate-800/50 opacity-60'
                    }`}>
                      <div className="text-white font-semibold text-sm">{r.emoji} {r.name}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{r.description}</div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {r.recipe.map((t, i) => (
                          <span key={i} className="text-[10px] bg-slate-700 text-slate-300 rounded px-1.5 py-0.5">
                            {INGREDIENT_DEFS[t].emoji} {INGREDIENT_DEFS[t].name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={handleBrew} disabled={selectedBrew.length < 2}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2 px-8 rounded-xl transition">
                ✨ Brew Potion!
              </button>
              <button onClick={handleCloseCrafting}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-8 rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-game banner */}
      {miniGameUI && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className={`text-center font-bold text-lg px-6 py-2 rounded-xl shadow-lg ${
            miniGameUI.timeLeft < 5 ? 'bg-red-700/90 text-white animate-pulse' : 'bg-amber-600/90 text-white'
          }`}>
            🍄 INGREDIENT RUSH — {miniGameUI.timeLeft}s — +{miniGameUI.score} pts
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-28 right-4 text-slate-500 text-[11px] text-right pointer-events-none select-none leading-relaxed">
        Click to move witch<br />
        Walk near ingredients to collect<br />
        Click cauldron / well / NPCs to interact<br />
        Click potions in inventory to use them
      </div>
    </div>
  );
}
