'use client';

import { useEffect, useRef } from 'react';
import { drawBackground } from '@/renderers/background';

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full screen minus a small gap
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth - 40;
      canvas.height = window.innerHeight - 40;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    let animationFrameId: number;
    // Initial position in center
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    let targetX = x;
    let targetY = y;
    
    let speed = 3;
    let facingRight = true;
    let isMoving = false;
    
    let frameIndex = 0;
    let tickCount = 0;
    const ticksPerFrame = 8;
    const numFrames = 5;

    // Track if mouse button is held down
    let isMouseDown = false;

    // Helper to get mouse position relative to canvas
    const getMouseCanvasPos = (e: MouseEvent | MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Start continuous tracking on mouse down
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      const pos = getMouseCanvasPos(e);
      targetX = pos.x;
      targetY = pos.y;
    };

    // Update target position while mouse is held and moving
    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDown) {
        const pos = getMouseCanvasPos(e);
        targetX = pos.x;
        targetY = pos.y;
      }
    };

    // Stop tracking on mouse up (witch will walk to final position and stop)
    const handleMouseUp = () => {
      isMouseDown = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    const img = new Image();
    img.src = '/assets/witch.png';
    img.onload = () => {
      const spriteWidth = img.width / 5;
      const spriteHeight = img.height / 2;
      const displayWidth = spriteWidth;
      const displayHeight = spriteHeight;

      const render = (time: number) => {
        // Draw magical background instead of clearing
        drawBackground(ctx, canvas.width, canvas.height, time);

        // Update animation logic
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.hypot(dx, dy);

        // Keep moving if mouse is held OR if still not at destination
        isMoving = isMouseDown || distance > speed;

        if (isMouseDown) {
          // While mouse is held, walk toward target and continue animation
          if (distance > speed) {
            // Still have distance to cover, move and update direction
            x += (dx / distance) * speed;
            y += (dy / distance) * speed;
            if (dx > 0) facingRight = true;
            else if (dx < 0) facingRight = false;
          }
          // Keep animating walking frames regardless (no direction change if at destination)
          tickCount++;
          if (tickCount > ticksPerFrame) {
            tickCount = 0;
            frameIndex = (frameIndex + 1) % numFrames;
          }
        } else if (distance > speed) {
          // Not holding mouse, but still need to reach destination
          x += (dx / distance) * speed;
          y += (dy / distance) * speed;
          if (dx > 0) facingRight = true;
          else if (dx < 0) facingRight = false;

          tickCount++;
          if (tickCount > ticksPerFrame) {
            tickCount = 0;
            frameIndex = (frameIndex + 1) % numFrames;
          }
        } else {
          // Arrived at destination and mouse is released
          x = targetX;
          y = targetY;
          tickCount = 0;
          frameIndex = 0; // Return to idle frame
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

        animationFrameId = requestAnimationFrame(render);
      };

      requestAnimationFrame(render);
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
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
