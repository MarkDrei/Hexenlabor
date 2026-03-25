import { describe, it, expect } from 'vitest';
import { NavigationMesh, NavPolygon, createWitchNavMesh } from '@/game/navigation';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A simple 100 × 100 axis-aligned square */
const square: NavPolygon = {
  vertices: [
    { x:   0, y:   0 },
    { x: 100, y:   0 },
    { x: 100, y: 100 },
    { x:   0, y: 100 },
  ],
};

/** A second square placed far from the first */
const square2: NavPolygon = {
  vertices: [
    { x: 200, y: 200 },
    { x: 300, y: 200 },
    { x: 300, y: 300 },
    { x: 200, y: 300 },
  ],
};

// ─── isWalkable ──────────────────────────────────────────────────────────────

describe('NavigationMesh.isWalkable', () => {
  it('returns true for a point clearly inside a polygon', () => {
    const mesh = new NavigationMesh([square]);
    expect(mesh.isWalkable({ x: 50, y: 50 })).toBe(true);
  });

  it('returns false for a point clearly outside all polygons', () => {
    const mesh = new NavigationMesh([square]);
    expect(mesh.isWalkable({ x: 150, y: 50 })).toBe(false);
  });

  it('returns true when the point is in any one of multiple polygons', () => {
    const mesh = new NavigationMesh([square, square2]);
    expect(mesh.isWalkable({ x: 250, y: 250 })).toBe(true);
  });

  it('returns false when the point is between two non-overlapping polygons', () => {
    const mesh = new NavigationMesh([square, square2]);
    expect(mesh.isWalkable({ x: 150, y: 150 })).toBe(false);
  });
});

// ─── nearestWalkablePoint ────────────────────────────────────────────────────

describe('NavigationMesh.nearestWalkablePoint', () => {
  it('returns the point unchanged when it is already walkable', () => {
    const mesh = new NavigationMesh([square]);
    const result = mesh.nearestWalkablePoint({ x: 50, y: 50 });
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(50);
  });

  it('snaps a point to the nearest edge when outside the polygon', () => {
    const mesh = new NavigationMesh([square]);
    // Point is to the right of the square – nearest edge is at x = 100
    const result = mesh.nearestWalkablePoint({ x: 150, y: 50 });
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(50);
  });

  it('snaps to the nearest polygon out of several', () => {
    const mesh = new NavigationMesh([square, square2]);
    // Point is roughly equidistant but slightly closer to square2
    const result = mesh.nearestWalkablePoint({ x: 190, y: 250 });
    // Should land on the left edge of square2 (x = 200)
    expect(result.x).toBeCloseTo(200);
    expect(result.y).toBeCloseTo(250);
  });
});

// ─── findPath ────────────────────────────────────────────────────────────────

describe('NavigationMesh.findPath', () => {
  it('returns a non-empty path whose last point equals the goal', () => {
    const mesh = new NavigationMesh([square]);
    const path = mesh.findPath({ x: 10, y: 10 }, { x: 90, y: 90 });
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(last.x).toBeCloseTo(90, 0);
    expect(last.y).toBeCloseTo(90, 0);
  });

  it('snaps an out-of-mesh target to the nearest walkable point', () => {
    const mesh = new NavigationMesh([square]);
    // Goal is to the right, outside the square
    const path = mesh.findPath({ x: 50, y: 50 }, { x: 200, y: 50 });
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    // Should end on the right edge (x ≈ 100, y ≈ 50)
    expect(last.x).toBeCloseTo(100, 0);
    expect(last.y).toBeCloseTo(50, 1);
  });

  it('returns [goal] when start and goal are the same cell', () => {
    const mesh = new NavigationMesh([square]);
    const p = { x: 50, y: 50 };
    const path = mesh.findPath(p, { x: 52, y: 52 }); // same grid cell
    expect(path.length).toBeGreaterThan(0);
  });

  it('all waypoints lie inside the walkable mesh', () => {
    const mesh = new NavigationMesh([square]);
    const path = mesh.findPath({ x: 5, y: 5 }, { x: 95, y: 95 });
    for (const wp of path.slice(0, -1)) {       // skip exact goal (may be on edge)
      expect(mesh.isWalkable(wp)).toBe(true);
    }
  });
});

// ─── createWitchNavMesh ───────────────────────────────────────────────────────

describe('createWitchNavMesh', () => {
  const CANVAS_W = 800;
  const CANVAS_H = 600;

  it('creates a mesh where the canvas centre (X crossing) is walkable', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    expect(mesh.isWalkable({ x: CANVAS_W / 2, y: CANVAS_H / 2 })).toBe(true);
  });

  it('creates a mesh where the top bar area is walkable', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    // Top bar spans h * 0.12 – 0.25; check a point clearly inside it
    expect(mesh.isWalkable({ x: CANVAS_W / 2, y: CANVAS_H * 0.18 })).toBe(true);
  });

  it('creates a mesh where the bottom rectangle is walkable', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    // Bottom rect spans h * 0.75 – 0.88
    expect(mesh.isWalkable({ x: CANVAS_W / 2, y: CANVAS_H * 0.80 })).toBe(true);
  });

  it('treats a point well outside the X shape as non-walkable', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    // Far left, mid-height – outside all polygons
    expect(mesh.isWalkable({ x: CANVAS_W * 0.05, y: CANVAS_H / 2 })).toBe(false);
  });

  it('finds a path between the upper-left and lower-right arms', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    // Upper-left arm area → lower-right arm area
    const from = { x: CANVAS_W * 0.28, y: CANVAS_H * 0.32 };
    const to   = { x: CANVAS_W * 0.72, y: CANVAS_H * 0.68 };
    const path = mesh.findPath(from, to);
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    // Goal should be close to the requested target (it's walkable)
    expect(Math.hypot(last.x - to.x, last.y - to.y)).toBeLessThan(25);
  });

  it('snaps an off-mesh click to the nearest walkable point on the X', () => {
    const mesh = createWitchNavMesh(CANVAS_W, CANVAS_H);
    // Click far to the left, outside the shape
    const offMesh = { x: 30, y: CANVAS_H / 2 };
    const snapped = mesh.nearestWalkablePoint(offMesh);
    // Snapped point must be walkable
    expect(mesh.isWalkable(snapped)).toBe(true);
    // Distance from snapped point to requested point should be less than width of canvas
    expect(Math.hypot(snapped.x - offMesh.x, snapped.y - offMesh.y)).toBeLessThan(CANVAS_W);
  });
});
