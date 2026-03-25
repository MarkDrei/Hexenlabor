# Das funkelnde Hexenlabor – Architecture Documentation

_Following the [arc42](https://arc42.org) template (v8)_

---

## 1. Introduction and Goals

### 1.1 Requirements Overview

Das funkelnde Hexenlabor is a browser-based 2D game engine featuring:

- A player-controlled witch character that moves across a canvas
- Movement restricted to a defined X-shaped walkable area
- A* pathfinding that routes any canvas click to the nearest valid position
- Animated NPCs (cats, monsters) walking across the scene
- Animated background with sky, mountains, hills, and clouds

### 1.2 Quality Goals

| Priority | Goal | Description |
|----------|------|-------------|
| 1 | Correctness | The witch can only move within the defined walkable area |
| 2 | Reusability | Navigation infrastructure is decoupled from game UI |
| 3 | Responsiveness | All shapes scale proportionally when the browser window is resized |
| 4 | Maintainability | One source of truth: walkable area data drives both pathfinding and debug visualization |

### 1.3 Stakeholders

| Role | Expectation |
|------|-------------|
| Game designer | Easily define new walkable shapes without touching rendering code |
| Developer | Clear module boundaries, testable logic |

---

## 2. Architecture Constraints

- **TypeScript + ES Modules only** – no CommonJS
- **No external game engines or pathfinding libraries** – logic is custom and self-contained
- **Next.js 15 App Router** – UI lives in React server/client components
- **HTML5 Canvas** – all game rendering happens on a `<canvas>` element managed by a single `useEffect`
- **No global state** – all game state is held in local variables inside the `useEffect` closure (ref-based, no React re-renders for game logic)

---

## 3. System Scope and Context

```
Browser
└── Next.js App (http://localhost:3000)
    └── / (page.tsx)
        └── HelloWorld component (Canvas game)
            ├── Background renderer     (src/renderers/background.ts)
            ├── Things renderer         (src/renderers/things.ts)
            ├── Navigation mesh         (src/game/navigation.ts)
            └── Witch + NPC sprites     (public/assets/*.png)
```

The system is a single-page application with no external APIs or databases. All data flow is internal.

---

## 4. Solution Strategy

| Concern | Decision |
|---------|----------|
| Movement restriction | Polygon-based navigation mesh; A* pathfinding on a 20 px grid |
| Single source of truth | `NavigationMesh.polygons` is the only data store used for both walkability tests and debug rendering |
| Responsiveness | Canvas resized to `window.innerWidth/Height – 40px`; nav mesh recreated on every resize |
| Witch size | Fixed at **15% of canvas height** with preserved sprite aspect ratio |
| Witch position model | **Center point** `(x, y)` – both drawing and pathfinding operate on this single point |

---

## 5. Building Block View

### Level 1 – Modules

```
src/
├── app/                  Next.js App Router entry points
│   ├── layout.tsx        Root HTML layout
│   └── page.tsx          Renders HelloWorld component
├── components/
│   └── HelloWorld.tsx    Canvas game loop, event handling, sprite rendering
├── game/
│   └── navigation.ts     NavigationMesh + A* pathfinding + createWitchNavMesh()
├── renderers/
│   ├── background.ts     Sky, mountains, hills, clouds
│   ├── things.ts         Static environment objects (house, well, cauldron, …)
│   └── index.ts          Renderer interface
└── shared/
    └── types.ts          Shared types: Position, Size
```

### Level 2 – `navigation.ts` internals

```
NavigationMesh
├── polygons: NavPolygon[]        ← single source of truth
├── isWalkable(p)                 ray-casting point-in-polygon test
├── nearestWalkablePoint(p)       projects p onto the closest polygon edge
├── findPath(from, to)            grid A* → string-pull smoothing
│   ├── buildGrid()               20 px cells over polygon bounding box
│   ├── aStar()                   8-directional search
│   └── smoothPath()              greedy line-of-sight string pull
└── debugDraw(ctx)                draws polygons[] – same data as pathfinding

createWitchNavMesh(w, h)          factory → NavigationMesh
```

### Level 2 – `HelloWorld.tsx` game loop

```
useEffect()
├── updateCanvasSize()            resize canvas + recreate navMesh
├── handleMouseDown(e)            snap click → A* → set path[]
└── requestAnimationFrame loop
    ├── drawBackground()
    ├── drawThings()
    ├── navMesh.debugDraw()       draw walkable shape
    ├── witch movement update     follow path[] waypoints
    ├── witch sprite draw         center point (x,y), height = 15% canvas
    └── NPC update + draw
```

---

## 6. Runtime View

### Scenario: Player clicks a non-walkable position

```
1. mousedown → getMouseCanvasPos(e) → clickPos
2. navMesh.nearestWalkablePoint(clickPos) → snappedTarget
3. navMesh.findPath({x,y}, snappedTarget)
   a. Build 20px walkability grid
   b. A* search from witch centre to goal
   c. String-pull path smoothing
   → path[] (world-space waypoints)
4. pathIndex = 0
5. Each rAF frame: advance witch along path[], update sprite animation
6. On arrival at final waypoint: idle animation
```

### Scenario: Canvas resize

```
1. window 'resize' event
2. canvas.width/height updated
3. navMesh = createWitchNavMesh(canvas.width, canvas.height)
   (new polygon coordinates proportional to new canvas size)
4. displayHeight = canvas.height * 0.15  (recomputed each frame)
```

---

## 7. Deployment View

The application is a static Next.js export served by the Next.js dev server (or any static file host after `npm run build`). No server-side state; no database.

```
npm run dev   → Next.js dev server on port 3000
npm run build → .next/ static build
npm run start → serve .next/ in production mode
```

---

## 8. Cross-cutting Concepts

### 8.1 Navigation Mesh & Pathfinding

The `NavigationMesh` class is the reusable core of movement restriction:

- **Polygon definition** (`NavPolygon[]`): arbitrary convex or concave polygons
- **Walkability test**: ray-casting algorithm (`isWalkable`)
- **Nearest walkable point**: project onto closest polygon edge (`nearestWalkablePoint`)
- **Pathfinding**: grid A* with 8-directional movement and greedy string-pull smoothing (`findPath`)
- **Visualization**: debug draw using the same polygon data (`debugDraw`)

All four operations operate on `this.polygons` exclusively — there are no separate data sets for drawing vs. collision.

### 8.2 Witch Position Model

The witch is represented as a **single center point** `(x, y)`. All operations use this point:

- **Drawing**: sprite rendered centered on `(x, y)` — `ctx.drawImage(…, x - w/2, y - h/2, w, h)`
- **Pathfinding source**: `navMesh.findPath({ x, y }, target)` — witch center is the path origin
- **Walkability** (implicit): start of A* is snapped via `nearestWalkablePoint` to ensure it stays on-mesh

### 8.3 Coordinate System

All positions are in **canvas pixel space** (origin top-left). Proportional constants (e.g., `h * 0.15` for witch height, `w * 0.20` for X-arm start) are multiplied at runtime, ensuring correct scaling on every window resize.

### 8.4 Animation

Sprite sheets follow the convention `width / numFrames × height / numRows`. The witch uses 5 walk frames × 2 rows (top = walk right, unused bottom row). Frame advancement is driven by a `tickCount` counter (`ticksPerFrame = 8`).

---

## 9. Architecture Decisions

### ADR-1: Polygon-based nav mesh over tilemap

**Context**: The walkable area is an irregular X shape with diagonal arms.  
**Decision**: Use polygon zones rather than a tilemap.  
**Rationale**: Polygons scale exactly with any canvas size; no pixel grid to maintain. The A* grid is computed on-the-fly from the polygon bounding box, keeping the polygon as the only authoritative shape definition.

### ADR-2: Single `NavigationMesh` class with combined draw + pathfinding

**Context**: Keeping debug visualization in sync with walkable area logic.  
**Decision**: `debugDraw` is a method of `NavigationMesh` and iterates over the same `polygons` array.  
**Rationale**: It is architecturally impossible for the visual representation to diverge from the collision data; there is only one place to change the shape.

### ADR-3: Center-point witch model

**Context**: Simplicity of collision and pathfinding queries.  
**Decision**: Use a single `(x, y)` center point for all witch operations.  
**Rationale**: The walkable corridors are wide enough (≈ 14% of canvas width each arm) that a point model is sufficient. A bounding-box model would require more complex polygon-vs-rectangle intersection tests and significantly slower A* grid generation.

### ADR-4: Witch height fixed at 15% of canvas height

**Context**: The witch sprite should be visually proportionate regardless of window size.  
**Decision**: `displayHeight = canvas.height * 0.15`, recomputed each frame; `displayWidth` scales proportionally.  
**Rationale**: Percentage-based sizing ensures the character is neither too small on large monitors nor too large on small ones.

---

## 10. Quality Requirements

| Scenario | Stimulus | Expected Response |
|----------|----------|-------------------|
| Click outside walkable area | `mousedown` on non-walkable pixel | Witch walks to nearest walkable point via A* |
| Window resize | Browser window resized | Nav mesh and witch size update within 1 frame |
| Pathfinding with no route | Start/goal in disconnected areas | Falls back to returning `[goal]` directly |
| Sprite direction | Witch moving left | Sprite flipped horizontally via `ctx.scale(-1, 1)` |

---

## 11. Risks and Technical Debt

| Item | Description | Mitigation |
|------|-------------|-----------|
| A* performance | Linear open-set scan; O(n²) for large grids | Grid cells are 20 px; typical canvas ≈ 2000×1000 → ~5000 cells, acceptable |
| Single `useEffect` monolith | All game logic in one closure | Acceptable for current scope; split into custom hooks if complexity grows |
| No persistence | Game state lost on page refresh | By design for current scope |
| NPC collision | NPCs do not use nav mesh | Future work: extend `NavigationMesh` for NPC routing |
