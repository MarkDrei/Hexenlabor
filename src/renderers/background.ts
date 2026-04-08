type RGB = [number, number, number];

/** Duration of one full day/night cycle in milliseconds (4 minutes = 24 hours in-game). */
export const DAY_CYCLE_MS = 4 * 60 * 1000;

/**
 * Returns the current day phase in [0, 1).
 * 0 = midnight · 0.25 = sunrise · 0.5 = noon · 0.75 = sunset
 */
export function getDayPhase(time: number): number {
  return (time % DAY_CYCLE_MS) / DAY_CYCLE_MS;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgbStr([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface ColorStop { phase: number; value: RGB }

/** Piecewise-linear colour sample through keyframes (must span phase 0–1). */
function sampleKeyframes(stops: ColorStop[], phase: number): RGB {
  for (let i = 0; i < stops.length - 1; i++) {
    if (phase <= stops[i + 1].phase) {
      const span = stops[i + 1].phase - stops[i].phase;
      const t = span === 0 ? 0 : (phase - stops[i].phase) / span;
      return lerpRGB(stops[i].value, stops[i + 1].value, t);
    }
  }
  return stops[stops.length - 1].value;
}

// ── Colour keyframes ──────────────────────────────────────────────────────────
// Phase: 0 = midnight · 0.25 = sunrise · 0.5 = noon · 0.75 = sunset · 1.0 = midnight

const SKY_TOP: ColorStop[] = [
  { phase: 0.00, value: [5,   5,  30] },
  { phase: 0.20, value: [5,   5,  30] },
  { phase: 0.27, value: [60,  20,  90] },
  { phase: 0.33, value: [60, 130, 200] },
  { phase: 0.50, value: [25, 100, 195] },
  { phase: 0.67, value: [60, 130, 200] },
  { phase: 0.73, value: [110, 30,  70] },
  { phase: 0.80, value: [5,   5,  30] },
  { phase: 1.00, value: [5,   5,  30] },
];

const SKY_BOTTOM: ColorStop[] = [
  { phase: 0.00, value: [10,  10,  50] },
  { phase: 0.20, value: [10,  10,  50] },
  { phase: 0.27, value: [255, 120,  40] },
  { phase: 0.33, value: [255, 200, 130] },
  { phase: 0.50, value: [140, 210, 250] },
  { phase: 0.67, value: [255, 200, 130] },
  { phase: 0.73, value: [255,  90,  30] },
  { phase: 0.80, value: [10,  10,  50] },
  { phase: 1.00, value: [10,  10,  50] },
];

const MOUNTAIN_TOP: ColorStop[] = [
  { phase: 0.00, value: [60,  65,  75] },
  { phase: 0.27, value: [80,  75,  90] },
  { phase: 0.50, value: [209, 213, 219] },
  { phase: 0.73, value: [160, 130,  90] },
  { phase: 1.00, value: [60,  65,  75] },
];

const MOUNTAIN_BOT: ColorStop[] = [
  { phase: 0.00, value: [30,  35,  45] },
  { phase: 0.27, value: [50,  45,  55] },
  { phase: 0.50, value: [107, 114, 128] },
  { phase: 0.73, value: [100,  80,  50] },
  { phase: 1.00, value: [30,  35,  45] },
];

const HILL_BG_COLOR: ColorStop[] = [
  { phase: 0.00, value: [20,  50,  25] },
  { phase: 0.27, value: [28,  80,  35] },
  { phase: 0.33, value: [30, 150,  50] },
  { phase: 0.50, value: [34, 197,  94] },
  { phase: 0.67, value: [30, 150,  50] },
  { phase: 0.73, value: [60,  80,  30] },
  { phase: 1.00, value: [20,  50,  25] },
];

const HILL_FG_COLOR: ColorStop[] = [
  { phase: 0.00, value: [30,  70,  35] },
  { phase: 0.27, value: [40,  90,  45] },
  { phase: 0.33, value: [60, 190,  80] },
  { phase: 0.50, value: [74, 222, 128] },
  { phase: 0.67, value: [60, 190,  80] },
  { phase: 0.73, value: [80, 100,  40] },
  { phase: 1.00, value: [30,  70,  35] },
];

const GROUND_TOP_COLOR: ColorStop[] = [
  { phase: 0.00, value: [30,  70,  35] },
  { phase: 0.33, value: [74, 222, 128] },
  { phase: 0.50, value: [74, 222, 128] },
  { phase: 0.67, value: [74, 222, 128] },
  { phase: 0.73, value: [80, 100,  40] },
  { phase: 1.00, value: [30,  70,  35] },
];

const GROUND_BOT_COLOR: ColorStop[] = [
  { phase: 0.00, value: [15,  50,  20] },
  { phase: 0.33, value: [22, 163,  74] },
  { phase: 0.50, value: [22, 163,  74] },
  { phase: 0.67, value: [22, 163,  74] },
  { phase: 0.73, value: [50,  70,  25] },
  { phase: 1.00, value: [15,  50,  20] },
];

// ── Sun ───────────────────────────────────────────────────────────────────────

function drawSun(ctx: CanvasRenderingContext2D, width: number, height: number, phase: number): void {
  // Sun visible from phase 0.22 to 0.78
  if (phase <= 0.22 || phase >= 0.78) return;

  const progress = (phase - 0.22) / (0.78 - 0.22); // 0 = sunrise (left), 1 = sunset (right)
  const sunAngle = progress * Math.PI;              // arc: 0 at horizon → PI/2 at zenith → PI at horizon
  const sunX = width * progress;
  const sunY = height * 0.42 - height * 0.38 * Math.sin(sunAngle);

  // Fade in at sunrise and out at sunset
  const alpha = Math.min(smoothstep(0.22, 0.27, phase), smoothstep(0.78, 0.73, phase));

  // Sun colour: orange-gold near horizon, bright yellow-white at zenith
  const horizonFactor = 1 - Math.sin(sunAngle);
  const sunGreen = Math.round(lerp(255, 160, horizonFactor));
  const sunBlue  = Math.round(lerp(100,  10, horizonFactor));
  const sunRadius = Math.max(16, width * 0.033);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Halo glow
  const glow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius * 3.5);
  glow.addColorStop(0.0, `rgba(255,${sunGreen},${sunBlue},0.50)`);
  glow.addColorStop(0.4, `rgba(255,${sunGreen},${sunBlue},0.12)`);
  glow.addColorStop(1.0, `rgba(255,${sunGreen},${sunBlue},0.00)`);
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 3.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Sun disc
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(255,${sunGreen},${sunBlue})`;
  ctx.fill();

  ctx.restore();
}

// ── Moon ──────────────────────────────────────────────────────────────────────

/**
 * Returns the moon's progress [0, 1] during its night arc, or null if below horizon.
 * 0 = moonrise (right side, phase 0.72) → 0.5 = zenith (midnight) → 1 = moonset (left, phase 0.28)
 */
function getMoonProgress(phase: number): number | null {
  const ARC_DURATION = 0.56; // 0.72 → 1.0 → 0.28 spans 0.56 of the cycle
  if (phase >= 0.72) return (phase - 0.72) / ARC_DURATION;
  if (phase <= 0.28) return (1.0 - 0.72 + phase) / ARC_DURATION;
  return null;
}

function drawMoon(ctx: CanvasRenderingContext2D, width: number, height: number, phase: number): void {
  const progress = getMoonProgress(phase);
  if (progress === null) return;

  const moonAngle = progress * Math.PI;
  const moonX = width * (1 - progress); // rises from right, sets to left
  const moonY = height * 0.42 - height * 0.38 * Math.sin(moonAngle);

  const alpha = Math.min(smoothstep(0, 0.08, progress), smoothstep(1, 0.92, progress));
  const moonRadius = Math.max(13, width * 0.025);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Soft halo
  const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 3);
  glow.addColorStop(0.0, 'rgba(200,220,255,0.30)');
  glow.addColorStop(0.5, 'rgba(140,180,255,0.08)');
  glow.addColorStop(1.0, 'rgba(100,150,255,0.00)');
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius * 3, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Moon disc
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f0e0';
  ctx.fill();

  // Subtle craters
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.arc(moonX + moonRadius * 0.28, moonY - moonRadius * 0.20, moonRadius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX - moonRadius * 0.35, moonY + moonRadius * 0.30, moonRadius * 0.20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX + moonRadius * 0.05, moonY + moonRadius * 0.45, moonRadius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
  time: number,
): void {
  // Fade in after sunset, fully visible at midnight, fade out before sunrise
  const starAlpha =
    phase < 0.5
      ? smoothstep(0.28, 0.20, phase) // fade out as sun rises
      : smoothstep(0.72, 0.80, phase); // fade in as sun sets

  if (starAlpha <= 0.01) return;

  const numStars = Math.floor(width * height / 8000);
  ctx.save();
  for (let i = 0; i < numStars; i++) {
    const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
    const sy = (Math.cos(i * 311.7) * 0.5 + 0.5) * height * 0.55;
    const twinkle = (Math.sin(time * 0.0015 + i * 0.7) * 0.5 + 0.5) * 0.7 + 0.3;
    const size = Math.abs(Math.sin(i * 456.3)) * 1.2 + 0.4;
    ctx.globalAlpha = starAlpha * twinkle;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Clouds ────────────────────────────────────────────────────────────────────

function getCloudStyle(phase: number): { color: string; alpha: number } {
  // Clouds are fully visible at noon, barely visible at night
  const dayAlpha = Math.max(0, Math.sin(phase * Math.PI));

  // Orange-golden tint at sunrise (~0.25) and sunset (~0.75)
  const sunriseTint = Math.max(0, 1 - Math.abs(phase - 0.25) * 14);
  const sunsetTint  = Math.max(0, 1 - Math.abs(phase - 0.75) * 14);
  const horizonFactor = Math.max(sunriseTint, sunsetTint);

  const green = Math.round(lerp(255, 165, horizonFactor));
  const blue  = Math.round(lerp(255,  80, horizonFactor));
  const alpha = dayAlpha * 0.88 + 0.05;
  return { color: `rgb(255,${green},${blue})`, alpha };
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  ctx.beginPath();
  ctx.arc(x,               y,              20 * scale, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 25 * scale,  y - 15 * scale, 30 * scale, Math.PI,       Math.PI * 2);
  ctx.arc(x + 55 * scale,  y - 10 * scale, 25 * scale, Math.PI,       Math.PI * 2);
  ctx.arc(x + 75 * scale,  y,              20 * scale, Math.PI * 1.5, Math.PI * 0.5);
  ctx.fill();
}

// ── Main export ───────────────────────────────────────────────────────────────

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
): void {
  const phase = getDayPhase(time);

  // ── Sky gradient ──────────────────────────────────────────────────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, rgbStr(sampleKeyframes(SKY_TOP,    phase)));
  skyGrad.addColorStop(1, rgbStr(sampleKeyframes(SKY_BOTTOM, phase)));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // ── Stars (night) ─────────────────────────────────────────────────────────
  drawStars(ctx, width, height, phase, time);

  // ── Sun ───────────────────────────────────────────────────────────────────
  drawSun(ctx, width, height, phase);

  // ── Moon ──────────────────────────────────────────────────────────────────
  drawMoon(ctx, width, height, phase);

  // ── Distant mountains ─────────────────────────────────────────────────────
  const mtnGrad = ctx.createLinearGradient(0, height * 0.4, 0, height * 0.75);
  mtnGrad.addColorStop(0, rgbStr(sampleKeyframes(MOUNTAIN_TOP, phase)));
  mtnGrad.addColorStop(1, rgbStr(sampleKeyframes(MOUNTAIN_BOT, phase)));
  ctx.fillStyle = mtnGrad;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.7);
  ctx.lineTo(width * 0.2, height * 0.5);
  ctx.lineTo(width * 0.4, height * 0.65);
  ctx.lineTo(width * 0.7, height * 0.4);
  ctx.lineTo(width, height * 0.6);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Background hills ──────────────────────────────────────────────────────
  ctx.fillStyle = rgbStr(sampleKeyframes(HILL_BG_COLOR, phase));
  ctx.beginPath();
  ctx.moveTo(0, height * 0.75);
  ctx.quadraticCurveTo(width * 0.25, height * 0.6, width * 0.5, height * 0.8);
  ctx.quadraticCurveTo(width * 0.75, height * 1.0, width, height * 0.7);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Foreground hills ──────────────────────────────────────────────────────
  ctx.fillStyle = rgbStr(sampleKeyframes(HILL_FG_COLOR, phase));
  ctx.beginPath();
  ctx.moveTo(0, height * 0.8);
  ctx.quadraticCurveTo(width * 0.2, height * 1.0, width * 0.6, height * 0.85);
  ctx.quadraticCurveTo(width * 0.8, height * 0.75, width, height * 0.85);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // ── Ground ────────────────────────────────────────────────────────────────
  const groundGrad = ctx.createLinearGradient(0, height * 0.9, 0, height);
  groundGrad.addColorStop(0, rgbStr(sampleKeyframes(GROUND_TOP_COLOR, phase)));
  groundGrad.addColorStop(1, rgbStr(sampleKeyframes(GROUND_BOT_COLOR, phase)));
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.9, width, height * 0.1);

  // ── Clouds ────────────────────────────────────────────────────────────────
  const { color, alpha } = getCloudStyle(phase);
  const cloudOffset = time * 0.02;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  drawCloud(ctx, (width * 0.2 + cloudOffset) % (width + 200) - 100, height * 0.2);
  drawCloud(ctx, (width * 0.6 + cloudOffset * 1.5) % (width + 200) - 100, height * 0.3, 0.8);
  drawCloud(ctx, (width * 0.8 + cloudOffset * 0.8) % (width + 200) - 100, height * 0.15, 1.2);
  ctx.restore();
}