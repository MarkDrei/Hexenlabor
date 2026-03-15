export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Clear and draw sky gradient - blue sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#87ceeb'); // sky blue
  skyGradient.addColorStop(1, '#e0f6ff'); // lighter blue at horizon
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw stars (removed - daytime doesn't have visible stars)

  // Draw distant mountains - grey gradient
  const mountainGradient = ctx.createLinearGradient(0, height * 0.4, 0, height * 0.75);
  mountainGradient.addColorStop(0, '#d1d5db'); // light grey at top
  mountainGradient.addColorStop(1, '#6b7280'); // darker grey at bottom
  ctx.fillStyle = mountainGradient;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.7);
  ctx.lineTo(width * 0.2, height * 0.5);
  ctx.lineTo(width * 0.4, height * 0.65);
  ctx.lineTo(width * 0.7, height * 0.4);
  ctx.lineTo(width, height * 0.6);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // Draw background hills - darker green
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.75);
  ctx.quadraticCurveTo(width * 0.25, height * 0.6, width * 0.5, height * 0.8);
  ctx.quadraticCurveTo(width * 0.75, height * 1.0, width, height * 0.7);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // Draw foreground hills - bright green
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.8);
  ctx.quadraticCurveTo(width * 0.2, height * 1.0, width * 0.6, height * 0.85);
  ctx.quadraticCurveTo(width * 0.8, height * 0.75, width, height * 0.85);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();
    
  // Draw floor/ground - grass
  const groundGradient = ctx.createLinearGradient(0, height * 0.9, 0, height);
  groundGradient.addColorStop(0, '#4ade80');
  groundGradient.addColorStop(1, '#16a34a');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.9, width, height * 0.1);

  // Draw some simple clouds
  const cloudOffset = time * 0.02; // Slow movement
  drawCloud(ctx, (width * 0.2 + cloudOffset) % (width + 200) - 100, height * 0.2);
  drawCloud(ctx, (width * 0.6 + cloudOffset * 1.5) % (width + 200) - 100, height * 0.3);
  drawCloud(ctx, (width * 0.8 + cloudOffset * 0.8) % (width + 200) - 100, height * 0.15);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 20, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 25, y - 15, 30, Math.PI * 1, Math.PI * 2);
  ctx.arc(x + 55, y - 10, 25, Math.PI * 1, Math.PI * 2);
  ctx.arc(x + 75, y, 20, Math.PI * 1.5, Math.PI * 0.5);
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.fillStyle = 'white';
  const numStars = Math.floor(width * height / 10000); // Responsive star density
  
  // Deterministic "random" based on index so they don't jump per frame
  for (let i = 0; i < numStars; i++) {
    const x = (Math.sin(i * 123) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 321) * 0.5 + 0.5) * height * 0.6; // Stars only in top 60%
    
    // Twinkle effect
    const twinkle = (Math.sin(time * 0.002 + i) * 0.5 + 0.5) * 0.8 + 0.2;
    ctx.globalAlpha = twinkle;
    
    const size = (Math.sin(i * 456) * 0.5 + 0.5) * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}