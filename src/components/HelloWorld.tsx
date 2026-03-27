'use client';

import { useEffect, useRef } from 'react';
// import { drawBackground } from '@/renderers/background';
// import { drawThings } from '@/renderers/things';
import { NavigationMesh, createHutNavMesh } from '@/game/navigation';
import { Position } from '@/shared/types';

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full screen minus a small gap
    let navMesh: NavigationMesh | null = null;

    const hutImg = new Image();
    hutImg.src = '/assets/hut.png';

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth - 40;
      canvas.height = window.innerHeight - 40;
      
      if (hutImg.complete && hutImg.naturalWidth > 0) {
        const scale = canvas.height / hutImg.naturalHeight;
        const drawWidth = hutImg.naturalWidth * scale;
        const drawX = (canvas.width - drawWidth) / 2;
        navMesh = createHutNavMesh(drawX, 0, drawWidth, canvas.height);
      }
    };
    
    // We will update canvas size right away, but mesh will wait for hutImg
    updateCanvasSize();
    hutImg.onload = updateCanvasSize;
    window.addEventListener('resize', updateCanvasSize);

    let animationFrameId: number;
    // Initial position in centre
    let x = canvas.width / 2;
    let y = canvas.height / 2;

    const speed = 3;
    let facingRight = true;
    let isMoving = false;

    let frameIndex = 0;
    let tickCount = 0;
    const ticksPerFrame = 8;
    const numFrames = 5;

    // Path-following state
    let path: Position[] = [];
    let pathIndex = 0;

    // NPC State
    let npcFrameIndex = 0;
    let npcTickCount = 0;

    // Cat state (top floor)
    let catX = -1;
    let catTargetX = -1;
    let catWaitFrames = 0;
    let catFacingRight = true;
    const catSpeed = 1;

    // Monster state (middle floor)
    let monsterX = -1;
    let monsterTargetX = -1;
    let monsterWaitFrames = 0;
    let monsterFacingRight = true;
    const monsterSpeed = 0.5;

    // Helper to get mouse position relative to canvas
    const getMouseCanvasPos = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // On click: compute A* path to the nearest walkable point
    const handleMouseDown = (e: MouseEvent) => {
      if (!navMesh) return;
      const pos = getMouseCanvasPos(e);
      const target = navMesh.nearestWalkablePoint(pos);
      path = navMesh.findPath({ x, y }, target);
      pathIndex = 0;
    };

    canvas.addEventListener('mousedown', handleMouseDown);

    const thingsImg = new Image();
    thingsImg.src = '/assets/things.png';

    const things2Img = new Image();
    things2Img.src = '/assets/things2.png';

    const catFluffyImg = new Image();
    catFluffyImg.src = '/assets/catFluffy.png';

    const img = new Image();
    img.src = '/assets/witch.png';
    img.onload = () => {
      const spriteWidth = img.width / 5;
      const spriteHeight = img.height / 2;
      // Keep the sprite aspect ratio; display height scales to 15% of canvas height.
      const spriteAspect = spriteWidth / spriteHeight;

      const render = (time: number) => {
        // Witch display size: 15% of current canvas height, proportional width
        const displayHeight = canvas.height * 0.15;
        const displayWidth = displayHeight * spriteAspect;
        // Draw hut as background scaled to full height
        if (hutImg.complete && hutImg.naturalWidth > 0) {
          const scale = canvas.height / hutImg.naturalHeight;
          const drawWidth = hutImg.naturalWidth * scale;
          const drawX = (canvas.width - drawWidth) / 2;
          ctx.drawImage(hutImg, drawX, 0, drawWidth, canvas.height);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // drawBackground(ctx, canvas.width, canvas.height, time);

        // Draw static environment things
        if (thingsImg.complete && thingsImg.naturalWidth > 0 && hutImg.complete && hutImg.naturalWidth > 0) {
          const scale = canvas.height / hutImg.naturalHeight;
          const drawWidth = hutImg.naturalWidth * scale;
          const drawX = (canvas.width - drawWidth) / 2;
          const yOffset = canvas.height * 0.06;

          const w = thingsImg.width;
          const h = thingsImg.height;

          // Cauldron on the bottom floor
          const cauldronSrc = { x: w * 0.25, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
          const caw = cauldronSrc.w * scale * 0.8;
          const cah = cauldronSrc.h * scale * 0.8;
          // Center cauldron horizontally in the bottom room roughly
          const cX = drawX + drawWidth * 0.45 - caw / 2;
          // Sit on the ground floor level (y = 0.95 * hutH - offset)
          const cY = canvas.height * 0.95 - yOffset - cah; 
          ctx.drawImage(thingsImg, cauldronSrc.x, cauldronSrc.y, cauldronSrc.w, cauldronSrc.h, cX, cY, caw, cah);

          // Books on the top floor
          const booksSrc = { x: w * 0.5, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
          const bw = booksSrc.w * scale * 0.5;
          const bh = booksSrc.h * scale * 0.5;
          const bX = drawX + drawWidth * 0.55 - bw / 2;
          // Sit on the top floor level (y = 0.48 * hutH - offset)
          const bY = canvas.height * 0.48 - yOffset - bh;
          ctx.drawImage(thingsImg, booksSrc.x, booksSrc.y, booksSrc.w, booksSrc.h, bX, bY, bw, bh);
        }

        // Draw walkable navigation shape behind the witch
        if (navMesh) {
          navMesh.debugDraw(ctx);
        }

        // ── Update witch movement along the A* path ──────────────────────
        if (pathIndex < path.length) {
          const wp = path[pathIndex];
          const dx = wp.x - x;
          const dy = wp.y - y;
          const dist = Math.hypot(dx, dy);

          if (dist <= speed) {
            // Reached this waypoint – snap and advance
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
          // Arrived – idle
          isMoving = false;
          tickCount = 0;
          frameIndex = 0;
        }

        const sx = frameIndex * spriteWidth;
        const sy = 0; // Top row

        ctx.save();
        if (!facingRight) {
          // Flip horizontally centered on position
          ctx.translate(x, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, sx, sy, spriteWidth, spriteHeight, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
        } else {
          // Draw at position (centered)
          ctx.drawImage(img, sx, sy, spriteWidth, spriteHeight, x - displayWidth / 2, y - displayHeight / 2, displayWidth, displayHeight);
        }
        ctx.restore();

        // Draw new NPCs
        if (catFluffyImg.complete && catFluffyImg.naturalWidth > 0 && hutImg.complete && hutImg.naturalWidth > 0) {
          const scale = canvas.height / hutImg.naturalHeight;
          const drawWidth = hutImg.naturalWidth * scale;
          const drawX = (canvas.width - drawWidth) / 2;
          const yOffset = canvas.height * 0.06;

          const npcSpriteW = catFluffyImg.width / 5;
          const npcSpriteH = catFluffyImg.height / 2;
          // Scale to fit logically
          const displayW = npcSpriteW * scale * 0.5;
          const displayH = npcSpriteH * scale * 0.5;

          // Helper to get random X on a given floor range
          const getRandomX = (minPCT: number, maxPCT: number) => {
            return drawX + drawWidth * (minPCT + Math.random() * (maxPCT - minPCT));
          };

          // Cat logic (top floor, pct: 0.2 to 0.7)
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
              // Reached target, wait a bit and pick a new one
              catWaitFrames = 60 + Math.random() * 120;
              catTargetX = getRandomX(0.2, 0.7);
              catFacingRight = catTargetX > catX;
            } else {
              catX += Math.sign(dx) * catSpeed;
            }
          }

          // Monster logic (middle floor, pct: 0.25 to 0.65)
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
              // Reached target, pick a new one
              monsterWaitFrames = 100 + Math.random() * 200;
              monsterTargetX = getRandomX(0.25, 0.65);
              monsterFacingRight = monsterTargetX > monsterX;
            } else {
              monsterX += Math.sign(dx) * monsterSpeed;
            }
          }

          // Update shared animation frames when walking
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

          const catY = canvas.height * 0.48 - yOffset; // Bottom of upper floor
          const monsterY = canvas.height * 0.66 - yOffset; // Bottom of middle floor

          // Draw Cat (Top Row of sprite)
          ctx.save();
          if (catFacingRight) {
            // Cat image faces right naturally
            ctx.drawImage(catFluffyImg, catSX, 0, npcSpriteW, npcSpriteH, catX - displayW / 2, catY - displayH, displayW, displayH);
          } else {
            ctx.translate(catX, catY);
            ctx.scale(-1, 1);
            ctx.drawImage(catFluffyImg, catSX, 0, npcSpriteW, npcSpriteH, -displayW / 2, -displayH, displayW, displayH);
          }
          ctx.restore();

          // Draw Fluffy Monster (Bottom Row of sprite)
          ctx.save();
          if (monsterFacingRight) {
            // Monster image faces right naturally
            ctx.drawImage(catFluffyImg, monsterSX, npcSpriteH, npcSpriteW, npcSpriteH, monsterX - displayW / 2, monsterY - displayH, displayW, displayH);
          } else {
            ctx.translate(monsterX, monsterY);
            ctx.scale(-1, 1);
            ctx.drawImage(catFluffyImg, monsterSX, npcSpriteH, npcSpriteW, npcSpriteH, -displayW / 2, -displayH, displayW, displayH);
          }
          ctx.restore();
        }

        animationFrameId = requestAnimationFrame(render);
      };

      requestAnimationFrame(render);
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('mousedown', handleMouseDown);
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
