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

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "Hello World" text
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hello World!', canvas.width / 2, canvas.height / 2 - 30);

    // Draw subtitle
    ctx.fillStyle = '#7c3aed';
    ctx.font = '24px Arial';
    ctx.fillText(
      'Das funkelnde Hexenlabor',
      canvas.width / 2,
      canvas.height / 2 + 30
    );

    // Draw decorative frame
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
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
