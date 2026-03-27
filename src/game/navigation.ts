// Navigation mesh with polygon-based walkable zones and A* pathfinding.
// Re-usable infrastructure for any character movement restrictions.

import { Position } from '@/shared/types';

/** A (convex or concave) polygon that defines a walkable area */
export interface NavPolygon {
  vertices: Position[];
}

/** Check if a point is inside a polygon using the ray-casting algorithm */
function isPointInPolygon(p: Position, poly: NavPolygon): boolean {
  const v = poly.vertices;
  const n = v.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = v[i].x, yi = v[i].y;
    const xj = v[j].x, yj = v[j].y;
    if ((yi > p.y) !== (yj > p.y) &&
        p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Return the nearest point on line-segment [a, b] to point p */
function nearestPointOnSegment(p: Position, a: Position, b: Position): Position {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

interface AStarNode {
  gx: number;
  gy: number;
  g: number;
  f: number;
  parent: AStarNode | null;
}

/** Grid cell size in pixels used for A* pathfinding */
const CELL_SIZE = 20;

/**
 * NavigationMesh manages a set of walkable polygon zones and provides:
 *  - walkability tests
 *  - snapping of arbitrary points to the nearest walkable position
 *  - A* pathfinding between two positions (with optional path smoothing)
 *  - debug visualization
 */
export class NavigationMesh {
  private polygons: NavPolygon[];

  constructor(polygons: NavPolygon[]) {
    this.polygons = polygons;
  }

  /** Return true if point p lies inside any walkable polygon */
  isWalkable(p: Position): boolean {
    return this.polygons.some(poly => isPointInPolygon(p, poly));
  }

  /**
   * Return the nearest walkable point to p.
   * If p is already walkable it is returned unchanged.
   * Otherwise the closest point on any polygon edge is returned.
   */
  nearestWalkablePoint(p: Position): Position {
    if (this.isWalkable(p)) return { x: p.x, y: p.y };

    let best: Position = { x: p.x, y: p.y };
    let minDist = Infinity;

    for (const poly of this.polygons) {
      const n = poly.vertices.length;
      for (let i = 0; i < n; i++) {
        const a = poly.vertices[i];
        const b = poly.vertices[(i + 1) % n];
        const nearest = nearestPointOnSegment(p, a, b);
        const dist = Math.hypot(nearest.x - p.x, nearest.y - p.y);
        if (dist < minDist) {
          minDist = dist;
          best = nearest;
        }
      }
    }
    return best;
  }

  /**
   * Find a walkable path from `from` to `to` using grid-based A*.
   * Both endpoints are snapped to the nearest walkable position first.
   * Returns an array of world-space waypoints ending at the (snapped) goal.
   */
  findPath(from: Position, to: Position): Position[] {
    const start = this.nearestWalkablePoint(from);
    const goal  = this.nearestWalkablePoint(to);

    // Build grid bounding box from polygon vertices
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const poly of this.polygons) {
      for (const v of poly.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }
    }
    // Add a small margin so boundary points map to valid grid cells
    minX -= CELL_SIZE;
    minY -= CELL_SIZE;
    maxX += CELL_SIZE;
    maxY += CELL_SIZE;

    const gridW = Math.ceil((maxX - minX) / CELL_SIZE) + 1;
    const gridH = Math.ceil((maxY - minY) / CELL_SIZE) + 1;

    const toGrid = (p: Position) => ({
      gx: Math.floor((p.x - minX) / CELL_SIZE),
      gy: Math.floor((p.y - minY) / CELL_SIZE),
    });

    const toWorld = (gx: number, gy: number): Position => ({
      x: minX + (gx + 0.5) * CELL_SIZE,
      y: minY + (gy + 0.5) * CELL_SIZE,
    });

    // Build walkability grid
    const walkable: boolean[][] = Array.from({ length: gridH }, (_, gy) =>
      Array.from({ length: gridW }, (_, gx) => this.isWalkable(toWorld(gx, gy)))
    );

    const sg = toGrid(start);
    const eg = toGrid(goal);

    // Guard against out-of-bounds (shouldn't happen with the margin, but be safe)
    const inBounds = (gx: number, gy: number) =>
      gx >= 0 && gx < gridW && gy >= 0 && gy < gridH;

    if (!inBounds(sg.gx, sg.gy) || !inBounds(eg.gx, eg.gy)) return [goal];

    // Force start/goal cells walkable (handles boundary discretisation edge-cases)
    walkable[sg.gy][sg.gx] = true;
    walkable[eg.gy][eg.gx] = true;

    const heuristic = (gx: number, gy: number) =>
      Math.hypot(gx - eg.gx, gy - eg.gy);

    const encode = (gx: number, gy: number) => gy * gridW + gx;

    const openSet: AStarNode[] = [];
    const closedSet = new Set<number>();

    openSet.push({
      gx: sg.gx, gy: sg.gy,
      g: 0, f: heuristic(sg.gx, sg.gy),
      parent: null,
    });

    // 8-directional movement
    const dirs: [number, number, number][] = [
      [ 0, -1, 1], [ 0,  1, 1], [-1,  0, 1], [ 1,  0, 1],
      [-1, -1, Math.SQRT2], [-1,  1, Math.SQRT2],
      [ 1, -1, Math.SQRT2], [ 1,  1, Math.SQRT2],
    ];

    let found: AStarNode | null = null;

    while (openSet.length > 0) {
      // Pop node with lowest f (linear scan – fine for grids up to ~10 000 cells)
      let bestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
      }
      const current = openSet.splice(bestIdx, 1)[0];
      const code = encode(current.gx, current.gy);
      if (closedSet.has(code)) continue;
      closedSet.add(code);

      if (current.gx === eg.gx && current.gy === eg.gy) {
        found = current;
        break;
      }

      for (const [ddx, ddy, cost] of dirs) {
        const ngx = current.gx + ddx;
        const ngy = current.gy + ddy;
        if (!inBounds(ngx, ngy)) continue;
        if (!walkable[ngy][ngx]) continue;
        const ncode = encode(ngx, ngy);
        if (closedSet.has(ncode)) continue;
        const g = current.g + cost;
        openSet.push({
          gx: ngx, gy: ngy,
          g, f: g + heuristic(ngx, ngy),
          parent: current,
        });
      }
    }

    if (!found) return [goal];

    // Reconstruct grid path
    const gridPath: Position[] = [];
    let node: AStarNode | null = found;
    while (node) {
      gridPath.unshift(toWorld(node.gx, node.gy));
      node = node.parent;
    }

    // Replace last waypoint with the exact goal position
    gridPath[gridPath.length - 1] = goal;

    return this.smoothPath(gridPath);
  }

  /**
   * Remove collinear / redundant waypoints by string-pulling:
   * whenever a straight line between two waypoints is entirely walkable,
   * the intermediate waypoints are removed.
   */
  private smoothPath(path: Position[]): Position[] {
    if (path.length <= 2) return path;

    const result: Position[] = [path[0]];
    let i = 0;

    while (i < path.length - 1) {
      // Greedily jump as far forward as a clear line-of-sight allows
      let j = path.length - 1;
      while (j > i + 1 && !this.isLineWalkable(path[i], path[j])) {
        j--;
      }
      result.push(path[j]);
      i = j;
    }

    return result;
  }

  /** Return true if every sample along segment [a, b] is walkable */
  private isLineWalkable(a: Position, b: Position): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL_SIZE / 2));
    if (steps === 0) return this.isWalkable(a);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const p: Position = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
      if (!this.isWalkable(p)) return false;
    }
    return true;
  }

  /**
   * Draw the walkable polygons for debugging or background visualization.
   * The same polygon data (`this.polygons`) is used here AND for all
   * walkability / pathfinding queries — there is a single source of truth.
   */
  debugDraw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle   = 'rgba(120, 200, 255, 0.18)';
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.65)';
    ctx.lineWidth   = 2;

    for (const poly of this.polygons) {
      if (poly.vertices.length < 2) continue;
      ctx.beginPath();
      poly.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ─── Helpers for building polygon shapes ────────────────────────────────────

/** Create a rectangular NavPolygon from top-left corner and dimensions */
function makeRect(x: number, y: number, w: number, h: number): NavPolygon {
  return {
    vertices: [
      { x: x,     y: y     },
      { x: x + w, y: y     },
      { x: x + w, y: y + h },
      { x: x,     y: y + h },
    ],
  };
}

/**
 * Create a band (parallelogram) along the line from A to B,
 * extending `halfWidth` pixels perpendicular to the axis.
 */
function makeDiagBand(
  ax: number, ay: number,
  bx: number, by: number,
  halfWidth: number,
): NavPolygon {
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) throw new Error('makeDiagBand: start and end points must be distinct');
  // Perpendicular unit normal (rotated 90° from direction)
  const nx = -(by - ay) / len * halfWidth;
  const ny =  (bx - ax) / len * halfWidth;
  return {
    vertices: [
      { x: ax + nx, y: ay + ny },
      { x: bx + nx, y: by + ny },
      { x: bx - nx, y: by - ny },
      { x: ax - nx, y: ay - ny },
    ],
  };
}

