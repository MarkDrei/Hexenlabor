'use client';

import { useEffect, useRef } from 'react';
import { NavigationMesh, createHutNavMesh, getHutExitZone } from '@/game/navigation';
import { Position, HutBounds, Rect, INGREDIENT_EMOJI, INGREDIENT_GLOW_COLOR } from '@/shared/types';
import { gameState, addToInventory, addStars, setPhase, startBrewing, updateCollectAnimations, addCollectAnimation, completeOrder, getRecipeUnlocks, removeFromInventory } from '@/game/state';
import { updateIngredients, findNearbyIngredient, removeIngredient } from '@/game/ingredients';
import { findMatchingRecipe, consumeRecipeIngredients, getAllRecipesForDisplay } from '@/game/recipes';
import { updateOrders, getOrderForRequester, hasMatchingPotion } from '@/game/orders';
import { createMiniGameState, flapMiniGame, getMiniGameRewards, MiniGameState, updateMiniGame } from '@/game/minigame';
import { drawIngredientPickup, drawSparkles, drawBrewingBubbles, drawCollectAnimations, drawStarFlyAnimations } from '@/renderers/effects';
import { drawHud, drawSpeechBubble, HudLayout } from '@/renderers/hud';
import { drawBackground } from '@/renderers/background';

const LONG_PRESS_MS = 500;
const WITCH_RETURN_X_RATIO = 0.24;
const WITCH_RETURN_Y_RATIO = 0.90;
const INGREDIENT_OVERFLOW_STAR_VALUE = 2;
const CLOUD_TRAVEL_WIDTH = 200;
const CLOUD_SPEED = 0.03;
const CLOUD_WRAP_BUFFER = 260;
const CLOUD_BASE_OFFSET = 130;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let navMesh: NavigationMesh | null = null;
    let hutBounds: HutBounds | null = null;
    let exitZone: Rect | null = null;
    let hudLayout: HudLayout | null = null;
    let exitPromptButtons: { start: Rect; cancel: Rect } | null = null;
    let miniGame: MiniGameState | null = null;
    let miniGameRewardButton: Rect | null = null;

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
        exitZone = getHutExitZone(drawX, 0, drawWidth, canvas.height);
      }

      if (miniGame) {
        miniGame = createMiniGameState(canvas.width, canvas.height);
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

    // Brewing timer
    let brewTimer = 0;
    const BREW_BUBBLE_INTERVAL = 80;
    const BREW_BUBBLE_ACTIVE_WINDOW = 40;
    // Witch must be within this distance of the cauldron center to start brewing
    const CAULDRON_BREW_PROXIMITY = 80;
    let pendingBrew = false;

    // Cauldron position (updated each frame; cauldronReady becomes true after first draw)
    let cauldronCenterX = 0;
    let cauldronCenterY = 0;
    let cauldronReady = false;

    const getPointerPos = (e: PointerEvent): Position => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const isInsideRect = (pos: Position, rect: Rect | null) => {
      return !!rect && pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;
    };

    const moveWitchBackInside = () => {
      if (!hutBounds) return;
      x = hutBounds.hutX + hutBounds.hutW * WITCH_RETURN_X_RATIO;
      y = hutBounds.hutH * WITCH_RETURN_Y_RATIO - hutBounds.yOffset;
      path = [];
      pathIndex = 0;
      pendingBrew = false;
    };

    const startMiniGame = () => {
      miniGame = createMiniGameState(canvas.width, canvas.height);
      gameState.showRecipeBook = false;
      exitPromptButtons = null;
      miniGameRewardButton = null;
      facingRight = true;
      setPhase('minigame');
    };

    const cancelExitPrompt = () => {
      moveWitchBackInside();
      exitPromptButtons = null;
      setPhase('exploring');
    };

    const finishMiniGame = () => {
      if (!miniGame) {
        setPhase('exploring');
        return;
      }

      const rewards = getMiniGameRewards(miniGame);
      if (rewards.stars > 0) {
        addStars(rewards.stars);
      }

      let overflowStars = 0;
      for (const ingredient of rewards.ingredients) {
        if (!addToInventory(ingredient)) {
          overflowStars += INGREDIENT_OVERFLOW_STAR_VALUE;
        }
      }
      if (overflowStars > 0) {
        addStars(overflowStars);
      }

      miniGame = null;
      miniGameRewardButton = null;
      moveWitchBackInside();
      setPhase('exploring');
    };

    const handlePointerDown = (e: PointerEvent) => {
      const pos = getPointerPos(e);
      pointerDownPos = pos;

      if (gameState.phase === 'confirmingExit') {
        if (exitPromptButtons) {
          if (isInsideRect(pos, exitPromptButtons.start)) {
            startMiniGame();
          } else if (isInsideRect(pos, exitPromptButtons.cancel)) {
            cancelExitPrompt();
          }
        }
        return;
      }

      if (gameState.phase === 'minigame') {
        if (miniGame?.status === 'crashed') {
          if (isInsideRect(pos, miniGameRewardButton)) {
            finishMiniGame();
          }
          return;
        }
        if (miniGame) {
          flapMiniGame(miniGame);
        }
        return;
      }

      // Start long-press timer
      pointerDownTimer = setTimeout(() => {
        handleLongPress(pos);
      }, LONG_PRESS_MS);

      // Immediate tap actions
      if (gameState.showRecipeBook) {
        // Check if a specific (non-locked) recipe card was tapped
        if (hudLayout && hudLayout.recipeBookSlots.length > 0) {
          const recipes = getAllRecipesForDisplay();
          for (let i = 0; i < hudLayout.recipeBookSlots.length; i++) {
            const s = hudLayout.recipeBookSlots[i];
            if (pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) {
              const r = recipes[i];
              if (!r.locked) {
                // Toggle: tapping the already-selected recipe deselects it
                gameState.selectedRecipe = gameState.selectedRecipe?.id === r.id ? null : r;
              }
              break;
            }
          }
        }
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

      // Check tap on cauldron (walk to cauldron first — brewing starts once the witch arrives)
      if (hutBounds) {
        const distToCauldron = Math.hypot(pos.x - cauldronCenterX, pos.y - cauldronCenterY);
        if (distToCauldron < 100) {
          const recipe = findMatchingRecipe();
          if (recipe) {
            pendingBrew = true;
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

      const catY = canvas.height * 0.48 - yOffset;
      const monsterY = canvas.height * 0.66 - yOffset;

      // Check potion delivery FIRST so it takes priority over petting
      if (gameState.brewedPotion) {
        if (catX > 0 && Math.hypot(pos.x - catX, pos.y - catY) < 80 && hasMatchingPotion('cat')) {
          deliverPotion('cat');
          return;
        }
        if (monsterX > 0 && Math.hypot(pos.x - monsterX, pos.y - monsterY) < 80 && hasMatchingPotion('monster')) {
          deliverPotion('monster');
          return;
        }
      }

      // Check if long-pressing on cat (top floor) — pet
      if (catX > 0 && Math.hypot(pos.x - catX, pos.y - catY) < 50) {
        addStars(1);
        sparkles.push({ x: catX, y: catY - 30, color: '#facc15', progress: 0 });
        return;
      }

      // Check if long-pressing on monster (middle floor) — pet
      if (monsterX > 0 && Math.hypot(pos.x - monsterX, pos.y - monsterY) < 50) {
        addStars(1);
        sparkles.push({ x: monsterX, y: monsterY - 30, color: '#facc15', progress: 0 });
        return;
      }
    };

    const drawActionButton = (
      label: string,
      rect: Rect,
      fillStyle: string,
      strokeStyle: string,
      fontSize: number,
    ) => {
      ctx.save();
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 3;
      ctx.shadowColor = strokeStyle;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.restore();
    };

    const drawExitPortal = (time: number) => {
      if (!exitZone) return;

      const portalX = exitZone.x + exitZone.w * 0.18;
      const portalY = exitZone.y + exitZone.h * 0.45;
      const radius = Math.max(18, exitZone.h * 0.55);
      const pulse = 0.85 + Math.sin(time * 0.004) * 0.15;

      ctx.save();
      const gradient = ctx.createRadialGradient(portalX, portalY, radius * 0.2, portalX, portalY, radius * 1.4);
      gradient.addColorStop(0, `rgba(236, 72, 153, ${0.65 * pulse})`);
      gradient.addColorStop(0.6, `rgba(124, 58, 237, ${0.55 * pulse})`);
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(portalX, portalY, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(portalX, portalY, radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = `bold ${Math.max(14, radius * 0.7)}px sans-serif`;
      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ Raus', portalX + radius * 1.1, portalY);
      ctx.restore();
    };

    const drawExitPrompt = (cw: number, ch: number) => {
      const cardW = Math.min(440, cw * 0.86);
      const cardH = Math.min(300, ch * 0.42);
      const cardX = (cw - cardW) / 2;
      const cardY = (ch - cardH) / 2;
      const btnW = (cardW - 48) / 2;
      const btnH = 58;
      const start = { x: cardX + 18, y: cardY + cardH - btnH - 18, w: btnW, h: btnH };
      const cancel = { x: cardX + cardW - btnW - 18, y: start.y, w: btnW, h: btnH };
      exitPromptButtons = { start, cancel };

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = `bold ${Math.max(24, ch * 0.035)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('🌙 Die Hütte verlassen?', cw / 2, cardY + 24);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${Math.max(16, ch * 0.022)}px sans-serif`;
      ctx.fillText('Draußen wartet ein flatteriges Flug-Abenteuer.', cw / 2, cardY + 84);
      ctx.fillText('Sammle Sterne, Zutaten und magische Extras!', cw / 2, cardY + 116);

      drawActionButton('🚀 Losfliegen', start, 'rgba(16, 185, 129, 0.82)', '#34d399', Math.max(18, ch * 0.024));
      drawActionButton('🏠 Drinnen bleiben', cancel, 'rgba(71, 85, 105, 0.82)', '#94a3b8', Math.max(17, ch * 0.022));
      ctx.restore();
    };

    const drawMiniGame = (
      time: number,
      cw: number,
      ch: number,
      displayWidth: number,
      displayHeight: number,
      spriteWidth: number,
      spriteHeight: number,
    ) => {
      if (!miniGame) return;

      miniGame.width = cw;
      miniGame.height = ch;
      miniGame.witchX = cw * 0.35;

      const result = miniGame.status === 'running' ? updateMiniGame(miniGame) : null;
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(0.45, '#1d4ed8');
      sky.addColorStop(1, '#7c3aed');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      const moonX = cw * 0.78;
      const moonY = ch * 0.14;
      ctx.save();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, Math.max(26, cw * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(moonX + 14, moonY - 6, Math.max(18, cw * 0.045), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (let i = 0; i < 28; i++) {
        const starX = (i * 97 + Math.sin(time * 0.0015 + i) * 22 + cw) % cw;
        const starY = (i * 57 + (time * 0.02 * (1 + (i % 3) * 0.25))) % ch;
        const size = 1.5 + (i % 3);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + ((i % 5) * 0.1)})`;
        ctx.fillRect(starX, starY, size, size);
      }

      for (let i = 0; i < 3; i++) {
        const cloudX = ((cw + CLOUD_TRAVEL_WIDTH) - ((time * CLOUD_SPEED * (i + 1)) % (cw + CLOUD_WRAP_BUFFER)))
          - CLOUD_BASE_OFFSET;
        const cloudY = ch * (0.18 + i * 0.16);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, 70, 24, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX + 36, cloudY + 6, 52, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX - 34, cloudY + 8, 48, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const obstacle of miniGame.obstacles) {
        const topHeight = obstacle.gapY;
        const bottomY = obstacle.gapY + obstacle.gapHeight;
        const bottomHeight = ch - bottomY;

        ctx.save();
        ctx.fillStyle = '#14532d';
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(obstacle.x, 0, obstacle.width, topHeight, 20);
        ctx.roundRect(obstacle.x, bottomY, obstacle.width, bottomHeight, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(167, 243, 208, 0.45)';
        ctx.fillRect(obstacle.x + 8, 0, 10, topHeight);
        ctx.fillRect(obstacle.x + 8, bottomY, 10, bottomHeight);
        ctx.restore();

        const collectible = obstacle.collectible;
        if (collectible && !collectible.collected) {
          const cx = obstacle.x + obstacle.width / 2;
          const bobY = collectible.y + Math.sin(time * 0.006 + obstacle.x * 0.03) * 8;
          ctx.save();
          ctx.font = `${Math.max(24, ch * 0.038)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            collectible.kind === 'star'
              ? '⭐'
              : collectible.kind === 'shield'
                ? '🫧'
                : INGREDIENT_EMOJI[collectible.ingredientType!],
            cx,
            bobY,
          );
          ctx.restore();
        }
      }

      const witchAngle = Math.max(-0.55, Math.min(0.7, miniGame.witchVelocity * 0.08));
      ctx.save();
      ctx.translate(miniGame.witchX, miniGame.witchY);
      ctx.rotate(witchAngle);
      if (!facingRight) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        witchImg,
        spriteWidth,
        0,
        spriteWidth,
        spriteHeight,
        -displayWidth / 2,
        -displayHeight / 2,
        displayWidth,
        displayHeight,
      );
      ctx.restore();

      if (result?.collectedStar) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.beginPath();
        ctx.arc(miniGame.witchX, miniGame.witchY, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
      ctx.beginPath();
      ctx.roundRect(16, 16, Math.min(260, cw * 0.58), 108, 18);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${Math.max(20, ch * 0.03)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`🧹 Fluglauf ${miniGame.score}`, 28, 28);
      ctx.fillText(`⭐ Bonus ${miniGame.starsCollected}`, 28, 58);
      ctx.fillText(`🛡️ Schild ${miniGame.shieldCharges > 0 ? 'bereit' : 'leer'}`, 28, 88);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`Combo x${Math.max(1, miniGame.combo)}`, Math.min(260, cw * 0.58), 28);
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText(`Beste Serie ${miniGame.bestCombo}`, Math.min(260, cw * 0.58), 58);
      ctx.restore();

      if (miniGame.status === 'running' && miniGame.frames < 180) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
        ctx.beginPath();
        ctx.roundRect(cw * 0.12, ch * 0.78, cw * 0.76, 76, 20);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(18, ch * 0.024)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tippe irgendwo, damit die Hexe flattert!', cw / 2, ch * 0.78 + 30);
        ctx.font = `${Math.max(15, ch * 0.02)}px sans-serif`;
        ctx.fillText('Sammle Sterne, Zutaten und Schildblasen zwischen den Hecken.', cw / 2, ch * 0.78 + 56);
        ctx.restore();
      }

      if (miniGame.status === 'crashed') {
        const rewards = getMiniGameRewards(miniGame);
        const button = {
          x: cw * 0.18,
          y: ch * 0.72,
          w: cw * 0.64,
          h: 60,
        };
        miniGameRewardButton = button;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cw * 0.10, ch * 0.18, cw * 0.80, ch * 0.54, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(28, ch * 0.04)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('💥 Landung im Gebüsch!', cw / 2, ch * 0.22);
        ctx.font = `${Math.max(18, ch * 0.024)}px sans-serif`;
        ctx.fillText(`⭐ ${rewards.stars} Sterne`, cw / 2, ch * 0.31);
        ctx.fillText(`🧺 ${rewards.ingredients.length} Zutaten`, cw / 2, ch * 0.36);

        const ingredientLine = rewards.ingredients.length > 0
          ? rewards.ingredients.map(type => INGREDIENT_EMOJI[type]).join(' ')
          : 'Noch keine Zutaten diesmal';
        ctx.font = `${Math.max(24, ch * 0.03)}px serif`;
        ctx.fillText(ingredientLine, cw / 2, ch * 0.46);
        ctx.font = `${Math.max(16, ch * 0.021)}px sans-serif`;
        ctx.fillText('Die Belohnung kommt mit zurück in die Hütte.', cw / 2, ch * 0.54);

        drawActionButton('🎁 Einsammeln & zurück', button, 'rgba(250, 204, 21, 0.85)', '#fde68a', Math.max(18, ch * 0.023));
        ctx.restore();
      } else {
        miniGameRewardButton = null;
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
        // Always reset the selected recipe after brewing
        gameState.selectedRecipe = null;
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
        drawBackground(ctx, cw, ch, time);

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

        if (gameState.phase === 'minigame') {
          drawMiniGame(time, cw, ch, displayWidth, displayHeight, spriteWidth, spriteHeight);
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        // ── Static things (cauldron) ──────────────────────────────────
        if (thingsImg.complete && thingsImg.naturalWidth > 0) {
          const w = thingsImg.width;
          const h = thingsImg.height;

          // Cauldron on the bottom floor (clip 120px off the left, 10px off the top of the source region)
          const cauldronSrc = { x: w * 0.25 + 120, y: h * 0.5 + 10, w: w * 0.25 - 120, h: h * 0.5 - 10 };
          const caw = cauldronSrc.w * scale * 0.8;
          const cah = cauldronSrc.h * scale * 0.8;
          const cX = hutX + hutW * 0.45 - caw / 2;
          const cY = ch * 0.95 - yOffset - cah;
          ctx.drawImage(thingsImg, cauldronSrc.x, cauldronSrc.y, cauldronSrc.w, cauldronSrc.h, cX, cY, caw, cah);
          cauldronCenterX = cX + caw / 2;
          cauldronCenterY = cY + cah / 2;
          cauldronReady = true;
        }

        drawExitPortal(time);

        // ── Ingredient pickups ─────────────────────────────────────────
        if (gameState.phase !== 'confirmingExit') {
          updateIngredients(hutBounds);
        }
        const ingredientFontSize = Math.max(18, ch * 0.03);
        for (const ing of gameState.ingredients) {
          drawIngredientPickup(ctx, ing, ingredientFontSize);
        }

        // ── Nav mesh debug (commented for production) ──────────────────
        // if (navMesh) navMesh.debugDraw(ctx);

        // ── Update orders ─────────────────────────────────────────────
        if (gameState.phase !== 'confirmingExit') {
          updateOrders();
        }

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

          const phaseProgress = (brewTimer % BREW_BUBBLE_INTERVAL) / BREW_BUBBLE_INTERVAL;
          drawBrewingBubbles(
            ctx, cauldronCenterX, cauldronCenterY - 30,
            bs.bubbleIndex, bs.bubbleTimer, bs.bubbleActive, bs.totalBubbles,
            phaseProgress, bs.recipeId, brewTimer,
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
          // Auto-start brewing when witch arrives near the cauldron
          if (pendingBrew && cauldronReady) {
            const distToCauldron = Math.hypot(x - cauldronCenterX, y - cauldronCenterY);
            if (distToCauldron < CAULDRON_BREW_PROXIMITY) {
              const recipe = findMatchingRecipe();
              if (recipe) {
                startBrewing(recipe.id);
                brewTimer = 0;
              }
            }
            pendingBrew = false;
          }

          if (gameState.phase === 'exploring' && exitZone && isInsideRect({ x, y }, exitZone)) {
            setPhase('confirmingExit');
          }
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

          // Monster (middle floor)
          if (monsterX === -1) {
            monsterX = getRandomX(0.25, 0.65);
            monsterTargetX = monsterX;
          }

          // NPC Y positions (shared by movement + draw + proximity checks)
          const catY = ch * 0.48 - yOffset;
          const monsterY = ch * 0.66 - yOffset;

          // Freeze NPCs when witch is nearby so potion delivery is reliable
          const witchNearCat = Math.hypot(x - catX, y - catY) < 120;
          const witchNearMonster = Math.hypot(x - monsterX, y - monsterY) < 120;

          if (!witchNearCat) {
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
          }

          if (!witchNearMonster) {
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

        if (gameState.phase === 'confirmingExit') {
          drawExitPrompt(cw, ch);
        } else {
          exitPromptButtons = null;
        }

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
