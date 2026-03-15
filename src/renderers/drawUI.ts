// Canvas draw functions for UI overlays (inventory, HUD, brewing panel, messages)

import type { GameState, IngredientType, PotionType, ActiveEffect } from '@/game/types';
import { INGREDIENT_DEFS, POTION_RECIPES } from '@/game/constants';

// ─── Score & HUD ──────────────────────────────────────────────────────────────

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
): void {
  ctx.save();
  // Score box
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(width - 130, 8, 122, 32);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`⭐ ${state.score}`, width - 12, 30);

  // Active potion timers (top-left)
  let ey = 12;
  for (const effect of state.activePotions) {
    const recipe = POTION_RECIPES.find((r) => r.id === effect.type);
    if (!recipe) continue;
    const barW = 110;
    const pct = effect.remaining / recipe.duration;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(8, ey, barW + 4, 22);
    ctx.fillStyle = recipe.color;
    ctx.fillRect(10, ey + 2, barW * pct, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`✨ ${recipe.name}`, 14, ey + 15);
    ey += 26;
  }

  ctx.restore();
}

// ─── Message Banner ───────────────────────────────────────────────────────────

export function drawMessage(
  ctx: CanvasRenderingContext2D,
  msg: GameState['message'],
  width: number,
  height: number,
): void {
  if (!msg) return;
  const alpha = Math.min(1, msg.timer / 500);
  ctx.save();
  ctx.globalAlpha = alpha;
  const textW = Math.min(width - 40, 560);
  const textX = (width - textW) / 2;
  const textY = height * 0.12;
  ctx.fillStyle = 'rgba(15,10,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(textX, textY, textW, 44, 12);
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f0e6ff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(msg.text, width / 2, textY + 28, textW - 20);
  ctx.restore();
}

// ─── Inventory Bar ────────────────────────────────────────────────────────────

const SLOT_SIZE = 56;
const SLOT_GAP = 8;
const INGREDIENT_ORDER: IngredientType[] = [
  'redMushroom', 'blueMushroom', 'crystal', 'herb', 'starDust', 'essence',
];

export function drawInventory(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
): void {
  const totalW = INGREDIENT_ORDER.length * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
  const startX = (width - totalW) / 2;
  const y = height - SLOT_SIZE - 12;

  ctx.save();

  // Background bar
  ctx.fillStyle = 'rgba(15,10,40,0.75)';
  ctx.beginPath();
  ctx.roundRect(startX - 12, y - 8, totalW + 24, SLOT_SIZE + 22, 14);
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INVENTORY', width / 2, y - 12 + 7);

  for (let i = 0; i < INGREDIENT_ORDER.length; i++) {
    const type = INGREDIENT_ORDER[i];
    const def = INGREDIENT_DEFS[type];
    const count = state.inventory[type] ?? 0;
    const sx = startX + i * (SLOT_SIZE + SLOT_GAP);

    // Slot background
    ctx.fillStyle = count > 0 ? 'rgba(60,30,80,0.9)' : 'rgba(30,15,50,0.7)';
    ctx.strokeStyle = count > 0 ? def.color : '#4c1d95';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sx, y, SLOT_SIZE, SLOT_SIZE, 8);
    ctx.fill();
    ctx.stroke();

    // Ingredient icon (small)
    if (count > 0) {
      drawSmallIngredientIcon(ctx, sx + SLOT_SIZE / 2, y + SLOT_SIZE / 2 - 4, type);
    } else {
      ctx.fillStyle = def.color + '44';
      drawSmallIngredientIcon(ctx, sx + SLOT_SIZE / 2, y + SLOT_SIZE / 2 - 4, type);
    }

    // Count badge
    if (count > 0) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${count}`, sx + SLOT_SIZE - 4, y + SLOT_SIZE - 4);
    }

    // Name label
    ctx.fillStyle = count > 0 ? '#e9d5ff' : '#6b21a8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.name.replace(' ', '\n'), sx + SLOT_SIZE / 2, y + SLOT_SIZE + 10);
  }

  ctx.restore();
}

function drawSmallIngredientIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: IngredientType,
): void {
  const def = INGREDIENT_DEFS[type];
  const r = 10;
  ctx.save();
  ctx.fillStyle = def.color;
  switch (type) {
    case 'redMushroom':
    case 'blueMushroom':
      ctx.fillRect(x - r * 0.25, y, r * 0.5, r * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case 'crystal':
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.5, y + r * 0.5);
      ctx.lineTo(x - r * 0.5, y + r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'herb':
      ctx.beginPath();
      ctx.ellipse(x - r * 0.4, y - r * 0.1, r * 0.55, r * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + r * 0.4, y - r * 0.1, r * 0.55, r * 0.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'starDust': {
      const pts = 5;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const ang = (-Math.PI / 2) + (Math.PI * i) / pts;
        const rad = i % 2 === 0 ? r : r * 0.45;
        if (i === 0) ctx.moveTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
        else ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'essence':
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

// ─── Potions Bar ──────────────────────────────────────────────────────────────

export function drawPotionsBar(
  ctx: CanvasRenderingContext2D,
  potions: PotionType[],
  width: number,
  height: number,
): void {
  if (potions.length === 0) return;
  const pSize = 44;
  const pGap = 6;
  const totalW = potions.length * (pSize + pGap) - pGap;
  const startX = width - totalW - 16;
  const y = height - pSize - 80;

  ctx.save();
  ctx.fillStyle = 'rgba(15,10,40,0.7)';
  ctx.beginPath();
  ctx.roundRect(startX - 10, y - 20, totalW + 20, pSize + 30, 10);
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#c4b5fd';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POTIONS (click U)', startX + totalW / 2, y - 6);

  for (let i = 0; i < potions.length; i++) {
    const pt = potions[i];
    const recipe = POTION_RECIPES.find((r) => r.id === pt);
    if (!recipe) continue;
    const px = startX + i * (pSize + pGap);
    // Bottle bg
    ctx.fillStyle = 'rgba(60,20,80,0.85)';
    ctx.strokeStyle = recipe.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, y, pSize, pSize, 8);
    ctx.fill();
    ctx.stroke();
    // Bottle body
    drawPotionBottle(ctx, px + pSize / 2, y + pSize / 2, recipe.color, pSize * 0.35);
    // Index label
    ctx.fillStyle = '#fef9c3';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}`, px + 4, y + 14);
  }
  ctx.restore();
}

function drawPotionBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  r: number,
): void {
  ctx.fillStyle = color;
  // Body
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r * 0.75, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck
  ctx.fillStyle = color + 'bb';
  ctx.fillRect(x - r * 0.25, y - r * 0.8, r * 0.5, r * 0.6);
  // Cork
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(x - r * 0.2, y - r * 1.1, r * 0.4, r * 0.35);
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.1, r * 0.2, r * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Brewing Panel ────────────────────────────────────────────────────────────

export function drawBrewingPanel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
): void {
  if (!state.showBrewingUI) return;

  const panelW = Math.min(560, width - 40);
  const panelH = 340;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(10,5,30,0.93)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 18);
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Title
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ Cauldron Recipes ✨', width / 2, panelY + 30);

  // Close hint
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.fillText('Press B or ESC to close', width / 2, panelY + 46);

  const colW = panelW / 3;
  for (let i = 0; i < POTION_RECIPES.length; i++) {
    const recipe = POTION_RECIPES[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const rx = panelX + col * colW + 12;
    const ry = panelY + 58 + row * 130;
    const rw = colW - 24;
    const rh = 120;

    // Can brew?
    const canBrew = canBrewCheck(state.inventory, recipe.ingredients);
    ctx.fillStyle = canBrew ? 'rgba(50,20,80,0.9)' : 'rgba(20,10,30,0.7)';
    ctx.strokeStyle = canBrew ? recipe.color : '#4c1d95';
    ctx.lineWidth = canBrew ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 10);
    ctx.fill();
    ctx.stroke();

    // Recipe name
    ctx.fillStyle = canBrew ? '#f0e6ff' : '#6b21a8';
    ctx.font = `bold 12px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(recipe.name, rx + rw / 2, ry + 18);

    // Ingredients needed
    const ingStr = Object.entries(recipe.ingredients)
      .map(([t, n]) => `${n}x ${INGREDIENT_DEFS[t as IngredientType].name}`)
      .join(', ');
    ctx.fillStyle = '#a78bfa';
    ctx.font = '10px sans-serif';
    ctx.fillText(ingStr, rx + rw / 2, ry + 34, rw - 10);

    // Have / need
    for (const [t, n] of Object.entries(recipe.ingredients) as [IngredientType, number][]) {
      const have = state.inventory[t] ?? 0;
      // drawn inline above
      void (n + have); // suppress TS
    }

    // Key hint
    ctx.fillStyle = canBrew ? '#facc15' : '#4c1d95';
    ctx.font = `bold 13px sans-serif`;
    ctx.fillText(canBrew ? `Press ${i + 1} to brew!` : 'Need more ingredients', rx + rw / 2, ry + 52);

    // Description
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9.5px sans-serif';
    // Word-wrap description
    const words = recipe.description.split(' ');
    let line = '';
    let lineY = ry + 70;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > rw - 10) {
        ctx.fillText(line, rx + rw / 2, lineY);
        line = word;
        lineY += 13;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, rx + rw / 2, lineY);
  }

  ctx.restore();
}

function canBrewCheck(
  inventory: GameState['inventory'],
  ingredients: Record<string, number>,
): boolean {
  for (const [t, n] of Object.entries(ingredients)) {
    if ((inventory[t as IngredientType] ?? 0) < n) return false;
  }
  return true;
}

// ─── Magic Garden Indicator ───────────────────────────────────────────────────

export function drawMagicGardenIndicator(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
): void {
  if (!state.magicGardenActive) return;
  const progress = state.magicGardenTimer / 25000;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 80, 130, 20);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(10, 82, 126 * progress, 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌱 Magic Garden', 14, 94);
  ctx.restore();
}
