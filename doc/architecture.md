# Das funkelnde Hexenlabor – Architecture Documentation

_Following the [arc42](https://arc42.org) template (v8)_

---

## 1. Introduction and Goals

### 1.1 Requirements Overview

Das funkelnde Hexenlabor is a casual browser game for kids featuring:

- A player-controlled witch who moves through a three-floor hut via tap/click
- A* pathfinding on a polygon-based navigation mesh (3 floors + 2 stair bands)
- Auto-collection of ingredients that spawn on specific floors
- Cauldron-based potion brewing mini-game (tap the bubbles!)
- NPC order system (cat 🐱 on top floor, monster 👾 on middle floor)
- A stackable 8-slot inventory (`{ type, count }[]`, max 256 per type)
- Stars, level progression, and recipe unlocks
- HUD: inventory, orders, recipe book, level-up celebration
- Highscore API (`/api/scores`) backed by iron-session

### 1.2 Quality Goals

| Priority | Goal | Description |
|----------|------|-------------|
| 1 | Playability | Game is fun and clear for young/casual players with no reading required |
| 2 | Correctness | Witch and NPCs can only walk on valid floor/stair zones |
| 3 | Responsiveness | All coordinates and sizes scale with the viewport at runtime |
| 4 | Maintainability | Each game system (ingredients, recipes, orders, HUD) is a separate module |

### 1.3 Stakeholders

| Role | Expectation |
|------|-------------|
| Player (child) | Intuitive touch controls, no losing state, colorful feedback |
| Developer | Clear module boundaries, testable logic, type-safe interfaces |

---

## 2. Architecture Constraints

- **TypeScript + ES Modules only** — no CommonJS
- **No external game engines or pathfinding libraries** — all logic is custom
- **Next.js 15 App Router** — UI lives in a single React client component
- **HTML5 Canvas** — all game rendering on a `<canvas>` via a single `useEffect` + `requestAnimationFrame` loop
- **No React state for game logic** — all mutable game state lives in `gameState` (module-level singleton) or local closure variables

---

## 3. System Scope and Context

```
Browser (touch or desktop)
└── Next.js App (http://localhost:3000)
    └── / (page.tsx)
        └── <GameCanvas /> (src/components/GameCanvas.tsx)
            ├── Navigation mesh    (src/game/navigation.ts)
            ├── Game state         (src/game/state.ts)
            ├── Ingredients        (src/game/ingredients.ts)
            ├── Recipes            (src/game/recipes.ts)
            ├── Orders             (src/game/orders.ts)
            ├── HUD renderer       (src/renderers/hud.ts)
            ├── Effects renderer   (src/renderers/effects.ts)
            └── Sprites            (public/assets/*.png)

Next.js API
└── /api/scores (src/app/api/scores/route.ts)
    └── iron-session (in-memory highscores)
```

---

## 4. Solution Strategy

| Concern | Decision |
|---------|----------|
| Movement restriction | 3-floor polygon nav mesh; A* pathfinding on a 20 px grid |
| Hut scaling | Nav mesh and all floor Y positions computed from `hutBounds` (derived from `canvas.height`) each resize |
| Ingredient stacking | `inventory: { type, count }[]` — same type increments count rather than occupying a new slot |
| Recipe matching | All 3-element subsets of occupied inventory slots checked against unlocked recipes |
| Brewing reward | Hit count × base star reward — tap-the-bubbles mini-game |
| NPC orders | Random orders spawn every 30–60 s; delivered by long-press with matching brewed potion |

---

## 5. Building Block View

### Level 1 – Modules

```
src/
├── app/
│   ├── api/scores/route.ts   GET/POST highscores (iron-session)
│   ├── layout.tsx
│   └── page.tsx              Renders <GameCanvas />
├── components/
│   └── GameCanvas.tsx        Game loop, pointer events, sprite draw, system wiring
├── game/
│   ├── navigation.ts         NavigationMesh, A*, createHutNavMesh()
│   ├── state.ts              GameState singleton + addToInventory / removeFromInventory / addStars / …
│   ├── ingredients.ts        Spawn, update, floor placement, auto-collect
│   ├── recipes.ts            ALL_RECIPES, findMatchingRecipe(), consumeRecipeIngredients()
│   └── orders.ts             Order spawning, getOrderForRequester(), hasMatchingPotion()
├── renderers/
│   ├── hud.ts                drawHud(): stars, inventory slots + badge, orders bar, recipe book, celebration
│   ├── effects.ts            drawSparkles(), drawBrewingBubbles(), drawCandle(), drawFloatingSparkles()
│   └── index.ts              Renderer interface
└── shared/
    └── types.ts              All shared interfaces and enums (IngredientType, GameState, Recipe, Order, …)

tests/
├── navigation.test.ts        17 A* / nav mesh tests
└── example.test.ts           1 smoke test
```

### Level 2 – `navigation.ts` internals

```
NavigationMesh
├── polygons: NavPolygon[]        ← single source of truth
├── isWalkable(p)                 ray-casting point-in-polygon test
├── nearestWalkablePoint(p)       projects p onto closest polygon edge
├── findPath(from, to)            grid A* → string-pull smoothing
│   ├── buildGrid()               20 px cells over polygon bounding box
│   ├── aStar()                   8-directional search
│   └── smoothPath()              greedy line-of-sight string pull
└── debugDraw(ctx)                draws polygons[] (same data as pathfinding)

createHutNavMesh(hutX, hutY, hutW, hutH)
├── ground floor polygon    (hutH * 0.85 – 0.95 band)
├── middle floor polygon    (hutH * 0.57 – 0.69 band)
├── top floor polygon       (hutH * 0.38 – 0.50 band)
├── left staircase band     (diagonal strip ground → middle)
└── right staircase band    (diagonal strip middle → top)
```

### Level 2 – `GameCanvas.tsx` game loop

```
useEffect()
├── updateCanvasSize()           resize canvas + recreate navMesh + hutBounds
├── Pointer event handlers
│   ├── handlePointerDown()      tap → recipe book / inventory discard / cauldron / move
│   ├── handlePointerUp()        cancel long-press timer
│   └── handleLongPress()        pet NPC (+1 star) or deliver potion
└── requestAnimationFrame loop
    ├── drawBackground (hutImg)
    ├── drawThings (cauldron, books)
    ├── spawnIngredient / updateIngredients / drawIngredientPickup
    ├── updateOrders
    ├── witch movement update    follow path[] waypoints
    ├── witch sprite draw        center (x,y), height = 15% canvas
    ├── NPC (cat, monster) wander AI + sprite draw + speech bubble
    ├── drawSparkles / drawCollectAnimations / drawBrewingBubbles
    └── drawHud() → hudLayout (inventorySlots hit-boxes)
```

### Level 2 – Inventory data model

```
GameState.inventory: { type: IngredientType; count: number }[]

addToInventory(type)
├── If type already in a slot → count++ (up to MAX_STACK = 256)
└── Else if length < 8 → push new slot

removeFromInventory(index)
├── slot.count--
└── If count == 0 → splice(index, 1)

consumeRecipeIngredients(recipe)
└── For each of 3 ingredients → findIndex by type → decrement/splice
```

---

## 6. Runtime View

### Scenario: Player taps cauldron with a matching set of ingredients

```
1. pointerdown → tap position
2. distanceTo(cauldronCenter) < 50 → cauldron tap branch
3. findMatchingRecipe()
   a. inv = inventory.map(s => s.type)  (one entry per slot)
   b. Try all 3-element subsets → first match with unlocked recipe
   → Recipe | null
4. startBrewing() → phase = 'brewing', brewingState created
5. navMesh.findPath(witch, cauldronCenter) → walk path
6. Brewing mini-game: bubbles appear, player taps each
7. finishBrewing():
   a. hits × recipe.rewardStars → addStars()
   b. consumeRecipeIngredients(recipe) → decrement stacks
   c. gameState.brewedPotion = recipe
   d. phase = 'exploring'
```

### Scenario: NPC order spawning and delivery

```
1. updateOrders() fires every ~30–60 s
2. Pick random available requester + random unlocked recipe → Order
3. drawSpeechBubble() shows potion emoji above NPC
4. Orders bar at bottom shows requester emoji → potion emoji
5. Player long-presses NPC with matching brewedPotion
6. hasMatchingPotion(requester) → true
7. deliverPotion():
   a. completeOrder(order.id) → remove from activeOrders
   b. addStars(recipe.rewardStars) → possible level-up
   c. gameState.brewedPotion = null
   d. Celebration sparkles
```

### Scenario: Canvas resize

```
1. window 'resize' event
2. canvas.width/height updated
3. hutBounds = { hutX, hutY, hutW, hutH, yOffset } recomputed
4. navMesh = createHutNavMesh(hutX, 0, hutW, hutH)
   (all polygon coordinates proportional to new hutH)
5. displayHeight = canvas.height * 0.15  (recomputed each frame)
```

---

## 7. Deployment View

Single-page Next.js application. The `/api/scores` route requires a Node.js runtime (iron-session). No database; scores are held in-memory per process.

```
npm run dev   → Next.js dev server on port 3000
npm run build → .next/ build artifact
npm run start → serve .next/ in production mode (Render, etc.)
```

---

## 8. Cross-cutting Concepts

### 8.1 Navigation Mesh & Pathfinding

`NavigationMesh` handles both walkability and pathfinding via the same `polygons[]` data. The hut nav mesh (`createHutNavMesh`) consists of five polygons: three horizontal floor bands and two diagonal stair bands connecting them. All Y coordinates are scaled from `hutH` with a `yOffset = hutH * 0.06` applied globally to fine-tune visual alignment.

### 8.2 Witch & NPC Position Model

The witch and NPCs are represented as single center points `(x, y)`. Drawing uses `ctx.drawImage(…, x - w/2, y - h/2, w, h)`. Horizontal flipping is achieved via `ctx.scale(-1, 1)` with a matching `ctx.translate`.

### 8.3 Coordinate System

All positions are in **canvas pixel space** (origin top-left). Proportional constants (`hutH * 0.63` for middle floor Y, etc.) are multiplied at runtime, ensuring correct scaling on every resize.

### 8.4 Animation

Sprite sheets: `width / numFrames × height / numRows`. The witch uses 5 walk frames × 2 rows; NPCs use 5 frames × 2 rows. Frame advancement uses a `tickCount` counter (`ticksPerFrame = 8`).

### 8.5 Ingredient Stacking

The inventory uses `{ type, count }[]` rather than a fixed-length nullable array. This allows up to 8 distinct ingredient types with up to 256 of each in a single slot. Recipe consumption decrements the relevant stack and splices out empty slots.

### 8.6 Input Handling

All pointer events are handled via the Pointer Events API (`pointerdown`, `pointerup`, `pointercancel`), unifying mouse and touch. Long-press is implemented with a `setTimeout(500 ms)` cleared on `pointerup`.

---

## 9. Architecture Decisions

### ADR-1: Polygon-based nav mesh over tilemap

**Context**: The walkable area consists of three irregular floor bands and two diagonal stair corridors.  
**Decision**: Use polygon zones; A* grid computed on-the-fly from polygon bounding box.  
**Rationale**: Polygons scale exactly with any canvas size and remain the only authoritative shape definition.

### ADR-2: Module-level `gameState` singleton

**Context**: Game state must persist across `requestAnimationFrame` ticks without triggering React re-renders.  
**Decision**: `gameState` is a module-level object mutated in place; React is not involved in game logic.  
**Rationale**: Using `useState`/`useReducer` would cause unnecessary re-renders at 60 fps.

### ADR-3: Stacked inventory `{ type, count }[]`

**Context**: With 8 ingredient types and only 8 slots, a flat nullable array wastes space when duplicates exist.  
**Decision**: Same ingredient type increments a counter on the existing slot.  
**Rationale**: Players can accumulate many of one ingredient without blocking other types; simplifies recipe matching to a per-type count check.

### ADR-4: 3-element subset recipe matching

**Context**: The inventory may contain stacks of duplicates; a recipe requires 3 specific types.  
**Decision**: `findMatchingRecipe()` checks all 3-element combinations of distinct slot types.  
**Rationale**: Supports having e.g. 5× Hexenkraut and still correctly finding a recipe that needs 1× Hexenkraut.

### ADR-5: No losing state

**Context**: Target audience is young children.  
**Decision**: No health bars, no time limits, no failure state. Progress only accumulates.  
**Rationale**: Keeps the game stress-free and accessible.

---

## 10. Quality Requirements

| Scenario | Stimulus | Expected Response |
|----------|----------|-------------------|
| Tap outside walkable area | `pointerdown` on non-walkable pixel | Witch walks to nearest walkable point via A* |
| Window resize | Browser window resized | Nav mesh, ingredient positions, and HUD recalculated within 1 frame |
| Inventory full with mismatched ingredients | Player visits an ingredient | `addToInventory` returns false; ingredient stays on floor |
| Correct recipe in inventory but stacked | Tap cauldron | 3-element subset matching finds recipe correctly |
| NPC order delivered | Long-press NPC with matching potion | Stars credited, potion cleared, order removed |

---

## 11. Risks and Technical Debt

| Item | Description | Mitigation |
|------|-------------|-----------|
| A* performance | Linear open-set scan; O(n²) for large grids | Grid cells are 20 px; typical canvas ≈ 2000×1000 → ~5000 cells, acceptable |
| Single `useEffect` monolith | All game logic in one closure | Acceptable for current scope; split into custom hooks if complexity grows |
| In-memory highscores | Scores lost on server restart | By design for current scope; replace with DB when needed |
| NPC pathfinding | NPCs don't use the nav mesh; they walk on a fixed Y band | Future: extend nav mesh routing to NPCs |
| `HelloWorld.tsx` | Unused legacy component left in codebase | Can be deleted once confirmed no references remain |

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
