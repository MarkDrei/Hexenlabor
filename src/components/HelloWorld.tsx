'use client';

import { useEffect, useRef } from 'react';
import { drawBackground } from '@/renderers/background';
import { drawThings } from '@/renderers/things';
import type { GameState, IngredientType, PotionType } from '@/shared/types';
import { createInitialState, spawnIngredient } from '@/game/state';
import {
  findMatchingRecipe,
  canBrew,
  spendIngredients,
  INGREDIENT_DISPLAY,
  POTION_NAMES,
} from '@/game/crafting';
import {
  updateEvents,
  addMessage,
  startButterflyMiniGame,
  startStarsMiniGame,
  startMemoryMiniGame,
} from '@/game/events';
import {
  drawHUD,
  drawInventoryBar,
  drawCauldronUI,
  drawMessages,
  drawMiniGameUI,
  drawGnome,
  drawRainbow,
  drawRain,
} from '@/renderers/ui';
import {
  drawWorldIngredients,
  drawButterflies,
  drawFallingStars,
  drawCauldronEffect,
  drawActionPrompt,
  drawNightStars,
  getIngredientAt,
  getPotionIconAt,
  CAULDRON_WORLD_OFFSET,
} from '@/renderers/world';

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    // Keep a stable reference for state across RAF iterations
    const stateHolder: { current: GameState | null } = { current: null };

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth - 40;
      canvas.height = window.innerHeight - 40;
      if (stateHolder.current) {
        stateHolder.current.canvasWidth = canvas.width;
        stateHolder.current.canvasHeight = canvas.height;
      }
    };
    updateCanvasSize();
    stateHolder.current = createInitialState(canvas.width, canvas.height);
    window.addEventListener('resize', updateCanvasSize);

    // ── Load images ───────────────────────────────────────────────────────────
    const img = new Image();
    img.src = '/assets/witch.png';
    const thingsImg = new Image();
    thingsImg.src = '/assets/things.png';
    const things2Img = new Image();
    things2Img.src = '/assets/things2.png';
    const catFluffyImg = new Image();
    catFluffyImg.src = '/assets/catFluffy.png';

    let animationFrameId = 0;
    let lastTime = 0;
    let isMouseDown = false;

    const getCanvasPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getCauldronPos(w: number, h: number) {
      return {
        x: w / 2 + CAULDRON_WORLD_OFFSET.dx,
        y: h / 2 + CAULDRON_WORLD_OFFSET.dy,
      };
    }

    function collectIngredient(
      state: GameState,
      ingredient: { id: string; type: IngredientType; collected: boolean },
      msgX: number,
      msgY: number
    ) {
      ingredient.collected = true;
      const type = ingredient.type;
      state.inventory[type] = (state.inventory[type] ?? 0) + 1;
      state.score += 10;
      const info = INGREDIENT_DISPLAY[type];
      addMessage(state, `${info.emoji} +1 ${info.label}! +10`, info.color, msgX, msgY);
    }

    function tryBrew(state: GameState) {
      const mix = state.cauldron.selectedIngredients;
      if (mix.length === 0) return;
      const recipe = findMatchingRecipe(mix);
      if (!recipe) {
        addMessage(state, '❌ No recipe matches this mix!', '#ef4444');
        return;
      }
      if (!canBrew(state.inventory, recipe)) {
        addMessage(state, '❌ Not enough ingredients!', '#ef4444');
        return;
      }
      spendIngredients(state.inventory, recipe);
      state.cauldron.brewing = true;
      state.cauldron.brewingTimeLeft = 3000;
      state.cauldron.selectedIngredients = [];
      state.cauldron.lastBrewedPotion = recipe.potion;
    }

    function finishBrewing(state: GameState) {
      const potion = state.cauldron.lastBrewedPotion;
      if (!potion) return;
      state.potions[potion] = (state.potions[potion] ?? 0) + 1;
      state.score += 200;
      state.cauldron.brewing = false;
      state.cauldron.brewingTimeLeft = 0;
      state.cauldron.lastBrewedPotion = null;
      state.cauldron.isOpen = false;
      addMessage(state, `🧪 ${POTION_NAMES[potion]} brewed! +200`, '#a855f7');
    }

    function applyPotion(state: GameState, potion: PotionType, w: number, h: number) {
      const count = state.potions[potion] ?? 0;
      if (count <= 0) return;
      state.potions[potion] = count - 1;

      switch (potion) {
        case 'speed_potion':
          state.activeEffects.push({ type: 'speed_potion', timeLeft: 20000 });
          addMessage(state, '💨 Speed Potion! 2x speed for 20s!', '#ef4444');
          break;
        case 'night_potion':
          state.timeOfDay = 0.75;
          state.isNight = true;
          startStarsMiniGame(state);
          addMessage(state, '🌙 Night falls! Catch the stars!', '#818cf8');
          break;
        case 'grow_potion': {
          const count2 = 4 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count2; i++) {
            if (state.worldIngredients.filter((x) => !x.collected).length < 16) {
              state.worldIngredients.push(spawnIngredient(w, h));
            }
          }
          addMessage(state, '🌱 World blooms with ingredients!', '#22c55e');
          break;
        }
        case 'luck_potion': {
          const luckyIngredients: IngredientType[] = [
            'fairy_dust', 'stardust', 'magic_flower', 'crystal',
            'red_mushroom', 'blue_mushroom', 'herbs', 'fern', 'water',
          ];
          for (let i = 0; i < 5; i++) {
            const t = luckyIngredients[Math.floor(Math.random() * luckyIngredients.length)];
            state.inventory[t] = (state.inventory[t] ?? 0) + 1;
          }
          addMessage(state, '🍀 Lucky! Got 5 random ingredients!', '#f59e0b');
          break;
        }
        case 'friendship_potion':
          state.activeEffects.push({ type: 'friendship_potion', timeLeft: 30000 });
          for (const npc of state.npcs) {
            npc.deliveredIngredient = false;
          }
          addMessage(state, '💗 Friends bring gifts!', '#ec4899');
          break;
        case 'flying_potion':
          startButterflyMiniGame(state, 8);
          addMessage(state, '🦋 Flying Potion! Catch butterflies!', '#a855f7');
          break;
        case 'rainbow_potion':
          state.score += 500;
          state.rainbowActive = true;
          state.rainbowTimer = 8000;
          addMessage(state, '🌈 RAINBOW! +500 score!', '#f472b6');
          break;
        case 'invisibility_potion':
          startMemoryMiniGame(state);
          addMessage(state, '🃏 Memory Match time!', '#9ca3af');
          break;
      }
    }

    function handleMemoryClick(state: GameState, x: number, y: number) {
      const mg = state.miniGame;
      if (mg.flippedCards.length >= 2) return;
      for (const card of mg.memoryCards) {
        if (card.matched || card.flipped) continue;
        if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height) {
          card.flipped = true;
          mg.flippedCards.push(card.id);
          mg.lastFlipTime = Date.now();
          if (mg.flippedCards.length === 2) {
            const [id1, id2] = mg.flippedCards;
            const c1 = mg.memoryCards.find((c) => c.id === id1);
            const c2 = mg.memoryCards.find((c) => c.id === id2);
            if (c1 && c2 && c1.pairId === c2.pairId) {
              c1.matched = true;
              c2.matched = true;
              state.inventory[c1.ingredient] = (state.inventory[c1.ingredient] ?? 0) + 1;
              mg.score += 100;
              state.score += 100;
              addMessage(state, `🃏 Match! +1 ${c1.ingredient.replace(/_/g, ' ')}! +100`, '#a855f7');
              mg.flippedCards = [];
            }
          }
          break;
        }
      }
    }

    function handleCauldronUIClick(state: GameState, x: number, y: number, w: number, h: number) {
      const panelW = Math.min(600, w - 40);
      const panelH = Math.min(420, h - 100);
      const px = (w - panelW) / 2;
      const py = (h - panelH) / 2 - 20;

      if (x < px || x > px + panelW || y < py || y > py + panelH) {
        state.cauldron.isOpen = false;
        return;
      }
      if (state.cauldron.brewing) return;

      // Clear button
      if (x >= px + panelW - 90 && x <= px + panelW - 12 && y >= py + 44 && y <= py + 68) {
        state.cauldron.selectedIngredients = [];
        return;
      }

      // Brew button
      const brewBtnX = w / 2 - 55;
      const brewBtnY = py + panelH - 60;
      if (x >= brewBtnX && x <= brewBtnX + 110 && y >= brewBtnY && y <= brewBtnY + 36) {
        tryBrew(state);
        return;
      }

      // Ingredient buttons
      let ingX = px + 16;
      let ingY = py + 96;
      const ingredientTypes = Object.keys(INGREDIENT_DISPLAY) as IngredientType[];
      for (const type of ingredientTypes) {
        const cnt = state.inventory[type] ?? 0;
        if (cnt === 0) { continue; }
        if (x >= ingX && x <= ingX + 50 && y >= ingY && y <= ingY + 52) {
          if (state.cauldron.selectedIngredients.length < 5) {
            state.cauldron.selectedIngredients.push(type);
          }
          return;
        }
        ingX += 58;
        if (ingX > px + panelW - 60) { ingX = px + 16; ingY += 60; }
      }
    }

    function handleClick(e: MouseEvent) {
      const { x, y } = getCanvasPos(e);
      const state = stateHolder.current;
      if (!state) return;
      const w = canvas.width;
      const h = canvas.height;

      if (state.miniGame.type === 'memory') { handleMemoryClick(state, x, y); return; }

      if (state.miniGame.type === 'butterfly') {
        for (const bf of state.miniGame.butterflies) {
          if (bf.caught) continue;
          if (Math.hypot(bf.x - x, bf.y - y) < 24) {
            bf.caught = true;
            state.inventory.fairy_dust = (state.inventory.fairy_dust ?? 0) + 1;
            state.miniGame.score += 50;
            state.score += 50;
            addMessage(state, '🦋 +1 Fairy Dust! +50', '#ec4899', x, y - 20);
          }
        }
        return;
      }

      if (state.miniGame.type === 'stars') {
        for (const star of state.miniGame.fallingStars) {
          if (star.caught) continue;
          if (Math.hypot(star.x - x, star.y - y) < 28) {
            star.caught = true;
            state.inventory.stardust = (state.inventory.stardust ?? 0) + 1;
            state.miniGame.score += 75;
            state.score += 75;
            addMessage(state, '⭐ +1 Stardust! +75', '#eab308', x, y - 20);
          }
        }
        return;
      }

      if (state.cauldron.isOpen) { handleCauldronUIClick(state, x, y, w, h); return; }

      const clickedPotion = getPotionIconAt(x, y, w, h, state.potions);
      if (clickedPotion) { applyPotion(state, clickedPotion, w, h); return; }

      // NPC click
      for (const npc of state.npcs) {
        if (Math.hypot(npc.x - x, npc.y - y) < 36) {
          const lines = npc.type === 'cat'
            ? ['Meow! 🐱', 'Feed me potions!', 'Purr...✨']
            : ['GRRRR! 👹', 'Fluffy want shrooms!', 'Roar! 🌟'];
          npc.speechBubble = lines[Math.floor(Math.random() * lines.length)];
          npc.speechTimer = 2500;
          return;
        }
      }

      // Gnome
      if (state.gnomeActive && Math.hypot(state.gnomeX - x, state.gnomeY - y) < 40) {
        if (state.gnomeIngredient) {
          state.inventory[state.gnomeIngredient] = (state.inventory[state.gnomeIngredient] ?? 0) + 1;
          addMessage(state, `🧙 Gnome gave you ${state.gnomeIngredient.replace(/_/g, ' ')}!`, '#22c55e');
          state.gnomeActive = false;
        }
        return;
      }

      // Cauldron
      const cauldronPos = getCauldronPos(w, h);
      if (Math.hypot(cauldronPos.x - x, cauldronPos.y - y) < 50) {
        const dist = Math.hypot(state.witch.x - cauldronPos.x, state.witch.y - cauldronPos.y);
        if (dist < 100) {
          state.cauldron.isOpen = !state.cauldron.isOpen;
        } else {
          state.witch.targetX = cauldronPos.x + 30;
          state.witch.targetY = cauldronPos.y + 20;
          addMessage(state, '🧙‍♀️ Walking to cauldron…', '#c4b5fd', w / 2, h * 0.4);
        }
        return;
      }

      // Ingredient
      const ingredient = getIngredientAt(state, x, y);
      if (ingredient) {
        const dist = Math.hypot(state.witch.x - ingredient.x, state.witch.y - ingredient.y);
        if (dist < 80) {
          collectIngredient(state, ingredient, ingredient.x, ingredient.y - 30);
        } else {
          state.witch.targetX = ingredient.x;
          state.witch.targetY = ingredient.y;
        }
        return;
      }

      // Walk
      state.witch.targetX = x;
      state.witch.targetY = y;
    }

    function handleMouseDown(e: MouseEvent) {
      isMouseDown = true;
      const { x, y } = getCanvasPos(e);
      const state = stateHolder.current;
      if (!state) return;
      if (state.miniGame.type === null && !state.cauldron.isOpen) {
        state.witch.targetX = x;
        state.witch.targetY = y;
      }
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isMouseDown) return;
      const { x, y } = getCanvasPos(e);
      const state = stateHolder.current;
      if (!state) return;
      if (state.miniGame.type === null && !state.cauldron.isOpen) {
        state.witch.targetX = x;
        state.witch.targetY = y;
      }
    }

    function handleMouseUp() { isMouseDown = false; }

    // ── Witch update ──────────────────────────────────────────────────────────
    function updateWitch(state: GameState) {
      const wt = state.witch;
      const speedBoost = state.activeEffects.some((e) => e.type === 'speed_potion') ? 2 : 1;
      const speed = 3 * speedBoost;
      const dx = wt.targetX - wt.x;
      const dy = wt.targetY - wt.y;
      const dist = Math.hypot(dx, dy);
      if (dist > speed) {
        wt.x += (dx / dist) * speed;
        wt.y += (dy / dist) * speed;
        if (dx > 0) wt.facingRight = true;
        else if (dx < 0) wt.facingRight = false;
        wt.isMoving = true;
        wt.tickCount++;
        if (wt.tickCount > 8) { wt.tickCount = 0; wt.frameIndex = (wt.frameIndex + 1) % 5; }
      } else {
        wt.x = wt.targetX;
        wt.y = wt.targetY;
        wt.isMoving = false;
        wt.tickCount = 0;
        wt.frameIndex = 0;
      }
      // Auto-collect nearby ingredients
      for (const ing of state.worldIngredients) {
        if (ing.collected) continue;
        if (Math.hypot(ing.x - wt.x, ing.y - wt.y) < 36) {
          collectIngredient(state, ing, ing.x, ing.y - 30);
        }
      }
    }

    // ── Draw helpers ──────────────────────────────────────────────────────────
    function drawNightOverlay(state: GameState, w: number, h: number) {
      if (!state.isNight) return;
      const tod = state.timeOfDay;
      let rawAlpha = 0;
      if (tod > 0.65) rawAlpha = (tod - 0.65) / 0.15;
      else if (tod < 0.1) rawAlpha = 1 - tod / 0.1;
      const alpha = Math.min(0.65, rawAlpha * 0.65);
      ctx.save();
      ctx.fillStyle = `rgba(10, 5, 40, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    function drawWitch(state: GameState) {
      if (!img.complete || img.naturalWidth === 0) return;
      const sw = img.width / 5;
      const sh = img.height / 2;
      const wt = state.witch;
      const sx = wt.frameIndex * sw;
      ctx.save();
      if (!wt.facingRight) {
        ctx.translate(wt.x, wt.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, 0, sw, sh, -sw / 2, -sh / 2, sw, sh);
      } else {
        ctx.drawImage(img, sx, 0, sw, sh, wt.x - sw / 2, wt.y - sh / 2, sw, sh);
      }
      ctx.restore();
    }

    function drawNPCs(state: GameState) {
      if (!catFluffyImg.complete || catFluffyImg.naturalWidth === 0) return;
      const sw = catFluffyImg.width / 5;
      const sh = catFluffyImg.height / 2;
      for (const npc of state.npcs) {
        const rowY = npc.type === 'cat' ? 0 : sh;
        const sx = npc.frameIndex * sw;
        // Draw sprite with potential horizontal flip
        ctx.save();
        if (!npc.facingRight) {
          ctx.translate(npc.x, npc.y);
          ctx.scale(-1, 1);
          ctx.drawImage(catFluffyImg, sx, rowY, sw, sh, -sw / 2, -sh, sw, sh);
        } else {
          ctx.drawImage(catFluffyImg, sx, rowY, sw, sh, npc.x - sw / 2, npc.y - sh, sw, sh);
        }
        ctx.restore();

        // Draw carry emoji and speech bubble in world (untransformed) coordinates
        if (npc.isCarryingIngredient && npc.carryIngredient) {
          const info = INGREDIENT_DISPLAY[npc.carryIngredient];
          ctx.font = '20px serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = info.color;
          ctx.fillText(info.emoji, npc.x, npc.y - sh - 8);
        }
        if (npc.speechTimer > 0 && npc.speechBubble) {
          ctx.font = '12px sans-serif';
          const tw = ctx.measureText(npc.speechBubble).width + 14;
          const bx = npc.x - tw / 2;
          const by = npc.y - sh - 40;
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.beginPath();
          ctx.roundRect(bx, by, tw, 22, 5);
          ctx.fill();
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(npc.speechBubble, npc.x, by + 15);
        }
      }
    }

    function drawPrompts(state: GameState) {
      const cauldronPos = getCauldronPos(canvas.width, canvas.height);
      const dist = Math.hypot(state.witch.x - cauldronPos.x, state.witch.y - cauldronPos.y);
      if (dist < 100 && !state.cauldron.isOpen && state.miniGame.type === null) {
        drawActionPrompt(ctx, 'Click Cauldron to Craft', cauldronPos.x, cauldronPos.y - 44);
      }
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    const render = (time: number) => {
      const deltaMs = lastTime > 0 ? Math.min(time - lastTime, 100) : 16;
      lastTime = time;
      const state = stateHolder.current;
      if (!state) { animationFrameId = requestAnimationFrame(render); return; }
      const w = canvas.width;
      const h = canvas.height;

      updateWitch(state);
      updateEvents(state, deltaMs);

      if (state.cauldron.brewing && state.cauldron.brewingTimeLeft <= 0) {
        finishBrewing(state);
      }

      drawBackground(ctx, w, h, time);
      drawNightStars(ctx, state, w, h, time);
      drawNightOverlay(state, w, h);
      drawRainbow(ctx, state, w, h);
      drawRain(ctx, state, w, h, time);

      if (thingsImg.complete && thingsImg.naturalWidth > 0) {
        drawThings(ctx, w, h, thingsImg, things2Img.complete && things2Img.naturalWidth > 0 ? things2Img : undefined);
      }

      const cauldronPos = getCauldronPos(w, h);
      drawCauldronEffect(ctx, state, cauldronPos.x, cauldronPos.y, time);
      drawWorldIngredients(ctx, state, time);
      drawButterflies(ctx, state, time);
      drawFallingStars(ctx, state);
      drawNPCs(state);
      drawWitch(state);
      drawGnome(ctx, state);
      drawPrompts(state);
      drawHUD(ctx, state, w, h);
      drawInventoryBar(ctx, state, w, h);
      drawCauldronUI(ctx, state, w, h);
      drawMiniGameUI(ctx, state, w, h);
      drawMessages(ctx, state, w, h);

      animationFrameId = requestAnimationFrame(render);
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 p-5 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="border-2 border-purple-500 rounded-lg shadow-lg"
      />
    </div>
  );
}