// ─── Factory for the witch's walkable area ───────────────────────────────────

/**
 * Create the witch's navigation mesh for the given canvas dimensions.
 *
 * Shape (all proportional to canvas size):
 *   ┌─────────────────────┐  ← top connection bar
 *   │                     │
 *    \                   /   ← upper X arms
 *     \                 /
 *      ·───────────────·    ← X center (overlap square)
 *     /                 \
 *    /                   \   ← lower X arms
 *   │                     │
 *   └─────────────────────┘  ← bottom rectangle (pedestal)
 */
export function createWitchNavMesh(
  canvasWidth: number,
  canvasHeight: number,
): NavigationMesh {
  const w = canvasWidth;
  const h = canvasHeight;

  const xCx = w * 0.50;   // X centre x
  const xCy = h * 0.50;   // X centre y

  // Vertical extent of the shape
  const topBarTop    = h * 0.12;
  const topBarBottom = h * 0.25;
  const botRectTop   = h * 0.75;
  const botRectBot   = h * 0.88;

  // Horizontal extent
  const xLeft  = w * 0.20;
  const xRight = w * 0.80;

  // Half-width of each diagonal arm band
  const armHW = w * 0.07;

  // ── Top connection bar ──────────────────────────────────────────────────
  const topBar = makeRect(xLeft, topBarTop, xRight - xLeft, topBarBottom - topBarTop);

  // ── Diagonal X arms (connect top-bar bottom edge to centre) ─────────────
  // Extend arms slightly into the adjacent rectangles so there are no gaps
  const armOverlap = armHW * 0.5;

  const upperLeftArm  = makeDiagBand(xLeft,  topBarBottom - armOverlap, xCx, xCy, armHW);
  const upperRightArm = makeDiagBand(xRight, topBarBottom - armOverlap, xCx, xCy, armHW);
  const lowerLeftArm  = makeDiagBand(xCx, xCy, xLeft,  botRectTop + armOverlap, armHW);
  const lowerRightArm = makeDiagBand(xCx, xCy, xRight, botRectTop + armOverlap, armHW);

  // ── Centre overlap square (ensures the X crossing is always walkable) ───
  const centerPad = armHW * 1.2;
  const centerRect = makeRect(
    xCx - centerPad, xCy - centerPad,
    centerPad * 2, centerPad * 2,
  );

  // ── Bottom rectangle (pedestal) ──────────────────────────────────────────
  const bottomRect = makeRect(xLeft, botRectTop, xRight - xLeft, botRectBot - botRectTop);

  return new NavigationMesh([
    topBar,
    centerRect,
    upperLeftArm,
    upperRightArm,
    lowerLeftArm,
    lowerRightArm,
    bottomRect,
  ]);
}

