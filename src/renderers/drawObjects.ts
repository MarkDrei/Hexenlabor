// Canvas draw functions for world game objects

import type {
  IngredientInstance,
  CauldronState,
  Particle,
  FloatingText,
  FallingIngredient,
  Firefly,
  GameEvent,
  NPC,
  IngredientType,
} from '@/game/types';
import { INGREDIENT_DEFS } from '@/game/constants';

// ─── Ingredient Drawing ───────────────────────────────────────────────────────

export function drawIngredient(
  ctx: CanvasRenderingContext2D,
  ing: IngredientInstance,
  time: number,
): void {
  const def = INGREDIENT_DEFS[ing.type];
  const bob = Math.sin(time * 0.002 + ing.bobPhase) * 4;
  const r = 14 * ing.scale;
  const x = ing.x;
  const y = ing.y + bob;

  ctx.save();

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  glow.addColorStop(0, def.glowColor + 'aa');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fill();

  switch (ing.type) {
    case 'redMushroom':
    case 'blueMushroom':
      drawMushroom(ctx, x, y, r, def.color);
      break;
    case 'crystal':
      drawCrystal(ctx, x, y, r, def.color);
      break;
    case 'herb':
      drawHerb(ctx, x, y, r, def.color);
      break;
    case 'starDust':
      drawStar(ctx, x, y, r, def.color, time);
      break;
    case 'essence':
      drawEssence(ctx, x, y, r, def.color, time);
      break;
  }

  ctx.restore();
}

