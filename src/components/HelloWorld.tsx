'use client';

import { useEffect, useRef } from 'react';

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    let animationFrameId: number;
    let x = 100;
    const y = canvas.height / 2;
    let speed = 2; // move right initially
    let frameIndex = 0;
    let tickCount = 0;
    const ticksPerFrame = 10; // slow down animation
    const numFrames = 5;

    const img = new Image();
    img.src = '/assets/witch.png';
    img.onload = () => {
      const spriteWidth = img.width / 5;
      const spriteHeight = img.height / 2;
      const displayWidth = spriteWidth; // Or scaled size
      const displayHeight = spriteHeight;

      const render = () => {
        // Clear canvas
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update animation logic
        x += speed;
        
        // Boundaries and flip logic
        if (x + displayWidth > canvas.width) {
          x = canvas.width - displayWidth;
          speed = -Math.abs(speed); // Walk left
        } else if (x < 0) {
          x = 0;
          speed = Math.abs(speed); // Walk right
        }

        tickCount++;
        if (tickCount > ticksPerFrame) {
          tickCount = 0;
          frameIndex = (frameIndex + 1) % numFrames;
        }

        const sx = frameIndex * spriteWidth;
        const sy = 0; // Top row

        ctx.save();
        if (speed < 0) {
          // Flip horizontally
          ctx.translate(x + displayWidth, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, sx, sy, spriteWidth, spriteHeight, 0, -displayHeight / 2, displayWidth, displayHeight);
        } else {
          ctx.drawImage(img, sx, sy, spriteWidth, spriteHeight, x, y - displayHeight / 2, displayWidth, displayHeight);
        }
        ctx.restore();

        animationFrameId = requestAnimationFrame(render);
      };

      render();
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        Das funkelnde Hexenlabor
      </h1>
      <p className="text-center text-slate-300 text-lg">
        Welcome to the magical game engine. Canvas rendering initialized below:
      </p>
      <canvas
        ref={canvasRef}
        className="border-2 border-purple-500 rounded-lg shadow-lg hover:shadow-purple-500/50 transition-shadow"
      />
      <div className="text-center text-slate-400 mt-4">
        <p className="text-sm">✨ Project ready for development ✨</p>
      </div>
    </div>
  );
}
