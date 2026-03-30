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

