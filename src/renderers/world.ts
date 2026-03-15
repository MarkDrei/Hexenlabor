import type { GameState, WorldIngredient, IngredientType, PotionType } from '@/shared/types';
import { INGREDIENT_DISPLAY } from '@/game/crafting';

export const CAULDRON_WORLD_OFFSET = { dx: -20, dy: 80 };

// ── Ingredient shapes ────────────────────────────────────────────────────────

function drawIngredientShape(
  ctx: CanvasRenderingContext2D,
  type: IngredientType,
  x: number,
  y: number,
  glow: number
): void {
  ctx.save();

  // Glow aura
  const info = INGREDIENT_DISPLAY[type];
  ctx.shadowColor = info.color;
  ctx.shadowBlur = 12 + glow * 6;

  switch (type) {
    case 'red_mushroom':
      drawMushroom(ctx, x, y, '#ef4444', '#fee2e2');
      break;
    case 'blue_mushroom':
      drawMushroom(ctx, x, y, '#3b82f6', '#dbeafe');
      break;
    case 'herbs':
      drawHerbs(ctx, x, y);
      break;
    case 'fern':
      drawFern(ctx, x, y);
      break;
    case 'crystal':
      drawCrystal(ctx, x, y);
      break;
    case 'stardust':
      drawStar(ctx, x, y, '#eab308', 12);
      break;
    case 'fairy_dust':
      drawStar(ctx, x, y, '#ec4899', 10);
      break;
    case 'water':
      drawWater(ctx, x, y);
      break;
    case 'magic_flower':
      drawMagicFlower(ctx, x, y);
      break;
  }
  ctx.restore();
}

