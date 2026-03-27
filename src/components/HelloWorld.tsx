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
    let npcX1 = -100;
    let npcX2 = -300;
    let npcFrameIndex = 0;
    let npcTickCount = 0;

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
        // if (thingsImg.complete) {
        //   drawThings(ctx, canvas.width, canvas.height, thingsImg, things2Img);
        // }

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
        // if (catFluffyImg.complete && catFluffyImg.naturalWidth > 0) {
        //   const npcSpriteW = catFluffyImg.width / 5;
        //   const npcSpriteH = catFluffyImg.height / 2;
        //   const npcY = canvas.height * 0.75; // Walk along the bottom 1/4

        //   npcX1 += 2;
        //   npcX2 += 2;
        //   
        //   if (npcX1 > canvas.width + 200) npcX1 = -200;
        //   if (npcX2 > canvas.width + 200) npcX2 = -200;

        //   npcTickCount++;
        //   if (npcTickCount > 8) {
        //     npcTickCount = 0;
        //     npcFrameIndex = (npcFrameIndex + 1) % 5;
        //   }

        //   const npcSX = npcFrameIndex * npcSpriteW;
        //   
        //   // Draw Cat (Top Row)
        //   ctx.drawImage(catFluffyImg, npcSX, 0, npcSpriteW, npcSpriteH, npcX1 - npcSpriteW / 2, npcY - npcSpriteH, npcSpriteW, npcSpriteH);
        //   
        //   // Draw Monster (Bottom Row)
        //   ctx.drawImage(catFluffyImg, npcSX, npcSpriteH, npcSpriteW, npcSpriteH, npcX2 - npcSpriteW / 2, npcY - npcSpriteH + 50, npcSpriteW, npcSpriteH);
        // }

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
