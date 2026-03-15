import type { GameState, IngredientType, PotionType } from '@/shared/types';
import { RECIPES, INGREDIENT_DISPLAY, POTION_NAMES } from '@/game/crafting';

const PANEL_BG = 'rgba(30, 15, 50, 0.88)';
const PANEL_BORDER = '#7c3aed';
const PANEL_ACCENT = '#a855f7';
const TEXT_MAIN = '#f3e8ff';
const TEXT_DIM = '#c4b5fd';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  strokeWidth = 2
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  _height: number
): void {
  // Top HUD bar
  roundRect(ctx, 8, 6, width - 16, 42, 8, PANEL_BG, PANEL_BORDER);

  ctx.font = 'bold 16px serif';
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'left';
  ctx.fillText(`✨ Score: ${state.score}`, 20, 33);

  ctx.fillStyle = TEXT_MAIN;
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText(`☀ Day ${state.day}`, width / 2, 33);

  // Time-of-day indicator
  const tod = state.timeOfDay;
  let timeLabel = '';
  let timeColor = '#f59e0b';
  if (tod < 0.15) { timeLabel = '🌙 Dawn'; timeColor = '#818cf8'; }
  else if (tod < 0.4) { timeLabel = '☀ Morning'; timeColor = '#fbbf24'; }
  else if (tod < 0.55) { timeLabel = '🌤 Afternoon'; timeColor = '#fb923c'; }
  else if (tod < 0.65) { timeLabel = '🌅 Dusk'; timeColor = '#f97316'; }
  else { timeLabel = '🌙 Night'; timeColor = '#818cf8'; }

  ctx.fillStyle = timeColor;
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'right';
  ctx.fillText(timeLabel, width - 20, 33);

  // Active effects
  let effectX = width / 2 + 80;
  for (const eff of state.activeEffects) {
    const secs = Math.ceil(eff.timeLeft / 1000);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '12px serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${POTION_NAMES[eff.type]} ${secs}s`, effectX, 33);
    effectX += 140;
  }
}

export function drawInventoryBar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
): void {
  const BAR_H = 70;
  const barY = height - BAR_H - 6;
  roundRect(ctx, 8, barY, width - 16, BAR_H, 8, PANEL_BG, PANEL_BORDER);

  ctx.font = 'bold 11px serif';
  ctx.fillStyle = TEXT_DIM;
  ctx.textAlign = 'left';
  ctx.fillText('INGREDIENTS:', 18, barY + 16);

  let ix = 110;
  const ingredientTypes = Object.keys(INGREDIENT_DISPLAY) as IngredientType[];
  for (const type of ingredientTypes) {
    const count = state.inventory[type] ?? 0;
    if (count === 0) continue;
    const info = INGREDIENT_DISPLAY[type];
    drawIngredientIcon(ctx, ix, barY + 10, info.color, info.emoji, count);
    ix += 52;
    if (ix > width * 0.55) break;
  }

  // Potions
  ctx.fillStyle = TEXT_DIM;
  ctx.font = 'bold 11px serif';
  ctx.textAlign = 'left';
  ctx.fillText('POTIONS:', width * 0.6, barY + 16);

  let px = width * 0.6 + 70;
  const potionTypes = Object.keys(POTION_NAMES) as PotionType[];
  for (const type of potionTypes) {
    const count = state.potions[type] ?? 0;
    if (count === 0) continue;
    drawPotionIcon(ctx, px, barY + 10, type, count);
    px += 52;
    if (px > width - 20) break;
  }

  // Click hint
  ctx.fillStyle = 'rgba(167,139,250,0.6)';
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('(click potions to use)', width / 2, barY + BAR_H - 6);
}

function drawIngredientIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  emoji: string,
  count: number
): void {
  roundRect(ctx, x, y, 46, 48, 6, 'rgba(0,0,0,0.4)', color, 1.5);
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(emoji, x + 23, y + 28);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`×${count}`, x + 23, y + 44);
}

