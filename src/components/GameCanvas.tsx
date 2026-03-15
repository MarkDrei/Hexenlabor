'use client';

import { useEffect, useRef, useCallback } from 'react';
import { drawBackground } from '@/renderers/background';
import { drawThings } from '@/renderers/things';
import { drawCauldron, drawIngredient, drawParticles, drawFloatingTexts, drawFallingIngredient, drawFirefly, drawEventBanner, drawNPCGreeting } from '@/renderers/drawObjects';
import { drawHUD, drawInventory, drawPotionsBar, drawBrewingPanel, drawMessage, drawMagicGardenIndicator } from '@/renderers/drawUI';
import {
  createInitialState,
  updateWitch,
  updateNPCs,
  checkIngredientCollection,
  updateCauldron,
  brewPotion,
  usePotion,
  updateParticles,
  updateFloatingTexts,
  updateActiveEffects,
  updateSpawnTimer,
  updateEventTimer,
  updateMagicGarden,
  updateMessage,
  updateEvent,
  handleEventClick,
  showMessage,
} from '@/game/gameLogic';
import { POTION_RECIPES } from '@/game/constants';
import type { GameState, PotionType } from '@/game/types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const imagesRef = useRef<{
    witch: HTMLImageElement | null;
    catFluffy: HTMLImageElement | null;
    things: HTMLImageElement | null;
    things2: HTMLImageElement | null;
  }>({ witch: null, catFluffy: null, things: null, things2: null });

  const loadImages = useCallback(() => {
    const imgs = imagesRef.current;

    imgs.witch = new Image();
    imgs.witch.src = '/assets/witch.png';

    imgs.catFluffy = new Image();
    imgs.catFluffy.src = '/assets/catFluffy.png';

    imgs.things = new Image();
    imgs.things.src = '/assets/things.png';

    imgs.things2 = new Image();
    imgs.things2.src = '/assets/things2.png';
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Canvas sizing ──────────────────────────────────────────────────────
    const resize = () => {
      canvas.width = window.innerWidth - 40;
      canvas.height = window.innerHeight - 40;
      // Re-initialise if not yet done, or reposition cauldron
      if (!stateRef.current) {
        stateRef.current = createInitialState(canvas.width, canvas.height);
      } else {
        const s = stateRef.current;
        s.cauldron.x = canvas.width * 0.5;
        s.cauldron.y = canvas.height * 0.72;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    loadImages();

    // ── Input state ────────────────────────────────────────────────────────
    let isMouseDown = false;

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseDown = (e: MouseEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const pos = getPos(e);

      // If brewing panel open, clicks close it (keys 1-6 are used for brewing)
      if (state.showBrewingUI) {
        state.showBrewingUI = false;
        return;
      }

      // Event interactions (falling ingredients / fireflies)
      if (state.activeEvent) {
        const ev = state.activeEvent;
        if (ev.type === 'ingredientRain' || (ev.fallingIngredients && ev.fallingIngredients.length > 0)) {
          handleEventClick(state, pos.x, pos.y);
        }
        if (ev.type === 'fireflyDance' || (ev.fireflies && ev.fireflies.length > 0)) {
          handleEventClick(state, pos.x, pos.y);
        }
      }

      // Potion bar click (right side of screen)
      const potionClicked = tryClickPotion(state, pos.x, pos.y, canvas.width, canvas.height);
      if (potionClicked) return;

      // Default: move witch
      isMouseDown = true;
      state.witch.targetX = pos.x;
      state.witch.targetY = pos.y;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const state = stateRef.current;
      if (!state || state.showBrewingUI) return;
      const pos = getPos(e);
      state.witch.targetX = pos.x;
      state.witch.targetY = pos.y;
    };

    const onMouseUp = () => { isMouseDown = false; };

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

      if (state.showBrewingUI) { state.showBrewingUI = false; return; }

      if (state.activeEvent) handleEventClick(state, pos.x, pos.y);
      const potionClicked = tryClickPotion(state, pos.x, pos.y, canvas.width, canvas.height);
      if (potionClicked) return;

      isMouseDown = true;
      state.witch.targetX = pos.x;
      state.witch.targetY = pos.y;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isMouseDown) return;
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      state.witch.targetX = touch.clientX - rect.left;
      state.witch.targetY = touch.clientY - rect.top;
    };
    const onTouchEnd = () => { isMouseDown = false; };

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const key = e.key.toLowerCase();

      if (key === 'b' || key === 'escape') {
        if (state.isNearCauldron || state.showBrewingUI) {
          state.showBrewingUI = !state.showBrewingUI;
        }
        return;
      }

      if (state.showBrewingUI) {
        const idx = parseInt(key, 10) - 1;
        if (idx >= 0 && idx < POTION_RECIPES.length) {
          const recipe = POTION_RECIPES[idx];
          const canBrew = Object.entries(recipe.ingredients).every(
            ([t, n]) => (state.inventory[t as keyof typeof state.inventory] ?? 0) >= n,
          );
          if (canBrew) {
            const msg = brewPotion(state, recipe.id as PotionType);
            showMessage(state, msg);
          } else {
            showMessage(state, `Not enough ingredients for ${recipe.name}!`);
          }
        }
        return;
      }

      // Use potions by pressing 1-6 (when not in brewing panel)
      const potionIdx = parseInt(key, 10) - 1;
      if (potionIdx >= 0 && potionIdx < state.potions.length) {
        usePotion(state, state.potions[potionIdx], canvas.width, canvas.height);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);

    // ── Game Loop ──────────────────────────────────────────────────────────
    let lastTime = performance.now();
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 64); // cap delta at 64ms to handle slow frames gracefully
      lastTime = now;

      const state = stateRef.current;
      if (!state) { raf = requestAnimationFrame(loop); return; }

      state.time += dt;

      // ── Update ──
      updateWitch(state, dt);
      updateNPCs(state, dt, canvas.width, canvas.height);
      checkIngredientCollection(state);
      updateCauldron(state, dt);
      updateParticles(state, dt);
      updateFloatingTexts(state, dt);
      updateActiveEffects(state, dt);
      updateSpawnTimer(state, dt, canvas.width, canvas.height);
      updateEventTimer(state, dt, canvas.width, canvas.height);
      updateEvent(state, dt, canvas.width, canvas.height);
      updateMagicGarden(state, dt);
      updateMessage(state, dt);

      // ── Render ──
      const cw = canvas.width;
      const ch = canvas.height;

      drawBackground(ctx, cw, ch, state.time);

      // Environment (things sprites)
      const { things, things2 } = imagesRef.current;
      if (things?.complete) drawThings(ctx, cw, ch, things, things2 ?? undefined);

      // Cauldron (interactive)
      drawCauldron(ctx, state.cauldron, state.isNearCauldron, state.time);

      // Ingredients on ground
      for (const ing of state.ingredients) {
        drawIngredient(ctx, ing, state.time);
      }

      // Falling ingredients / fireflies (event objects)
      if (state.activeEvent) {
        const ev = state.activeEvent;
        if (ev.fallingIngredients) {
          for (const fi of ev.fallingIngredients) {
            if (!fi.collected) drawFallingIngredient(ctx, fi, state.time);
          }
        }
        if (ev.fireflies) {
          for (const ff of ev.fireflies) {
            drawFirefly(ctx, ff, state.time);
          }
        }
      }

      // NPCs (cat & monster from sprite)
      const { catFluffy } = imagesRef.current;
      if (catFluffy?.complete && catFluffy.naturalWidth > 0) {
        const sw = catFluffy.width / 5;
        const sh = catFluffy.height / 2;
        const { cat, monster } = state;

        // Cat (top row of sprite)
        ctx.save();
        if (cat.vx > 0) {
          ctx.drawImage(catFluffy, cat.frameIndex * sw, 0, sw, sh, cat.x - sw / 2, cat.y - sh, sw, sh);
        } else {
          ctx.translate(cat.x, cat.y);
          ctx.scale(-1, 1);
          ctx.drawImage(catFluffy, cat.frameIndex * sw, 0, sw, sh, -sw / 2, -sh, sw, sh);
        }
        ctx.restore();
        drawNPCGreeting(ctx, cat, 'Cat');

        // Monster (bottom row of sprite)
        ctx.save();
        if (monster.vx > 0) {
          ctx.drawImage(catFluffy, monster.frameIndex * sw, sh, sw, sh, monster.x - sw / 2, monster.y - sh, sw, sh);
        } else {
          ctx.translate(monster.x, monster.y);
          ctx.scale(-1, 1);
          ctx.drawImage(catFluffy, monster.frameIndex * sw, sh, sw, sh, -sw / 2, -sh, sw, sh);
        }
        ctx.restore();
        drawNPCGreeting(ctx, monster, 'Monster');
      }

      // Witch sprite
      const { witch: witchImg } = imagesRef.current;
      if (witchImg?.complete && witchImg.naturalWidth > 0) {
        const sw = witchImg.width / 5;
        const sh = witchImg.height / 2;
        const { witch } = state;
        ctx.save();
        if (!witch.facingRight) {
          ctx.translate(witch.x, witch.y);
          ctx.scale(-1, 1);
          ctx.drawImage(witchImg, witch.frameIndex * sw, 0, sw, sh, -sw / 2, -sh / 2, sw, sh);
        } else {
          ctx.drawImage(witchImg, witch.frameIndex * sw, 0, sw, sh, witch.x - sw / 2, witch.y - sh / 2, sw, sh);
        }
        ctx.restore();
      }

      // Particles & floating texts (above everything)
      drawParticles(ctx, state.particles);
      drawFloatingTexts(ctx, state.floatingTexts);

      // ── UI Layer ──
      if (state.activeEvent) drawEventBanner(ctx, state.activeEvent, cw, state.time);
      drawHUD(ctx, state, cw);
      drawInventory(ctx, state, cw, ch);
      drawPotionsBar(ctx, state.potions, cw, ch);
      drawMessage(ctx, state.message, cw, ch);
      drawMagicGardenIndicator(ctx, state, cw);
      if (state.showBrewingUI) drawBrewingPanel(ctx, state, cw, ch);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [loadImages]);

  return (
    <div className="fixed inset-0 bg-slate-900">
      <canvas
        ref={canvasRef}
        className="block m-5 border-2 border-purple-600 rounded-xl shadow-2xl cursor-crosshair"
      />
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-purple-400 text-xs pointer-events-none select-none">
        Click to move • B near cauldron to brew • Collect ingredients • Use potions with number keys
      </div>
    </div>
  );
}

// ─── Helper: try clicking a potion in the potions bar ────────────────────────
function tryClickPotion(
  state: GameState,
  clickX: number,
  clickY: number,
  canvasW: number,
  canvasH: number,
): boolean {
  if (state.potions.length === 0) return false;
  const pSize = 44;
  const pGap = 6;
  const totalW = state.potions.length * (pSize + pGap) - pGap;
  const startX = canvasW - totalW - 16;
  const y = canvasH - pSize - 80;

  for (let i = 0; i < state.potions.length; i++) {
    const px = startX + i * (pSize + pGap);
    if (clickX >= px && clickX <= px + pSize && clickY >= y && clickY <= y + pSize) {
      usePotion(state, state.potions[i], canvasW, canvasH);
      return true;
    }
  }
  return false;
}
