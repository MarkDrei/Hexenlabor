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

/** Draw brewing bubbles above the cauldron */
export function drawBrewingBubbles(
  ctx: CanvasRenderingContext2D,
  cauldronX: number,
  cauldronY: number,
  bubbleIndex: number,
  bubbleTimer: number,
  bubbleActive: boolean,
  totalBubbles: number,
): void {
  const colors = ['#a78bfa', '#ec4899', '#22c55e'];
  for (let i = 0; i < totalBubbles; i++) {
    const bx = cauldronX + (i - 1) * 40;
    const by = cauldronY - 30 - i * 15;
    const isCurrent = i === bubbleIndex;
    const isPast = i < bubbleIndex;
    const size = isCurrent ? 18 + Math.sin(bubbleTimer * 0.1) * 4 : 14;

    ctx.save();
    ctx.globalAlpha = isPast ? 0.3 : 1;

    if (isCurrent && bubbleActive) {
      // Glowing active bubble
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.arc(bx, by, size, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent && bubbleActive
      ? colors[i % colors.length]
      : 'rgba(200, 200, 255, 0.4)';
    ctx.fill();

    // Bubble highlight
    ctx.beginPath();
    ctx.arc(bx - size * 0.3, by - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
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

/** Draw a floating candle with flicker */
export function drawCandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  size: number,
): void {
  const flicker = 0.7 + 0.3 * Math.sin(time * 0.15 + x);
  ctx.save();

  // Candle glow
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = size * 2 * flicker;
  ctx.globalAlpha = 0.5 * flicker;
  ctx.beginPath();
  ctx.arc(x, y - size, size * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();

  // Candle emoji
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🕯️', x, y);
  ctx.restore();
}

/** Draw sparkle particles floating around a point */
export function drawFloatingSparkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  count: number,
  radius: number,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + time * 0.01;
    const r = radius * (0.5 + 0.5 * Math.sin(time * 0.02 + i));
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    const alpha = 0.3 + 0.7 * Math.sin(time * 0.05 + i * 1.5);
    const sz = 2 + Math.sin(time * 0.03 + i) * 1.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

/** Draw a moon crescent in the attic window */
export function drawMoonCrescent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
): void {
  const wobble = Math.sin(time * 0.005) * 2;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = size;
  ctx.fillText('🌙', x + wobble, y);
  ctx.restore();
}