export function drawPotionIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: PotionType,
  count: number
): void {
  const colors: Record<PotionType, string> = {
    speed_potion: '#ef4444',
    night_potion: '#3b82f6',
    grow_potion: '#22c55e',
    luck_potion: '#f59e0b',
    friendship_potion: '#ec4899',
    flying_potion: '#a855f7',
    rainbow_potion: '#f472b6',
    invisibility_potion: '#9ca3af',
  };
  const emojis: Record<PotionType, string> = {
    speed_potion: '🔴',
    night_potion: '🔵',
    grow_potion: '🟢',
    luck_potion: '🟡',
    friendship_potion: '💗',
    flying_potion: '🟣',
    rainbow_potion: '🌈',
    invisibility_potion: '⚫',
  };
  roundRect(ctx, x, y, 46, 48, 6, 'rgba(0,0,0,0.4)', colors[type] ?? '#888', 1.5);
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(emojis[type] ?? '🧪', x + 23, y + 28);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`×${count}`, x + 23, y + 44);
}

export function drawCauldronUI(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
): void {
  if (!state.cauldron.isOpen) return;

  const panelW = Math.min(600, width - 40);
  const panelH = Math.min(420, height - 100);
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2 - 20;

  roundRect(ctx, px, py, panelW, panelH, 12, 'rgba(20, 8, 40, 0.96)', PANEL_BORDER, 3);

  ctx.fillStyle = PANEL_ACCENT;
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🧪 Cauldron — Mix Ingredients', width / 2, py + 30);

  // Current mix
  ctx.fillStyle = TEXT_DIM;
  ctx.font = '13px serif';
  ctx.textAlign = 'left';
  ctx.fillText('Current Mix:', px + 16, py + 56);

  const mix = state.cauldron.selectedIngredients;
  let mx = px + 100;
  for (const ing of mix) {
    const info = INGREDIENT_DISPLAY[ing];
    ctx.font = '20px serif';
    ctx.fillStyle = info.color;
    ctx.fillText(info.emoji, mx, py + 60);
    mx += 28;
  }
  if (mix.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px serif';
    ctx.fillText('(none)', px + 100, py + 56);
  }

  // Clear button
  roundRect(ctx, px + panelW - 90, py + 44, 78, 24, 5, 'rgba(80,20,20,0.8)', '#ef4444');
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Clear', px + panelW - 51, py + 60);

  // Available ingredients
  ctx.fillStyle = TEXT_DIM;
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'left';
  ctx.fillText('Your Ingredients (click to add):', px + 16, py + 86);

  let ingX = px + 16;
  let ingY = py + 96;
  const ingredientTypes = Object.keys(INGREDIENT_DISPLAY) as IngredientType[];
  for (const type of ingredientTypes) {
    const count = state.inventory[type] ?? 0;
    if (count === 0) continue;
    const info = INGREDIENT_DISPLAY[type];
    roundRect(ctx, ingX, ingY, 50, 52, 6, 'rgba(0,0,0,0.4)', info.color, 1.5);
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(info.emoji, ingX + 25, ingY + 30);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`×${count}`, ingX + 25, ingY + 47);
    ingX += 58;
    if (ingX > px + panelW - 60) {
      ingX = px + 16;
      ingY += 60;
    }
  }

  // Brew button
  const brewable = mix.length > 0;
  const brewBtnX = width / 2 - 55;
  const brewBtnY = py + panelH - 60;
  roundRect(
    ctx,
    brewBtnX,
    brewBtnY,
    110,
    36,
    8,
    brewable ? '#7c3aed' : 'rgba(60,30,90,0.5)',
    brewable ? '#a855f7' : '#555',
    2
  );
  ctx.fillStyle = brewable ? '#e9d5ff' : '#888';
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔮 Brew!', width / 2, brewBtnY + 24);

  // Recipes reference
  ctx.fillStyle = TEXT_DIM;
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'left';
  ctx.fillText('Recipes:', px + panelW - 200, py + 86);
  let ry = py + 102;
  for (const recipe of RECIPES) {
    ctx.fillStyle = 'rgba(200,180,255,0.7)';
    ctx.font = '10px serif';
    const ingList = recipe.ingredients.map((i) => INGREDIENT_DISPLAY[i].emoji).join('+');
    ctx.fillText(`${ingList} → ${recipe.name}`, px + panelW - 200, ry);
    ry += 16;
    if (ry > py + panelH - 70) break;
  }

  // Brewing animation overlay
  if (state.cauldron.brewing) {
    roundRect(ctx, px + 10, py + 10, panelW - 20, panelH - 20, 10, 'rgba(60,0,120,0.7)');
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
    ctx.fillText(`🔮 Brewing${dots}`, width / 2, height / 2);
    const secs = (state.cauldron.brewingTimeLeft / 1000).toFixed(1);
    ctx.font = '16px serif';
    ctx.fillText(`${secs}s`, width / 2, height / 2 + 36);
  }
}

