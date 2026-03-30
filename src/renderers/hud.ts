import {
  GameState,
  INGREDIENT_EMOJI,
  HutBounds,
  Requester,
} from '@/shared/types';
import { getAllRecipesForDisplay, getBrewableRecipeIds, findMatchingRecipe } from '@/game/recipes';
import { getOrderForRequester } from '@/game/orders';

const REQUESTER_EMOJI: Record<Requester, string> = {
  cat: '🐱',
  monster: '👾',
  visitor: '🧙',
};

/** Draw the stars counter (top-left) */
function drawStarsCounter(
  ctx: CanvasRenderingContext2D,
  stars: number,
  level: number,
  fontSize: number,
): void {
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 10;
  ctx.fillText(`⭐ ${stars}`, 16, 12);

  ctx.shadowBlur = 0;
  ctx.font = `${fontSize * 0.7}px sans-serif`;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText(`Lv.${level}`, 16, 12 + fontSize + 4);
  ctx.restore();
}

const INVENTORY_MAX_SLOTS = 8;

/** Draw inventory slots (top-right). Returns slot hit-boxes for all 8 positions. */
function drawInventory(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  slotSize: number,
): { x: number; y: number; w: number; h: number }[] {
  const gap = 6;
  const totalW = INVENTORY_MAX_SLOTS * slotSize + (INVENTORY_MAX_SLOTS - 1) * gap;
  const startX = canvasWidth - totalW - 16;
  const y = 12;
  const slots: { x: number; y: number; w: number; h: number }[] = [];

  // Determine which slot types are used by the currently matchable recipe
  const matchedRecipe = state.phase === 'exploring' ? findMatchingRecipe() : null;
  const highlightTypes = new Set<string>();
  if (matchedRecipe) {
    for (const t of matchedRecipe.ingredients) highlightTypes.add(t);
  }

  for (let i = 0; i < INVENTORY_MAX_SLOTS; i++) {
    const sx = startX + i * (slotSize + gap);
    const slot = state.inventory[i] ?? null;
    slots.push({ x: sx, y, w: slotSize, h: slotSize });

    const isHighlighted = slot !== null && highlightTypes.has(slot.type);

    ctx.save();
    if (isHighlighted) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 14;
    } else {
      ctx.fillStyle = slot ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.6)';
      ctx.strokeStyle = slot ? '#a78bfa' : '#475569';
      ctx.lineWidth = 2;
      if (slot) {
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 8;
      }
    }
    ctx.beginPath();
    ctx.roundRect(sx, y, slotSize, slotSize, 8);
    ctx.fill();
    ctx.stroke();

    if (slot) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'white';
      ctx.font = `${slotSize * 0.6}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(INGREDIENT_EMOJI[slot.type], sx + slotSize / 2, y + slotSize / 2);

      // Counter badge when stacked
      if (slot.count > 1) {
        const badgeR = slotSize * 0.28;
        const bx = sx + slotSize - badgeR * 0.7;
        const by = y + slotSize - badgeR * 0.7;
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `bold ${Math.round(badgeR * 1.3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(slot.count), bx, by);
      }
    }
    ctx.restore();
  }

  return slots;
}

/** Draw brewed potion slot. Returns its hit-box (or null if empty). */
function drawBrewedPotionSlot(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  slotSize: number,
): { x: number; y: number; w: number; h: number } | null {
  if (!state.brewedPotion) return null;

  const gap = 6;
  const totalW = INVENTORY_MAX_SLOTS * slotSize + (INVENTORY_MAX_SLOTS - 1) * gap;
  const startX = canvasWidth - totalW - 16;
  const y = 12;
  const px = startX - slotSize - gap - 8;

  ctx.save();
  ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(px, y, slotSize, slotSize, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Potion emoji
  ctx.fillStyle = 'white';
  ctx.font = `${slotSize * 0.6}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.brewedPotion.emoji, px + slotSize / 2, y + slotSize / 2);

  // Discard × badge (top-left corner)
  const bSize = slotSize * 0.32;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px + bSize * 0.6, y + bSize * 0.6, bSize * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `bold ${Math.round(bSize * 0.9)}px sans-serif`;
  ctx.fillStyle = '#f87171';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×', px + bSize * 0.6, y + bSize * 0.6);

  ctx.restore();
  return { x: px, y, w: slotSize, h: slotSize };
}

/** Draw active orders (bottom center) */
function drawOrders(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  slotSize: number,
): void {
  const orders = state.activeOrders;
  if (orders.length === 0) return;

  const gap = 8;
  const totalW = orders.length * (slotSize * 1.8 + gap) - gap;
  const startX = (canvasWidth - totalW) / 2;
  const y = canvasHeight - slotSize - 20;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const ox = startX + i * (slotSize * 1.8 + gap);

    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ox, y, slotSize * 1.8, slotSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${slotSize * 0.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Requester
    ctx.fillText(
      REQUESTER_EMOJI[order.requester],
      ox + slotSize * 0.5,
      y + slotSize / 2,
    );
    // Arrow
    ctx.font = `${slotSize * 0.3}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('→', ox + slotSize * 0.9, y + slotSize / 2);
    // Potion
    ctx.font = `${slotSize * 0.5}px serif`;
    ctx.fillText(
      order.recipe.emoji,
      ox + slotSize * 1.3,
      y + slotSize / 2,
    );
    ctx.restore();
  }
}

