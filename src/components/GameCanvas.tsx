'use client';

import { useEffect, useRef } from 'react';
import { NavigationMesh, createHutNavMesh } from '@/game/navigation';
import { Position, HutBounds, INGREDIENT_EMOJI, INGREDIENT_GLOW_COLOR } from '@/shared/types';
import { gameState, addToInventory, addStars, setPhase, startBrewing, updateCollectAnimations, addCollectAnimation, completeOrder, getRecipeUnlocks, removeFromInventory } from '@/game/state';
import { updateIngredients, findNearbyIngredient, removeIngredient } from '@/game/ingredients';
import { findMatchingRecipe, consumeRecipeIngredients } from '@/game/recipes';
import { updateOrders, getOrderForRequester, hasMatchingPotion } from '@/game/orders';
import { drawIngredientPickup, drawSparkles, drawBrewingBubbles, drawCollectAnimations, drawCandle, drawFloatingSparkles, drawMoonCrescent, drawStarFlyAnimations } from '@/renderers/effects';
import { drawHud, drawSpeechBubble, HudLayout } from '@/renderers/hud';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let navMesh: NavigationMesh | null = null;
    let hutBounds: HutBounds | null = null;
    let hudLayout: HudLayout | null = null;

    const hutImg = new Image();
    hutImg.src = '/assets/hut.png';

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (hutImg.complete && hutImg.naturalWidth > 0) {
        const scale = canvas.height / hutImg.naturalHeight;
        const drawWidth = hutImg.naturalWidth * scale;
        const drawX = (canvas.width - drawWidth) / 2;
        const yOffset = canvas.height * 0.06;
        navMesh = createHutNavMesh(drawX, 0, drawWidth, canvas.height);
        hutBounds = { hutX: drawX, hutY: 0, hutW: drawWidth, hutH: canvas.height, yOffset };
      }
    };

    updateCanvasSize();
    hutImg.onload = updateCanvasSize;
    window.addEventListener('resize', updateCanvasSize);

    let animationFrameId: number;
    let x = canvas.width / 2;
    let y = canvas.height * 0.9;

    const speed = 3;
    let facingRight = true;
    let isMoving = false;

    let frameIndex = 0;
    let tickCount = 0;
    const ticksPerFrame = 8;
    const numFrames = 5;

    let path: Position[] = [];
    let pathIndex = 0;

    // NPC state
    let npcFrameIndex = 0;
    let npcTickCount = 0;

    let catX = -1;
    let catTargetX = -1;
    let catWaitFrames = 0;
    let catFacingRight = true;
    const catSpeed = 1;

    let monsterX = -1;
    let monsterTargetX = -1;
    let monsterWaitFrames = 0;
    let monsterFacingRight = true;
    const monsterSpeed = 0.5;

    // Sparkle effects for collected ingredients
    let sparkles: { x: number; y: number; color: string; progress: number }[] = [];

    // Flying star animations toward the star counter
    let starFlies: { x: number; y: number; targetX: number; targetY: number; progress: number }[] = [];

    // NPC celebration flip timers (in frames, count down to 0)
    const FLIP_DURATION = 80;
    let catFlipTimer = 0;
    let monsterFlipTimer = 0;

    // Long press tracking
    let pointerDownTimer: ReturnType<typeof setTimeout> | null = null;
    let pointerDownPos: Position | null = null;
    const LONG_PRESS_MS = 500;

    // Brewing timer
    let brewTimer = 0;
    const BREW_BUBBLE_INTERVAL = 80;
    const BREW_BUBBLE_ACTIVE_WINDOW = 40;

    // Cauldron position (updated each frame)
    let cauldronCenterX = 0;
    let cauldronCenterY = 0;

    const getPointerPos = (e: PointerEvent): Position => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: PointerEvent) => {
      const pos = getPointerPos(e);
      pointerDownPos = pos;

      // Start long-press timer
      pointerDownTimer = setTimeout(() => {
        handleLongPress(pos);
      }, LONG_PRESS_MS);

      // Immediate tap actions
      if (gameState.showRecipeBook) {
        gameState.showRecipeBook = false;
        return;
      }

      if (gameState.phase === 'celebrating') return;

      // Check recipe book button
      if (hudLayout) {
        const b = hudLayout.recipeBookBtn;
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
          gameState.showRecipeBook = true;
          return;
        }

        // Tap on brewed potion slot to discard
        const ps = hudLayout.brewedPotionSlot;
        if (ps && pos.x >= ps.x && pos.x <= ps.x + ps.w && pos.y >= ps.y && pos.y <= ps.y + ps.h) {
          gameState.brewedPotion = null;
          return;
        }

        // Tap on inventory slot to discard (decrement stack by 1)
        for (let i = 0; i < hudLayout.inventorySlots.length; i++) {
          const s = hudLayout.inventorySlots[i];
          if (pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) {
            if (gameState.inventory[i]) {
              removeFromInventory(i);
            }
            return;
          }
        }
      }

      // Brewing phase: tap on active bubble
      if (gameState.phase === 'brewing' && gameState.brewingState) {
        if (gameState.brewingState.bubbleActive) {
          gameState.brewingState.hits++;
          gameState.brewingState.bubbleActive = false;
          gameState.brewingState.bubbleIndex++;
          if (gameState.brewingState.bubbleIndex >= gameState.brewingState.totalBubbles) {
            finishBrewing();
          }
        }
        return;
      }

      // Check tap on cauldron (start brewing — need at least 3 ingredients that match a recipe)
      if (hutBounds) {
        const distToCauldron = Math.hypot(pos.x - cauldronCenterX, pos.y - cauldronCenterY);
        if (distToCauldron < 100) {
          const recipe = findMatchingRecipe();
          if (recipe) {
            startBrewing();
            brewTimer = 0;
            // Walk to cauldron first
            if (navMesh) {
              const target = navMesh.nearestWalkablePoint({ x: cauldronCenterX, y: cauldronCenterY });
              path = navMesh.findPath({ x, y }, target);
              pathIndex = 0;
            }
            return;
          }
        }
      }

      // Normal move
      if (navMesh && gameState.phase === 'exploring') {
        const target = navMesh.nearestWalkablePoint(pos);
        path = navMesh.findPath({ x, y }, target);
        pathIndex = 0;
      }
    };

    const handlePointerUp = () => {
      if (pointerDownTimer) {
        clearTimeout(pointerDownTimer);
        pointerDownTimer = null;
      }
      pointerDownPos = null;
    };

    const handleLongPress = (pos: Position) => {
      if (!hutBounds) return;
      const yOffset = hutBounds.yOffset;

      // Check if long-pressing on cat (top floor)
      const catY = canvas.height * 0.48 - yOffset;
      if (catX > 0 && Math.hypot(pos.x - catX, pos.y - catY) < 50) {
        // Pet the cat!
        addStars(1);
        sparkles.push({ x: catX, y: catY - 30, color: '#facc15', progress: 0 });
        return;
      }

      // Check if long-pressing on monster (middle floor)
      const monsterY = canvas.height * 0.66 - yOffset;
      if (monsterX > 0 && Math.hypot(pos.x - monsterX, pos.y - monsterY) < 50) {
        // Pet the monster!
        addStars(1);
        sparkles.push({ x: monsterX, y: monsterY - 30, color: '#facc15', progress: 0 });
        return;
      }

      // Check if long-pressing on NPC with matching potion (delivery)
      if (gameState.brewedPotion) {
        if (catX > 0 && Math.hypot(pos.x - catX, pos.y - catY) < 60 && hasMatchingPotion('cat')) {
          deliverPotion('cat');
          return;
        }
        if (monsterX > 0 && Math.hypot(pos.x - monsterX, pos.y - monsterY) < 60 && hasMatchingPotion('monster')) {
          deliverPotion('monster');
          return;
        }
      }
    };

    const deliverPotion = (requester: 'cat' | 'monster' | 'visitor') => {
      const order = getOrderForRequester(requester);
      if (!order || !gameState.brewedPotion) return;
      const completed = completeOrder(order.id);
      if (completed) {
        const stars = completed.recipe.rewardStars;
        addStars(stars);
        gameState.brewedPotion = null;
        const npcPos = requester === 'cat'
          ? { x: catX, y: canvas.height * 0.48 - (hutBounds?.yOffset || 0) }
          : { x: monsterX, y: canvas.height * 0.66 - (hutBounds?.yOffset || 0) };
        // Trigger NPC backflip
        if (requester === 'cat') catFlipTimer = FLIP_DURATION;
        else monsterFlipTimer = FLIP_DURATION;
        // Celebration sparkle burst
        const burstColors = ['#facc15', '#ec4899', '#a78bfa', '#34d399', '#60a5fa'];
        for (let i = 0; i < 8; i++) {
          sparkles.push({
            x: npcPos.x + (Math.random() - 0.5) * 40,
            y: npcPos.y - 20 + (Math.random() - 0.5) * 30,
            color: burstColors[i % burstColors.length],
            progress: Math.random() * 0.2,
          });
        }
        // Flying stars toward the star counter (approx top-left at (35, 20))
        const numStarFlies = Math.min(stars, 5);
        for (let i = 0; i < numStarFlies; i++) {
          starFlies.push({
            x: npcPos.x + (Math.random() - 0.5) * 30,
            y: npcPos.y - 30,
            targetX: 35,
            targetY: 20,
            progress: i * 0.12,
          });
        }
      }
    };

    const finishBrewing = () => {
      const recipe = findMatchingRecipe();
      if (recipe && gameState.brewingState) {
        const multiplier = Math.max(1, gameState.brewingState.hits);
        const starsEarned = recipe.rewardStars * multiplier;
        addStars(starsEarned);
        gameState.brewedPotion = recipe;
        consumeRecipeIngredients(recipe);
        getRecipeUnlocks();
        // Flying stars from cauldron to star counter
        const numStarFlies = Math.min(starsEarned, 5);
        for (let i = 0; i < numStarFlies; i++) {
          starFlies.push({
            x: cauldronCenterX + (Math.random() - 0.5) * 30,
            y: cauldronCenterY - 20,
            targetX: 35,
            targetY: 20,
            progress: i * 0.15,
          });
        }
      }
      setPhase('exploring');
      gameState.brewingState = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    // Disable context menu on canvas for mobile
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const thingsImg = new Image();
    thingsImg.src = '/assets/things.png';

    const catFluffyImg = new Image();
    catFluffyImg.src = '/assets/catFluffy.png';

    const witchImg = new Image();
    witchImg.src = '/assets/witch.png';

    witchImg.onload = () => {
      const spriteWidth = witchImg.width / 5;
      const spriteHeight = witchImg.height / 2;
      const spriteAspect = spriteWidth / spriteHeight;

      const render = (time: number) => {
        const cw = canvas.width;
        const ch = canvas.height;
        const displayHeight = ch * 0.15;
        const displayWidth = displayHeight * spriteAspect;

        // ── Clear + background ──────────────────────────────────────────
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, cw, ch);

        if (hutImg.complete && hutImg.naturalWidth > 0) {
          const scale = ch / hutImg.naturalHeight;
          const drawWidth = hutImg.naturalWidth * scale;
          const drawX = (cw - drawWidth) / 2;
          ctx.drawImage(hutImg, drawX, 0, drawWidth, ch);
        }

        // ── Hut bounds for positioning ──────────────────────────────────
        if (!hutBounds) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }
        const { hutX, hutW, hutH, yOffset } = hutBounds;
        const scale = ch / hutImg.naturalHeight;

        // ── Static things (cauldron, books) ────────────────────────────
        if (thingsImg.complete && thingsImg.naturalWidth > 0) {
          const w = thingsImg.width;
          const h = thingsImg.height;

          // Cauldron on the bottom floor
          const cauldronSrc = { x: w * 0.25, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
          const caw = cauldronSrc.w * scale * 0.8;
          const cah = cauldronSrc.h * scale * 0.8;
          const cX = hutX + hutW * 0.45 - caw / 2;
          const cY = ch * 0.95 - yOffset - cah;
          ctx.drawImage(thingsImg, cauldronSrc.x, cauldronSrc.y, cauldronSrc.w, cauldronSrc.h, cX, cY, caw, cah);
          cauldronCenterX = cX + caw / 2;
          cauldronCenterY = cY + cah / 2;

          // Books on the top floor
          const booksSrc = { x: w * 0.5, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
          const bw = booksSrc.w * scale * 0.5;
          const bh = booksSrc.h * scale * 0.5;
          const bX = hutX + hutW * 0.55 - bw / 2;
          const bY = ch * 0.48 - yOffset - bh;
          ctx.drawImage(thingsImg, booksSrc.x, booksSrc.y, booksSrc.w, booksSrc.h, bX, bY, bw, bh);
        }

        // ── Visual decorations ─────────────────────────────────────────
        // Candles on each floor
        const candleSize = Math.max(14, ch * 0.025);
        drawCandle(ctx, hutX + hutW * 0.25, ch * 0.88 - yOffset, time, candleSize);
        drawCandle(ctx, hutX + hutW * 0.30, ch * 0.60 - yOffset, time, candleSize);
        drawCandle(ctx, hutX + hutW * 0.25, ch * 0.42 - yOffset, time, candleSize);

        // Moon in the attic window
        drawMoonCrescent(ctx, hutX + hutW * 0.47, ch * 0.18, Math.max(16, ch * 0.03), time);

        // Sparkles around cauldron
        drawFloatingSparkles(ctx, cauldronCenterX, cauldronCenterY - 15, time, 6, 25);

        // ── Ingredient pickups ─────────────────────────────────────────
        updateIngredients(hutBounds);
        const ingredientFontSize = Math.max(18, ch * 0.03);
        for (const ing of gameState.ingredients) {
          drawIngredientPickup(ctx, ing, ingredientFontSize);
        }

        // ── Nav mesh debug (commented for production) ──────────────────
        // if (navMesh) navMesh.debugDraw(ctx);

        // ── Update orders ─────────────────────────────────────────────
        updateOrders();

        // ── Celebrating phase ─────────────────────────────────────────
        if (gameState.phase === 'celebrating') {
          gameState.celebrateTimer--;
          if (gameState.celebrateTimer <= 0) {
            setPhase('exploring');
            getRecipeUnlocks();
          }
        }

        // ── Brewing update ────────────────────────────────────────────
        if (gameState.phase === 'brewing' && gameState.brewingState) {
          brewTimer++;
          const bs = gameState.brewingState;
          const bubblePhase = brewTimer % BREW_BUBBLE_INTERVAL;
          bs.bubbleTimer = brewTimer;
          bs.bubbleActive = bubblePhase > BREW_BUBBLE_INTERVAL - BREW_BUBBLE_ACTIVE_WINDOW;

          // Auto-advance if player misses the window
          if (bubblePhase === 0 && brewTimer > 0) {
            if (bs.bubbleActive) {
              bs.bubbleActive = false;
              bs.bubbleIndex++;
              if (bs.bubbleIndex >= bs.totalBubbles) {
                finishBrewing();
              }
            }
          }

          drawBrewingBubbles(
            ctx, cauldronCenterX, cauldronCenterY - 30,
            bs.bubbleIndex, bs.bubbleTimer, bs.bubbleActive, bs.totalBubbles,
          );
        }

        // ── Witch movement ────────────────────────────────────────────
        if (pathIndex < path.length) {
          const wp = path[pathIndex];
          const dx = wp.x - x;
          const dy = wp.y - y;
          const dist = Math.hypot(dx, dy);

          if (dist <= speed) {
            x = wp.x;
            y = wp.y;
            pathIndex++;
            isMoving = pathIndex < path.length;
          } else {
            x += (dx / dist) * speed;
            y += (dy / dist) * speed;
            if (dx > 0) facingRight = true;
            else if (dx < 0) facingRight = false;
            isMoving = true;
          }

          if (isMoving) {
            tickCount++;
            if (tickCount > ticksPerFrame) {
              tickCount = 0;
              frameIndex = (frameIndex + 1) % numFrames;
            }
          }
        } else {
          isMoving = false;
          tickCount = 0;
          frameIndex = 0;
        }

        // ── Auto-collect nearby ingredients ──────────────────────────
        if (gameState.phase === 'exploring') {
          const nearby = findNearbyIngredient(x, y, 40);
          if (nearby && addToInventory(nearby.type)) {
              addCollectAnimation({
                emoji: INGREDIENT_EMOJI[nearby.type],
                x: nearby.position.x,
                y: nearby.position.y,
                targetX: cw - 80,
                targetY: 30,
                progress: 0,
              });
              sparkles.push({
                x: nearby.position.x,
                y: nearby.position.y,
                color: INGREDIENT_GLOW_COLOR[nearby.type],
                progress: 0,
              });
              removeIngredient(nearby.id);
          }
        }

        // ── Draw witch ─────────────────────────────────────────────────
        const sx = frameIndex * spriteWidth;
        const sy = 0;

        ctx.save();
        if (!facingRight) {
          ctx.translate(x, y);
          ctx.scale(-1, 1);
          ctx.drawImage(witchImg, sx, sy, spriteWidth, spriteHeight, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
        } else {
          ctx.drawImage(witchImg, sx, sy, spriteWidth, spriteHeight, x - displayWidth / 2, y - displayHeight / 2, displayWidth, displayHeight);
        }
        ctx.restore();

        // ── Draw NPCs ──────────────────────────────────────────────────
        if (catFluffyImg.complete && catFluffyImg.naturalWidth > 0) {
          const npcSpriteW = catFluffyImg.width / 5;
          const npcSpriteH = catFluffyImg.height / 2;
          const displayW = npcSpriteW * scale * 0.5;
          const displayH = npcSpriteH * scale * 0.5;

          const getRandomX = (minPCT: number, maxPCT: number) => {
            return hutX + hutW * (minPCT + Math.random() * (maxPCT - minPCT));
          };

          // Cat (top floor)
          if (catX === -1) {
            catX = getRandomX(0.2, 0.7);
            catTargetX = catX;
          }
          if (catWaitFrames > 0) {
            catWaitFrames--;
          } else {
            const dx = catTargetX - catX;
            if (Math.abs(dx) <= catSpeed) {
              catX = catTargetX;
              catWaitFrames = 60 + Math.random() * 120;
              catTargetX = getRandomX(0.2, 0.7);
              catFacingRight = catTargetX > catX;
            } else {
              catX += Math.sign(dx) * catSpeed;
            }
          }

          // Monster (middle floor)
          if (monsterX === -1) {
            monsterX = getRandomX(0.25, 0.65);
            monsterTargetX = monsterX;
          }
          if (monsterWaitFrames > 0) {
            monsterWaitFrames--;
          } else {
            const dx = monsterTargetX - monsterX;
            if (Math.abs(dx) <= monsterSpeed) {
              monsterX = monsterTargetX;
              monsterWaitFrames = 100 + Math.random() * 200;
              monsterTargetX = getRandomX(0.25, 0.65);
              monsterFacingRight = monsterTargetX > monsterX;
            } else {
              monsterX += Math.sign(dx) * monsterSpeed;
            }
          }

          // Animation ticks
          if (catWaitFrames === 0 || monsterWaitFrames === 0) {
            npcTickCount++;
            if (npcTickCount > 10) {
              npcTickCount = 0;
              npcFrameIndex = (npcFrameIndex + 1) % 5;
            }
          }

          const catAnimIndex = catWaitFrames > 0 ? 0 : npcFrameIndex;
          const monsterAnimIndex = monsterWaitFrames > 0 ? 0 : npcFrameIndex;
          const catSX = catAnimIndex * npcSpriteW;
          const monsterSX = monsterAnimIndex * npcSpriteW;
          const catY = ch * 0.48 - yOffset;
          const monsterY = ch * 0.66 - yOffset;

          // Draw Cat
          ctx.save();
          if (catFlipTimer > 0) {
            const flipAngle = ((FLIP_DURATION - catFlipTimer) / FLIP_DURATION) * Math.PI * 4;
            ctx.translate(catX, catY - displayH / 2);
            ctx.rotate(flipAngle);
            ctx.drawImage(catFluffyImg, catSX, 0, npcSpriteW, npcSpriteH, -displayW / 2, -displayH / 2, displayW, displayH);
            catFlipTimer--;
          } else if (catFacingRight) {
            ctx.drawImage(catFluffyImg, catSX, 0, npcSpriteW, npcSpriteH, catX - displayW / 2, catY - displayH, displayW, displayH);
          } else {
            ctx.translate(catX, catY);
            ctx.scale(-1, 1);
            ctx.drawImage(catFluffyImg, catSX, 0, npcSpriteW, npcSpriteH, -displayW / 2, -displayH, displayW, displayH);
          }
          ctx.restore();

          // Draw monster
          ctx.save();
          if (monsterFlipTimer > 0) {
            const flipAngle = ((FLIP_DURATION - monsterFlipTimer) / FLIP_DURATION) * Math.PI * 4;
            ctx.translate(monsterX, monsterY - displayH / 2);
            ctx.rotate(flipAngle);
            ctx.drawImage(catFluffyImg, monsterSX, npcSpriteH, npcSpriteW, npcSpriteH, -displayW / 2, -displayH / 2, displayW, displayH);
            monsterFlipTimer--;
          } else if (monsterFacingRight) {
            ctx.drawImage(catFluffyImg, monsterSX, npcSpriteH, npcSpriteW, npcSpriteH, monsterX - displayW / 2, monsterY - displayH, displayW, displayH);
          } else {
            ctx.translate(monsterX, monsterY);
            ctx.scale(-1, 1);
            ctx.drawImage(catFluffyImg, monsterSX, npcSpriteH, npcSpriteW, npcSpriteH, -displayW / 2, -displayH, displayW, displayH);
          }
          ctx.restore();

          // Order speech bubbles
          const bubbleSize = Math.max(20, ch * 0.035);
          const catOrder = getOrderForRequester('cat');
          if (catOrder) {
            drawSpeechBubble(ctx, catX, catY - displayH - 10, catOrder.recipe.emoji, bubbleSize);
          }
          const monsterOrder = getOrderForRequester('monster');
          if (monsterOrder) {
            drawSpeechBubble(ctx, monsterX, monsterY - displayH - 10, monsterOrder.recipe.emoji, bubbleSize);
          }
        }

        // ── Sparkle effects ──────────────────────────────────────────
        for (const sp of sparkles) {
          drawSparkles(ctx, sp.x, sp.y, sp.color, sp.progress);
          sp.progress += 0.025;
        }
        sparkles = sparkles.filter(s => s.progress < 1);

        // ── Flying star animations ────────────────────────────────────
        for (const sf of starFlies) {
          sf.progress += 0.018;
        }
        starFlies = starFlies.filter(sf => sf.progress < 1);
        drawStarFlyAnimations(ctx, starFlies);

        // ── Collect animations ──────────────────────────────────────
        updateCollectAnimations();
        drawCollectAnimations(ctx, gameState.collectAnimations, ingredientFontSize);

        // ── HUD ───────────────────────────────────────────────────────
        hudLayout = drawHud(ctx, gameState, cw, ch);

        animationFrameId = requestAnimationFrame(render);
      };

      requestAnimationFrame(render);
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center touch-none">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
