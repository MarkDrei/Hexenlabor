import {
  Ingredient,
  INGREDIENT_EMOJI,
  INGREDIENT_GLOW_COLOR,
  CollectAnimation,
} from '@/shared/types';

/** Draw a pulsating glow circle */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = radius;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Draw an ingredient as an emoji with glow pulsation */
export function drawIngredientPickup(
  ctx: CanvasRenderingContext2D,
  ingredient: Ingredient,
  fontSize: number,
): void {
  const emoji = INGREDIENT_EMOJI[ingredient.type];
  const color = INGREDIENT_GLOW_COLOR[ingredient.type];
  const pulse = 0.6 + 0.4 * Math.sin(ingredient.glowPhase);
  const { x, y } = ingredient.position;

  ctx.save();
  ctx.globalAlpha = ingredient.opacity;

  // Glow
  drawGlow(ctx, x, y - fontSize * 0.4, color, fontSize * 1.2 * pulse, 0.4 * pulse);

  // Emoji
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slight bob up/down
  const bob = Math.sin(ingredient.glowPhase * 0.7) * 3;
  ctx.fillText(emoji, x, y - fontSize * 0.4 + bob);

  ctx.restore();
}

/** Draw sparkle particles at a position (call for a few frames after collect) */
export function drawSparkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  progress: number,
): void {
  const count = 8;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + progress * 2;
    const dist = 20 + progress * 40;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const size = 3 * (1 - progress);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Per-recipe potion colours used during brewing. */
const POTION_COLORS: Record<string, string> = {
  heiltrank:       '#22c55e',
  schlaftrank:     '#a78bfa',
  liebestrank:     '#ec4899',
  feuertrank:      '#f97316',
  sternenstaub:    '#facc15',
  mondtrank:       '#f59e0b',
  regenbogentrank: '#ffffff', // placeholder – handled separately
  ewigkeitstrank:  '#06b6d4',
};

const RAINBOW_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

function getPotionColor(recipeId: string, index = 0): string {
  if (recipeId === 'regenbogentrank') {
    return RAINBOW_COLORS[index % RAINBOW_COLORS.length];
  }
  return POTION_COLORS[recipeId] ?? '#a78bfa';
}

/** Draw brewing bubbles above the cauldron.
 *  Small cosmetic bubbles rise continuously (colored per recipe).
 *  One large interactive bubble grows and rises per brew step.
 */
export function drawBrewingBubbles(
  ctx: CanvasRenderingContext2D,
  cauldronX: number,
  cauldronY: number,
  bubbleIndex: number,
  bubbleTimer: number,
  bubbleActive: boolean,
  totalBubbles: number,
  phaseProgress: number,
  recipeId: string,
  time: number,
): void {
  const MAX_RISE = 130;
  const MIN_SIZE = 12;
  const MAX_SIZE = 55;
  const DOT_SPACING = 18;
  const DOT_Y_OFFSET = 22;
  const isRainbow = recipeId === 'regenbogentrank';

  // ── Small cosmetic bubbles ────────────────────────────────────────────
  const SMALL_COUNT = 12;
  const SMALL_PERIOD = 70; // frames (brewTimer ticks) per full rise cycle per bubble
  for (let i = 0; i < SMALL_COUNT; i++) {
    const phaseOffset = (i * SMALL_PERIOD) / SMALL_COUNT;
    const progress = ((time + phaseOffset) % SMALL_PERIOD) / SMALL_PERIOD;
    const xOff = ((i * 137 + 23) % 50) - 25; // prime-based spread for good distribution ±25 px
    const riseY = cauldronY - progress * 90;
    const r = 2.5 + ((i * 13 + 7) % 4); // 2.5–5.5 px
    const alpha = Math.sin(progress * Math.PI) * 0.75;
    const color = isRainbow ? RAINBOW_COLORS[i % RAINBOW_COLORS.length] : getPotionColor(recipeId);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cauldronX + xOff, riseY, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.restore();
  }

  // ── Progress dots below the cauldron ─────────────────────────────────
  const dotsStartX = cauldronX - ((totalBubbles - 1) * DOT_SPACING) / 2;
  for (let i = 0; i < totalBubbles; i++) {
    const dx = dotsStartX + i * DOT_SPACING;
    const dy = cauldronY + DOT_Y_OFFSET;
    const color = getPotionColor(recipeId, i);
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    if (i < bubbleIndex) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
    } else if (i === bubbleIndex) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
    } else {
      ctx.fillStyle = 'rgba(200, 200, 255, 0.25)';
    }
    ctx.fill();
    ctx.restore();
  }

  // ── Rising large interactive bubble ──────────────────────────────────
  if (bubbleIndex < totalBubbles) {
    const riseY = cauldronY - phaseProgress * MAX_RISE;
    const size = MIN_SIZE + phaseProgress * (MAX_SIZE - MIN_SIZE);
    const color = getPotionColor(recipeId, bubbleIndex);

    ctx.save();

    if (bubbleActive) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 35;
    }

    // Bubble body
    ctx.beginPath();
    ctx.arc(cauldronX, riseY, size, 0, Math.PI * 2);
    ctx.fillStyle = bubbleActive ? color : 'rgba(180, 180, 255, 0.45)';
    ctx.fill();

    // Bubble outline
    ctx.strokeStyle = bubbleActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(180, 180, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubble highlight (shimmer)
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cauldronX - size * 0.3, riseY - size * 0.3, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }
}