function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  // Stem
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(x - r * 0.3, y - r * 0.4, r * 0.6, r * 0.8);
  // Cap
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r, Math.PI, Math.PI * 2);
  ctx.fill();
  // Dots
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.6, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 0.25, y - r * 0.8, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.6, y - r * 0.2);
  ctx.lineTo(x + r * 0.4, y + r * 0.8);
  ctx.lineTo(x - r * 0.4, y + r * 0.8);
  ctx.lineTo(x - r * 0.6, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.8);
  ctx.lineTo(x + r * 0.2, y - r * 0.1);
  ctx.lineTo(x - r * 0.1, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawHerb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  // Stem
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y - r * 0.3);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.6, y - r * 0.1, r * 0.7, r * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.6, y - r * 0.3, r * 0.7, r * 0.35, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Top leaf
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.7, r * 0.45, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  time: number,
): void {
  const rot = time * 0.003;
  const points = 5;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = rot + (i * Math.PI) / points;
    const radius = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEssence(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  time: number,
): void {
  const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  for (let i = 3; i >= 1; i--) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * i);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Core
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Cauldron Drawing ─────────────────────────────────────────────────────────

export function drawCauldron(
  ctx: CanvasRenderingContext2D,
  cauldron: CauldronState,
  isNear: boolean,
  time: number,
): void {
  const { x, y, liquidColor, brewing } = cauldron;
  const r = 38;

  // Glow ring when near
  if (isNear) {
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, r, x, y, r + 30);
    glow.addColorStop(0, 'rgba(250,204,21,0.5)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r + 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cauldron body
  ctx.save();
  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y + 10, r, 0, Math.PI);
  ctx.lineTo(x - r, y + 10);
  ctx.arc(x, y + 10, r, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Legs
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y + 10 + r * 0.9);
  ctx.lineTo(x - r * 0.8, y + 10 + r * 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, y + 10 + r * 0.9);
  ctx.lineTo(x + r * 0.8, y + 10 + r * 1.3);
  ctx.stroke();

  // Rim
  ctx.fillStyle = '#292524';
  ctx.strokeStyle = '#57534e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, r + 4, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Liquid surface
  const phase = cauldron.bubblePhase;
  const liqY = y + 6;
  ctx.fillStyle = liquidColor;
  ctx.beginPath();
  ctx.ellipse(x, liqY, r - 8, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bubbles on surface
  const bubbleColors = ['rgba(255,255,255,0.6)', liquidColor];
  for (let i = 0; i < 4; i++) {
    const bx = x + Math.sin(phase * 1.5 + i * 1.5) * (r - 18);
    const by = liqY - 4 + Math.sin(phase * 2 + i) * 3;
    const br = 3 + Math.sin(phase + i * 0.8) * 2;
    ctx.fillStyle = bubbleColors[i % 2];
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rising steam
  for (let i = 0; i < 3; i++) {
    const sx = x + (i - 1) * 14;
    const steamAlpha = (0.4 + Math.sin(phase * 2 + i) * 0.2) * (brewing ? 1.5 : 1);
    ctx.strokeStyle = `rgba(200,200,255,${Math.min(steamAlpha, 0.8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, liqY - 8);
    ctx.bezierCurveTo(
      sx + 8, liqY - 20,
      sx - 8, liqY - 32,
      sx + 4 * Math.sin(phase + i), liqY - 45,
    );
    ctx.stroke();
  }

  // Handle (arc over top)
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y - 2, r * 0.6, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // "Brew" hint
  if (isNear) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Press B to brew ✨', x, y - r - 16);
  }

  ctx.restore();
}

// ─── NPC Drawing helpers ──────────────────────────────────────────────────────

export function drawNPCGreeting(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  name: string,
): void {
  if (!npc.greeting) return;
  ctx.save();
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const w = ctx.measureText(npc.greeting).width + 16;
  ctx.fillRect(npc.x - w / 2, npc.y - 78, w, 22);
  ctx.fillStyle = '#fef9c3';
  ctx.textAlign = 'center';
  ctx.fillText(npc.greeting, npc.x, npc.y - 62);
  ctx.restore();
}

// ─── Particles ────────────────────────────────────────────────────────────────

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Floating Texts ───────────────────────────────────────────────────────────

export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  texts: FloatingText[],
): void {
  ctx.save();
  for (const ft of texts) {
    const alpha = Math.min(1, ft.life / 600);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Event Objects ────────────────────────────────────────────────────────────

export function drawFallingIngredient(
  ctx: CanvasRenderingContext2D,
  fi: FallingIngredient,
  time: number,
): void {
  ctx.save();
  ctx.translate(fi.x, fi.y);
  ctx.rotate(fi.spin * time * 0.05);
  const fake: IngredientInstance = {
    id: fi.id,
    type: fi.type,
    x: 0,
    y: 0,
    collected: false,
    bobPhase: 0,
    scale: 1.1,
  };
  drawIngredient(ctx, fake, time);
  ctx.restore();
}

export function drawFirefly(
  ctx: CanvasRenderingContext2D,
  ff: Firefly,
  time: number,
): void {
  if (ff.caught) return;
  const brightness = 0.5 + Math.sin(time * 0.004 + ff.phase) * 0.5;
  ctx.save();
  ctx.globalAlpha = brightness;
  // Glow
  const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, 20);
  glow.addColorStop(0, '#fef08a');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ff.x, ff.y, 20, 0, Math.PI * 2);
  ctx.fill();
  // Core
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(ff.x, ff.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Event Overlay Banner ─────────────────────────────────────────────────────

export function drawEventBanner(
  ctx: CanvasRenderingContext2D,
  event: GameEvent,
  width: number,
  time: number,
): void {
  const progress = event.timer / event.duration;
  let title = '';
  switch (event.type) {
    case 'ingredientRain': title = '🌧️ Ingredient Rain! Click to collect!'; break;
    case 'fireflyDance':   title = '🌟 Firefly Dance! Click fireflies!'; break;
    case 'magicGarden':    title = '🌱 Magic Garden Active!'; break;
    case 'catGift':        title = '🐱 Cat has a gift!'; break;
    case 'monsterSurprise': title = '🦕 Monster Surprise!'; break;
  }
  // Banner
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, width, 38);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 24);
  // Timer bar
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(0, 34, width * progress, 4);
  ctx.restore();
}