function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  capColor: string,
  dotColor: string
): void {
  // Stem
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 8, 10, 14, 2);
  ctx.fill();
  // Cap
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.arc(x, y - 14, 14, Math.PI, 0);
  ctx.fill();
  // Dots
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(x - 4, y - 16, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5, y - 18, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHerbs(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#22c55e';
  const leaves = [
    { ox: -6, oy: -12, r: 6, a: -0.4 },
    { ox: 4, oy: -15, r: 7, a: 0.3 },
    { ox: 0, oy: -20, r: 5, a: 0 },
  ];
  for (const l of leaves) {
    ctx.save();
    ctx.translate(x + l.ox, y + l.oy);
    ctx.rotate(l.a);
    ctx.beginPath();
    ctx.ellipse(0, 0, l.r * 0.5, l.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 20);
  ctx.stroke();
}

function drawFern(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#4ade80';
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + ((i - 2) * Math.PI) / 8;
    const len = 12 - Math.abs(i - 2) * 2;
    ctx.save();
    ctx.translate(x, y - 5);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -len / 2, 4, len / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#a855f7';
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x + 8, y - 10);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x - 6, y);
  ctx.lineTo(x - 8, y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 18);
  ctx.lineTo(x + 2, y - 14);
  ctx.lineTo(x - 2, y - 10);
  ctx.closePath();
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const points = 5;
  const outer = size;
  const inner = size * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.bezierCurveTo(x + 10, y - 10, x + 10, y, x, y);
  ctx.bezierCurveTo(x - 10, y, x - 10, y - 10, x, y - 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 12, 2, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMagicFlower(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const petalColors = ['#f472b6', '#a855f7', '#f472b6', '#c084fc', '#fb7185'];
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.fillStyle = petalColors[i];
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(a) * 8,
      y - 10 + Math.sin(a) * 8,
      5,
      8,
      a,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(x, y - 10, 5, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y);
  ctx.stroke();
}

// ── World drawing functions ──────────────────────────────────────────────────

export function drawWorldIngredients(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
): void {
  for (const ing of state.worldIngredients) {
    if (ing.collected) continue;
    const bob = Math.sin(time * 0.003 + ing.x * 0.1) * 4;
    const glow = (Math.sin(time * 0.004 + ing.y * 0.07) + 1) * 0.5;
    drawIngredientShape(ctx, ing.type, ing.x, ing.y + bob, glow);
  }
}

export function drawButterflies(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number
): void {
  if (state.miniGame.type !== 'butterfly') return;
  const wingColors = ['#ec4899', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  for (let i = 0; i < state.miniGame.butterflies.length; i++) {
    const bf = state.miniGame.butterflies[i];
    if (bf.caught) continue;
    const color = wingColors[i % wingColors.length];
    const flapAngle = Math.sin(time * 0.015 + bf.phase) * 0.7;
    ctx.save();
    ctx.translate(bf.x, bf.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Left wing
    ctx.fillStyle = color;
    ctx.save();
    ctx.rotate(flapAngle);
    ctx.beginPath();
    ctx.ellipse(-8, 0, 10, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.beginPath();
    ctx.ellipse(8, 0, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawFallingStars(
  ctx: CanvasRenderingContext2D,
  state: GameState
): void {
  if (state.miniGame.type !== 'stars') return;

  for (const star of state.miniGame.fallingStars) {
    if (star.caught) continue;
    if (star.y > state.canvasHeight + 20) continue;

    // Trail
    ctx.save();
    for (let t = 0; t < star.trail.length; t++) {
      const trailPoint = star.trail[t];
      const alpha = (t / star.trail.length) * 0.5;
      ctx.fillStyle = `rgba(250,204,21,${alpha})`;
      ctx.beginPath();
      ctx.arc(trailPoint.x, trailPoint.y, 2 + (t / star.trail.length) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = '#fde68a';
    ctx.shadowBlur = 16;
    ctx.restore();

    drawStar(ctx, star.x, star.y, '#fde68a', 14);
  }
}

export function drawCauldronEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cauldronX: number,
  cauldronY: number,
  time: number
): void {
  if (!state.cauldron.brewing && !state.cauldron.isOpen) return;

  const pulseAlpha = ((Math.sin(time * 0.006) + 1) / 2) * 0.4 + 0.2;

  // Glow ring
  ctx.save();
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `rgba(167,139,250,${pulseAlpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cauldronX, cauldronY, 32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Bubbles
  if (state.cauldron.brewing) {
    ctx.save();
    for (const b of state.cauldron.bubbles) {
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle = `rgba(167,139,250,${b.alpha})`;
      ctx.beginPath();
      ctx.arc(cauldronX + b.x, cauldronY + b.y - 10, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawActionPrompt(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  ctx.save();
  ctx.font = 'bold 13px sans-serif';
  const tw = ctx.measureText(text).width;
  const px = x - tw / 2 - 8;
  const py = y - 20;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(px, py, tw + 16, 22, 5);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 3);
  ctx.restore();
}

/** One star per this many screen pixels for a balanced night sky density */
const SCREEN_AREA_PER_STAR = 10000;

export function drawNightStars(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  time: number
): void {
  if (!state.isNight) return;
  const numStars = Math.floor(width * height / SCREEN_AREA_PER_STAR);
  ctx.save();
  for (let i = 0; i < numStars; i++) {
    const sx = (Math.sin(i * 123.4) * 0.5 + 0.5) * width;
    const sy = (Math.cos(i * 321.7) * 0.5 + 0.5) * height * 0.55;
    const twinkle = (Math.sin(time * 0.002 + i) * 0.5 + 0.5) * 0.8 + 0.2;
    ctx.globalAlpha = twinkle * 0.85;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(sx, sy, (Math.sin(i * 456.7) * 0.5 + 0.5) * 1.5 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function getIngredientAt(
  state: GameState,
  clickX: number,
  clickY: number,
  radius = 28
): WorldIngredient | null {
  for (const ing of state.worldIngredients) {
    if (ing.collected) continue;
    const dist = Math.hypot(ing.x - clickX, ing.y - clickY);
    if (dist < radius) return ing;
  }
  return null;
}

export function getPotionIconAt(
  x: number,
  y: number,
  width: number,
  height: number,
  potions: Partial<Record<PotionType, number>>
): PotionType | null {
  const BAR_H = 70;
  const barY = height - BAR_H - 6;
  let px = width * 0.6 + 70;
  const potionTypes = Object.keys(potions) as PotionType[];
  for (const type of potionTypes) {
    if ((potions[type] ?? 0) === 0) continue;
    if (x >= px && x <= px + 46 && y >= barY + 10 && y <= barY + 58) {
      return type;
    }
    px += 52;
  }
  return null;
}