export function drawMessages(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  _width: number,
  _height: number
): void {
  for (const msg of state.messages) {
    const alpha = Math.min(1, msg.timeLeft / 600);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 17px serif';
    ctx.textAlign = 'center';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(msg.text, msg.x + 2, msg.y + 2);
    ctx.fillStyle = msg.color;
    ctx.fillText(msg.text, msg.x, msg.y);
    ctx.restore();
  }
}

export function drawMiniGameUI(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
): void {
  const mg = state.miniGame;
  if (mg.type === null) return;

  // Timer bar at top right
  const secs = Math.ceil(mg.timeLeft / 1000);
  const timerColor = secs <= 5 ? '#ef4444' : '#f59e0b';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = timerColor;
  ctx.fillText(`⏱ ${secs}s`, width - 20, 58);

  // Mini-game score
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 14px serif';
  ctx.fillText(`+${mg.score}`, width - 20, 78);

  if (mg.type === 'memory') {
    drawMemoryOverlay(ctx, state, width, height);
  }
}

function drawMemoryOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
): void {
  // Dark overlay
  ctx.fillStyle = 'rgba(10,5,25,0.75)';
  ctx.fillRect(0, 0, width, height);

  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c4b5fd';
  ctx.fillText('🃏 Memory Match — Find the Pairs!', width / 2, 80);

  for (const card of state.miniGame.memoryCards) {
    if (card.matched) {
      roundRect(ctx, card.x, card.y, card.width, card.height, 8, 'rgba(34,197,94,0.35)', '#22c55e', 2);
      const info = INGREDIENT_DISPLAY[card.ingredient];
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(info.emoji, card.x + card.width / 2, card.y + card.height / 2 + 10);
    } else if (card.flipped) {
      roundRect(ctx, card.x, card.y, card.width, card.height, 8, 'rgba(124,58,237,0.7)', '#a855f7', 2);
      const info = INGREDIENT_DISPLAY[card.ingredient];
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(info.emoji, card.x + card.width / 2, card.y + card.height / 2 + 10);
    } else {
      roundRect(ctx, card.x, card.y, card.width, card.height, 8, 'rgba(30,15,50,0.9)', '#7c3aed', 2);
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7c3aed';
      ctx.fillText('?', card.x + card.width / 2, card.y + card.height / 2 + 10);
    }
  }
}

export function drawGnome(
  ctx: CanvasRenderingContext2D,
  state: GameState
): void {
  if (!state.gnomeActive) return;
  const { gnomeX, gnomeY } = state;

  // Simple gnome shape
  ctx.save();
  // Body
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.ellipse(gnomeX, gnomeY - 20, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(gnomeX, gnomeY - 46, 14, 0, Math.PI * 2);
  ctx.fill();
  // Hat
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(gnomeX - 16, gnomeY - 46);
  ctx.lineTo(gnomeX, gnomeY - 76);
  ctx.lineTo(gnomeX + 16, gnomeY - 46);
  ctx.fill();
  // Speech bubble
  if (state.gnomeSpeech) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const tw = ctx.measureText(state.gnomeSpeech).width + 16;
    roundRect(ctx, gnomeX - tw / 2, gnomeY - 105, tw, 24, 6, 'rgba(255,255,255,0.9)', '#888');
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.gnomeSpeech, gnomeX, gnomeY - 88);
  }
  ctx.restore();
}

export function drawRainbow(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
): void {
  if (!state.rainbowActive) return;
  const alpha = Math.min(1, state.rainbowTimer / 3000) * 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(width / 2, height * 1.1, height * 0.65 - i * 12, Math.PI, 0, false);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRain(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  time: number
): void {
  if (state.rainTimer <= 0) return;
  const alpha = Math.min(0.5, state.rainTimer / 4000);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 1;
  const drops = 60;
  for (let i = 0; i < drops; i++) {
    const rx = ((Math.sin(i * 137.5) * 0.5 + 0.5) * width + time * 0.3 * (1 + (i % 3))) % width;
    const ry = ((Math.cos(i * 97.3) * 0.5 + 0.5) * height + time * 0.5 * (1 + (i % 4))) % height;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 2, ry + 14);
    ctx.stroke();
  }
  ctx.restore();
}