// ─── Factory for the hut's walkable area ─────────────────────────────────────

/**
 * Create the navigation mesh for the hut image.
 * Uses proportional coordinates matching the 3 floors and 2 spiral stairs.
 */
export function createHutNavMesh(
  hutX: number,
  hutY: number,
  hutW: number,
  hutH: number,
): NavigationMesh {
  // Offset to move the whole path up to align with the drawing
  const yOffset = hutH * 0.09;

  // Ground Floor
  const groundFloor = makeRect(
    hutX + hutW * 0.15,
    (hutY + hutH * 0.85) - yOffset,
    hutW * 0.75,
    hutH * 0.10
  );

  // Middle Floor
  const middleFloor = makeRect(
    hutX + hutW * 0.18,
    (hutY + hutH * 0.58) - yOffset,
    hutW * 0.70,
    hutH * 0.08
  );

  // Top Floor
  const topFloor = makeRect(
    hutX + hutW * 0.18,
    (hutY + hutH * 0.40) - yOffset,
    hutW * 0.65,
    hutH * 0.08
  );

  // Stairs1 (Ground to Middle)
  const stairs1 = makeDiagBand(
    hutX + hutW * 0.80, (hutY + hutH * 0.88) - yOffset,
    hutX + hutW * 0.75, (hutY + hutH * 0.60) - yOffset,
    hutW * 0.06
  );

  // Stairs2 (Middle to Top)
  const stairs2 = makeDiagBand(
    hutX + hutW * 0.75, (hutY + hutH * 0.60) - yOffset,
    hutX + hutW * 0.70, (hutY + hutH * 0.42) - yOffset,
    hutW * 0.06
  );

  return new NavigationMesh([
    groundFloor,
    middleFloor,
    topFloor,
    stairs1,
    stairs2
  ]);
}