/** Draw collect animation (emoji flying to HUD) */
export function drawCollectAnimations(
  ctx: CanvasRenderingContext2D,
  animations: CollectAnimation[],
  fontSize: number,
): void {
  for (const a of animations) {
    ctx.save();
    ctx.globalAlpha = 1 - a.progress;
    ctx.font = `${fontSize * (1 - a.progress * 0.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.emoji, a.x, a.y);
    ctx.restore();
  }
}

/** Draw flying star animations toward the star counter (top-left). */
export function drawStarFlyAnimations(
  ctx: CanvasRenderingContext2D,
  animations: { x: number; y: number; targetX: number; targetY: number; progress: number }[],
): void {
  for (const anim of animations) {
    const t = anim.progress;
    // Parabolic arc: linear lerp + upward arc
    const lx = anim.x + (anim.targetX - anim.x) * t;
    const ly = anim.y + (anim.targetY - anim.y) * t;
    const arcY = ly - 80 * Math.sin(t * Math.PI);
    const size = 22 * (1 - t * 0.5);
    const alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.fillText('⭐', lx, arcY);
    ctx.restore();
  }
}

// ─── Potion Delivery Effects ────────────────────────────────────────────────

/** Draw a single heart shape centred at (hx, hy) with given size and color. */
function drawHeart(ctx: CanvasRenderingContext2D, hx: number, hy: number, size: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(hx, hy + size * 0.3);
  ctx.bezierCurveTo(hx, hy, hx - size, hy, hx - size, hy - size * 0.4);
  ctx.bezierCurveTo(hx - size, hy - size, hx, hy - size, hx, hy - size * 0.4);
  ctx.bezierCurveTo(hx, hy - size, hx + size, hy - size, hx + size, hy - size * 0.4);
  ctx.bezierCurveTo(hx + size, hy, hx, hy, hx, hy + size * 0.3);
  ctx.fill();
  ctx.restore();
}

/** heiltrank – rising green plus/cross symbols + pulse ring */
function drawHeiltrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
  // Pulsing ring
  ctx.save();
  ctx.globalAlpha = alpha * 0.5 * (1 - (progress % 0.25) / 0.25);
  ctx.strokeStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 15;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 20, 20 + progress * 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Rising cross particles
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = ((progress + i / count) % 1);
    const px = x + Math.sin(i * 2.5) * 30;
    const py = y - 10 - t * 90;
    const sz = 8 * (1 - t * 0.5);
    const a = alpha * (1 - t);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 10;
    // Horizontal bar
    ctx.fillRect(px - sz, py - sz * 0.4, sz * 2, sz * 0.8);
    // Vertical bar
    ctx.fillRect(px - sz * 0.4, py - sz, sz * 0.8, sz * 2);
    ctx.restore();
  }
}

/** schlaftrank – purple ZZZ floating up + dreamy star dust */
function drawSchlaftrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number): void {
  const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
  const ZS = ['Z', 'Z', 'Z'];
  ZS.forEach((z, i) => {
    const t = ((progress * 1.5 + i * 0.33) % 1);
    const px = x + Math.sin(i * 1.4) * 25 + t * 15;
    const py = y - 20 - t * 80;
    const fs = (10 + i * 4) * (1 - t * 0.3);
    ctx.save();
    ctx.globalAlpha = alpha * (1 - t * 0.8);
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a78bfa';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 12;
    ctx.fillText(z, px, py);
    ctx.restore();
  });
  // Dreamy star dust
  for (let i = 0; i < 8; i++) {
    const angle = (time * 0.04 + (i * Math.PI * 2) / 8);
    const r = 25 + Math.sin(time * 0.05 + i) * 8;
    const px = x + Math.cos(angle) * r;
    const py = y - 25 + Math.sin(angle) * r * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#c4b5fd';
    ctx.shadowColor = '#c4b5fd';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** liebestrank – pink hearts floating up */
function drawLiebestrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  const alpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = ((progress * 1.2 + i / count) % 1);
    const px = x + Math.sin(i * 1.9 + progress * 2) * 35;
    const py = y - 10 - t * 100;
    const sz = 8 * (1 - t * 0.4);
    drawHeart(ctx, px, py, sz, '#ec4899', alpha * (1 - t * 0.7));
  }
}

/** feuertrank – orange/red fire sparks shooting upward */
function drawFeuertrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number): void {
  const alpha = progress < 0.85 ? 1 : 1 - (progress - 0.85) / 0.15;
  const count = 14;
  for (let i = 0; i < count; i++) {
    const t = ((progress * 2 + i / count) % 1);
    const spread = Math.sin(i * 1.37) * 40;
    const px = x + spread;
    const py = y - t * 110 + Math.sin(time * 0.1 + i) * 5;
    const r = 4 * (1 - t);
    const hue = 15 + (i % 4) * 10; // 15–45 degrees: orange-red
    ctx.save();
    ctx.globalAlpha = alpha * (1 - t);
    ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Base glow
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 45);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** sternenstaub – gold twinkling star burst */
function drawSternenstaubEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number): void {
  const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time * 0.03;
    const dist = 20 + progress * 70;
    const px = x + Math.cos(angle) * dist;
    const py = y - 20 + Math.sin(angle) * dist * 0.6;
    const size = 5 * (1 - progress * 0.5) * (0.5 + 0.5 * Math.sin(time * 0.15 + i));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size * 4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    ctx.fillText('✦', px, py);
    ctx.restore();
  }
}

/** mondtrank – silver/white orbiting moons */
function drawMondtrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number): void {
  const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
  const count = 5;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time * 0.05;
    const r = 35 + Math.sin(time * 0.04 + i) * 8;
    const px = x + Math.cos(angle) * r;
    const py = y - 25 + Math.sin(angle) * r * 0.45;
    const size = 9 + i * 1.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.fillText(i % 2 === 0 ? '🌙' : '✦', px, py);
    ctx.restore();
  }
}

/** regenbogentrank – rainbow arc + multi-color particles */
function drawRegenbogentrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  const arcR = 50 + progress * 30;
  // Rainbow arc bands
  const bands = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
  for (let b = 0; b < bands.length; b++) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = bands[b];
    ctx.lineWidth = 4;
    ctx.shadowColor = bands[b];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y - 10, arcR - b * 5, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }
  // Colored particles falling/spreading
  for (let i = 0; i < 10; i++) {
    const t = ((progress * 1.5 + i * 0.1) % 1);
    const angle = (i / 10) * Math.PI;
    const px = x + Math.cos(angle) * (30 + t * 50);
    const py = y - 20 + Math.sin(angle) * -(t * 40);
    ctx.save();
    ctx.globalAlpha = alpha * (1 - t * 0.7);
    ctx.fillStyle = bands[i % bands.length];
    ctx.shadowColor = bands[i % bands.length];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 4 * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** ewigkeitstrank – teal swirling vortex particles */
function drawEwigkeitstrankEffect(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number): void {
  const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
  const count = 16;
  for (let i = 0; i < count; i++) {
    const t = (i / count + progress * 0.5) % 1;
    const angle = t * Math.PI * 4 + time * 0.06;
    const r = 15 + t * 50;
    const px = x + Math.cos(angle) * r;
    const py = y - 25 + Math.sin(angle) * r * 0.5;
    const sz = 4 * (1 - t * 0.6);
    ctx.save();
    ctx.globalAlpha = alpha * (1 - t * 0.5);
    ctx.fillStyle = t < 0.5 ? '#06b6d4' : '#a78bfa';
    ctx.shadowColor = t < 0.5 ? '#06b6d4' : '#a78bfa';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Central glow
  ctx.save();
  ctx.globalAlpha = alpha * 0.4 * (0.5 + 0.5 * Math.sin(time * 0.1));
  const grad = ctx.createRadialGradient(x, y - 25, 0, x, y - 25, 30);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y - 25, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a potion delivery effect at position (x, y).
 * @param progress 0 = effect just started, 1 = effect fully finished
 * @param time     global frame counter for animation
 */
export function drawPotionEffect(
  ctx: CanvasRenderingContext2D,
  recipeId: string,
  x: number,
  y: number,
  progress: number,
  time: number,
): void {
  switch (recipeId) {
    case 'heiltrank':       drawHeiltrankEffect(ctx, x, y, progress); break;
    case 'schlaftrank':     drawSchlaftrankEffect(ctx, x, y, progress, time); break;
    case 'liebestrank':     drawLiebestrankEffect(ctx, x, y, progress); break;
    case 'feuertrank':      drawFeuertrankEffect(ctx, x, y, progress, time); break;
    case 'sternenstaub':    drawSternenstaubEffect(ctx, x, y, progress, time); break;
    case 'mondtrank':       drawMondtrankEffect(ctx, x, y, progress, time); break;
    case 'regenbogentrank': drawRegenbogentrankEffect(ctx, x, y, progress); break;
    case 'ewigkeitstrank':  drawEwigkeitstrankEffect(ctx, x, y, progress, time); break;
    default:
      // No-op: unknown recipe id — effect is safely skipped
      break;
  }
}