/** Draw NPC speech bubble with order */
export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  emoji: string,
  size: number,
): void {
  ctx.save();
  // Bubble
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - size, y - size * 1.6, size * 2, size * 1.2, size * 0.3);
  ctx.fill();
  ctx.stroke();

  // Pointer triangle
  ctx.beginPath();
  ctx.moveTo(x - 6, y - size * 0.4);
  ctx.lineTo(x, y - size * 0.1);
  ctx.lineTo(x + 6, y - size * 0.4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();

  // Emoji
  ctx.font = `${size * 0.7}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y - size);
  ctx.restore();
}

/** Draw recipe book overlay. Returns hit-boxes for each recipe card (in recipe order). */
function drawRecipeBook(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: GameState,
): { x: number; y: number; w: number; h: number }[] {
  ctx.save();

  // Dark overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const recipes = getAllRecipesForDisplay();
  const brewable = getBrewableRecipeIds();

  // Layout: 2 columns, taller cards
  const cols = 2;
  const cellW = Math.min(320, canvasWidth * 0.44);
  const cellH = 120;
  const gap = 14;
  const totalW = cols * cellW + (cols - 1) * gap;
  const startX = (canvasWidth - totalW) / 2;
  const startY = 80;

  // Title
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 10;
  ctx.fillText('📖 Rezeptbuch', canvasWidth / 2, 54);
  ctx.shadowBlur = 0;

  const slots: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rx = startX + col * (cellW + gap);
    const ry = startY + row * (cellH + gap);
    const canBrew = !r.locked && brewable.has(r.id);
    const isSelected = !r.locked && state.selectedRecipe?.id === r.id;

    slots.push({ x: rx, y: ry, w: cellW, h: cellH });

    // Card background color based on selection / lock / brewable status
    if (r.locked) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
    } else if (isSelected) {
      ctx.fillStyle = canBrew ? 'rgba(250, 204, 21, 0.30)' : 'rgba(250, 204, 21, 0.15)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 16;
    } else if (canBrew) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.20)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
    } else {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.22)';
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
    }
    ctx.beginPath();
    ctx.roundRect(rx, ry, cellW, cellH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (r.locked) {
      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#475569';
      ctx.fillText('🔒', rx + cellW / 2, ry + cellH / 2);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Ab Lv.${r.unlockLevel}`, rx + cellW / 2, ry + cellH / 2 + 26);
    } else {
      const pad = 12;

      // Status badge (top-right corner)
      if (isSelected) {
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#facc15';
        ctx.fillText(canBrew ? '⭐ AUSGEWÄHLT' : '★ AUSGEWÄHLT', rx + cellW - pad, ry + 8);
      } else if (canBrew) {
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#10b981';
        ctx.fillText('✓ BRAUBAR', rx + cellW - pad, ry + 8);
      }

      // Top row: potion emoji + name + stars
      ctx.font = '32px serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.emoji, rx + pad, ry + 30);

      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.name, rx + pad + 40, ry + 26);

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⭐ ${r.rewardStars}`, rx + cellW - pad, ry + 26);

      // Divider
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + pad, ry + 52);
      ctx.lineTo(rx + cellW - pad, ry + 52);
      ctx.stroke();

      // Ingredient row — large emojis centered
      const ingFontSize = 30;
      const plusFontSize = 18;
      const ingW = ingFontSize * 1.5;
      const plusW = plusFontSize * 1.2;
      const ingRowW = 3 * ingW + 2 * plusW;
      let ix = rx + (cellW - ingRowW) / 2;
      const iy = ry + 52 + (cellH - 52) / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let j = 0; j < r.ingredients.length; j++) {
        ctx.font = `${ingFontSize}px serif`;
        ctx.fillText(INGREDIENT_EMOJI[r.ingredients[j]], ix + ingW / 2, iy);
        ix += ingW;
        if (j < r.ingredients.length - 1) {
          ctx.font = `${plusFontSize}px sans-serif`;
          ctx.fillStyle = '#64748b';
          ctx.fillText('+', ix + plusW / 2, iy);
          ix += plusW;
          ctx.fillStyle = '#f1f5f9';
        }
      }
    }
  }

  // Close hint (two lines for narrow screens)
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Tippe auf ein Rezept zum Auswählen', canvasWidth / 2, canvasHeight - 34);
  ctx.fillText('Tippe daneben zum Schließen', canvasWidth / 2, canvasHeight - 14);

  ctx.restore();

  return slots;
}

/** Draw recipe book button */
function drawRecipeBookButton(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  size: number,
): { x: number; y: number; w: number; h: number } {
  const bx = canvasWidth - size - 16;
  const by = canvasHeight - size - 16;

  ctx.save();
  ctx.fillStyle = 'rgba(124, 58, 237, 0.6)';
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, size, size, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${size * 0.6}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📖', bx + size / 2, by + size / 2);
  ctx.restore();

  return { x: bx, y: by, w: size, h: size };
}

/** Draw active recipe hint below inventory (visible when recipe book is closed). */
function drawActiveRecipeHint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  slotSize: number,
): void {
  if (state.showRecipeBook) return;
  const recipe = findMatchingRecipe();
  if (!recipe) return;

  const gap = 6;
  const totalW = INVENTORY_MAX_SLOTS * slotSize + (INVENTORY_MAX_SLOTS - 1) * gap;
  const startX = canvasWidth - totalW - 16;
  const y = 12 + slotSize + 8;

  ctx.save();

  // Background pill
  const ingW = recipe.ingredients.length * slotSize * 0.72 + (recipe.ingredients.length - 1) * 4 + 28 + slotSize * 0.72 + 8;
  ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(startX, y, ingW, slotSize * 0.72, 6);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  const emojiSize = slotSize * 0.5;
  const itemStep = slotSize * 0.72 + 4;
  ctx.font = `${emojiSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cy = y + slotSize * 0.36;

  let ix = startX + itemStep / 2;
  for (let j = 0; j < recipe.ingredients.length; j++) {
    ctx.font = `${emojiSize}px serif`;
    ctx.fillText(INGREDIENT_EMOJI[recipe.ingredients[j]], ix, cy);
    ix += itemStep;
    if (j < recipe.ingredients.length - 1) {
      ctx.font = `bold ${emojiSize * 0.65}px sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('+', ix - itemStep / 2 + 2, cy);
      ctx.fillStyle = '#f1f5f9';
    }
  }

  // Arrow + result
  ctx.font = `${emojiSize * 0.65}px sans-serif`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('→', ix - itemStep / 2 + 4, cy);
  ctx.font = `${emojiSize}px serif`;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(recipe.emoji, ix + slotSize * 0.36 - 4, cy);

  ctx.restore();
}

/** Draw celebrate / level-up overlay */
function drawCelebration(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  level: number,
  timer: number,
): void {
  const progress = 1 - timer / 180;
  ctx.save();
  ctx.globalAlpha = Math.min(1, timer / 30);
  ctx.fillStyle = 'rgba(124, 58, 237, 0.3)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 20;
  ctx.fillText(`⭐ Level ${level}! ⭐`, canvasWidth / 2, canvasHeight / 2 - 20);

  ctx.font = '24px sans-serif';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Neue Rezepte freigeschaltet!', canvasWidth / 2, canvasHeight / 2 + 30);

  // Sparkle ring
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + progress * 4;
    const r = 100 + progress * 50;
    const sx = canvasWidth / 2 + Math.cos(angle) * r;
    const sy = canvasHeight / 2 + Math.sin(angle) * r;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export interface HudLayout {
  recipeBookBtn: { x: number; y: number; w: number; h: number };
  inventorySlots: { x: number; y: number; w: number; h: number }[];
  brewedPotionSlot: { x: number; y: number; w: number; h: number } | null;
  recipeBookSlots: { x: number; y: number; w: number; h: number }[];
}

/** Main HUD draw function */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
): HudLayout {
  const fontSize = Math.max(16, Math.min(24, canvasWidth * 0.025));
  const slotSize = Math.max(36, Math.min(52, canvasWidth * 0.04));

  drawStarsCounter(ctx, state.stars, state.level, fontSize);
  const inventorySlots = drawInventory(ctx, state, canvasWidth, slotSize);
  const brewedPotionSlot = drawBrewedPotionSlot(ctx, state, canvasWidth, slotSize);
  drawActiveRecipeHint(ctx, state, canvasWidth, slotSize);
  drawOrders(ctx, state, canvasWidth, canvasHeight, slotSize);

  const recipeBookBtn = drawRecipeBookButton(ctx, canvasWidth, canvasHeight, slotSize);

  let recipeBookSlots: { x: number; y: number; w: number; h: number }[] = [];
  if (state.showRecipeBook) {
    recipeBookSlots = drawRecipeBook(ctx, canvasWidth, canvasHeight, state);
  }

  if (state.phase === 'celebrating' && state.celebrateTimer > 0) {
    drawCelebration(ctx, canvasWidth, canvasHeight, state.level, state.celebrateTimer);
  }

  return { recipeBookBtn, inventorySlots, brewedPotionSlot, recipeBookSlots };
}
