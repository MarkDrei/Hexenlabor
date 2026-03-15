import type { WeatherType } from '@/shared/types';

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  isNight = false,
  weather: WeatherType = 'sunny',
  dayProgress = 0,
) {
  // ── Sky ──────────────────────────────────────────────────────────────────────
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.75);
  if (isNight) {
    skyGradient.addColorStop(0, '#0f172a');
    skyGradient.addColorStop(1, '#1e293b');
  } else if (weather === 'stormy') {
    skyGradient.addColorStop(0, '#374151');
    skyGradient.addColorStop(1, '#6b7280');
  } else if (weather === 'rainy' || weather === 'cloudy') {
    skyGradient.addColorStop(0, '#64748b');
    skyGradient.addColorStop(1, '#94a3b8');
  } else {
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(1, '#e0f6ff');
  }
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // ── Stars / Moon (night) ──────────────────────────────────────────────────────
  if (isNight) {
    drawStars(ctx, width, height, time);
    // Moon
    const moonX = width * 0.8;
    const moonY = height * 0.15;
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 4, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Sun (day) ─────────────────────────────────────────────────────────────────
  if (!isNight && weather === 'sunny') {
    const sunX = width * (0.15 + dayProgress * 0.7);
    const sunY = height * (0.2 - Math.abs(dayProgress - 0.25) * 0.18);
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 36);
    sunGrad.addColorStop(0, 'rgba(255,255,180,1)');
    sunGrad.addColorStop(0.5, 'rgba(255,220,60,0.8)');
    sunGrad.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Distant mountains ─────────────────────────────────────────────────────────
  const mtnColor = isNight ? '#1e3a5f' : '#9ca3af';
  ctx.fillStyle = mtnColor;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.7);
  ctx.lineTo(width * 0.2, height * 0.5);
  ctx.lineTo(width * 0.4, height * 0.65);
  ctx.lineTo(width * 0.7, height * 0.4);
  ctx.lineTo(width, height * 0.6);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Background hills ─────────────────────────────────────────────────────────
  ctx.fillStyle = isNight ? '#14532d' : '#16a34a';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.75);
  ctx.quadraticCurveTo(width * 0.25, height * 0.6, width * 0.5, height * 0.8);
  ctx.quadraticCurveTo(width * 0.75, height * 1.0, width, height * 0.7);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Foreground hills ─────────────────────────────────────────────────────────
  ctx.fillStyle = isNight ? '#166534' : '#22c55e';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.8);
  ctx.quadraticCurveTo(width * 0.2, height * 1.0, width * 0.6, height * 0.85);
  ctx.quadraticCurveTo(width * 0.8, height * 0.75, width, height * 0.85);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Ground ───────────────────────────────────────────────────────────────────
  const groundGrad = ctx.createLinearGradient(0, height * 0.9, 0, height);
  if (isNight) {
    groundGrad.addColorStop(0, '#15803d');
    groundGrad.addColorStop(1, '#14532d');
  } else {
    groundGrad.addColorStop(0, '#4ade80');
    groundGrad.addColorStop(1, '#16a34a');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.9, width, height * 0.1);

  // ── Clouds ───────────────────────────────────────────────────────────────────
  if (!isNight) {
    const cloudAlpha = weather === 'stormy' ? 0.7 : weather === 'rainy' || weather === 'cloudy' ? 0.85 : 0.9;
    const cloudColor = weather === 'stormy' ? 'rgba(100,100,110,' : 'rgba(255,255,255,';
    const cloudOffset = time * 0.018;
    const numClouds = weather === 'cloudy' || weather === 'rainy' || weather === 'stormy' ? 6 : 3;
    for (let i = 0; i < numClouds; i++) {
      const cx = ((width * (0.1 + i * 0.18) + cloudOffset * (1 + i * 0.3)) % (width + 250)) - 125;
      const cy = height * (0.12 + i * 0.04);
      drawCloud(ctx, cx, cy, cloudColor + cloudAlpha + ')');
    }
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, fillStyle: string) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(x, y, 20, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 25, y - 15, 30, Math.PI, Math.PI * 2);
  ctx.arc(x + 55, y - 10, 25, Math.PI, Math.PI * 2);
  ctx.arc(x + 75, y, 20, Math.PI * 1.5, Math.PI * 0.5);
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const numStars = Math.floor(width * height / 8_000);
  for (let i = 0; i < numStars; i++) {
    const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 311.7) * 0.5 + 0.5) * height * 0.55;
    const twinkle = (Math.sin(time * 0.002 + i * 0.7) * 0.5 + 0.5) * 0.8 + 0.2;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = 'white';
    const size = (Math.sin(i * 456) * 0.5 + 0.5) * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}