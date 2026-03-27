# Das funkelnde Hexenlabor - AI Agent Instructions

Workspace instructions for "Das funkelnde Hexenlabor", a casual browser game for kids built with Next.js 15, TypeScript, React, and HTML5 Canvas.

---

## 🎯 Project Overview

**Das funkelnde Hexenlabor** is a magical potion-brewing game featuring:
- A witch who moves through a three-floor hut via tap/click (A* pathfinding)
- Auto-collected ingredients that spawn on specific floors
- Cauldron brewing mini-game (tap the bubbles)
- NPC order system (cat 🐱 on top floor, monster 👾 on middle floor)
- 8-slot stackable inventory (`{ type, count }[]`, max 256 per type)
- Stars, levels, recipe unlocks, and a highscore API

**Key principle**: No losing state; pure progression. Designed for young/casual players on touch devices.

---

## 📁 Project Structure

### Core Directories

```
src/
├── app/                          # Next.js App Router
│   ├── api/scores/route.ts       # Highscore GET/POST (iron-session, in-memory)
│   ├── layout.tsx
│   ├── page.tsx                  # Renders <GameCanvas />
│   └── globals.css
├── components/
│   └── GameCanvas.tsx            # Main game loop, pointer events, all rendering wired here
├── game/
│   ├── navigation.ts             # NavigationMesh + A* + createHutNavMesh()
│   ├── state.ts                  # gameState singleton + addToInventory/removeFromInventory/addStars/…
│   ├── ingredients.ts            # Spawn, update, floor placement, auto-collect logic
│   ├── recipes.ts                # ALL_RECIPES, findMatchingRecipe(), consumeRecipeIngredients()
│   └── orders.ts                 # NPC order spawning, getOrderForRequester(), hasMatchingPotion()
├── renderers/
│   ├── hud.ts                    # drawHud(): stars, 8-slot inventory + badge, orders, recipe book
│   ├── effects.ts                # Sparkles, glow, brewing bubbles, candles, floating sparkles
│   └── index.ts                  # Renderer interface
└── shared/
    └── types.ts                  # All shared types: IngredientType, GameState, Recipe, Order, HutBounds, …

tests/
├── navigation.test.ts            # 17 A* / nav mesh tests
└── example.test.ts               # 1 smoke test

public/assets/                    # hut.png, witch.png, catFluffy.png, monster.png, things.png
```

> **Note**: `src/components/HelloWorld.tsx` is a legacy file, no longer used. `page.tsx` imports `GameCanvas`.

### Key Configuration Files

- `next.config.ts` — Next.js configuration (no swcMinify in Next.js 15)
- `tsconfig.json` — TypeScript with path aliases (`@/*`, `@/components/*`, etc.)
- `tailwind.config.ts` — Tailwind CSS with hexenlabor theme colors
- `vitest.config.ts` — Vitest with jsdom environment
- `postcss.config.mjs` — PostCSS with Tailwind and autoprefixer

---

## 🎮 Game Systems Overview

### Navigation (`game/navigation.ts`)
- `NavigationMesh` — polygon A* with 20 px grid, string-pull smoothing
- `createHutNavMesh(hutX, hutY, hutW, hutH)` — 3 floors + 2 diagonal stair bands, all Y from `hutH` with `yOffset = hutH * 0.06`

### State (`game/state.ts`)
- `gameState` — module-level singleton (no React state for game logic)
- Key functions: `addToInventory`, `removeFromInventory`, `inventoryFull`, `addStars`, `startBrewing`, `setPhase`, `completeOrder`
- Inventory: `{ type: IngredientType; count: number }[]` — 8 slots, max 256 per type

### Ingredients (`game/ingredients.ts`)
- 8 ingredient types across 3 floors (ground: Zauberbeerle/Kerze; middle: Hexenkraut/Fliegenpilz; top: Mondkristall/Mondstein/Stern/Schmetterling)
- Auto-spawn every ~1.5 s, max 3 per floor, 60 s lifetime

### Recipes (`game/recipes.ts`)
- `findMatchingRecipe()` — checks all 3-element subsets of distinct slot types in inventory
- `consumeRecipeIngredients(recipe)` — decrements the 3 used ingredient stacks
- 8 recipes unlocked across levels 1–5

### Orders (`game/orders.ts`)
- Spawn every 30–60 s, max 3 active
- Requesters: `'cat'`, `'monster'`, `'visitor'`
- Delivery: long-press NPC with matching `brewedPotion`

### HUD (`renderers/hud.ts`)
- `drawHud()` returns `HudLayout` with inventory slot hit-boxes and recipe book button hit-box
- 8 inventory slots rendered at all times; filled slot shows emoji + count badge if > 1
- Bottom-center orders bar shows `requesterEmoji → potionEmoji`

---

## 🔧 Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (watch mode) |
| `npm run test:ui` | Vitest UI |

### Before committing

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

---

## 📝 Code Style & Conventions

### TypeScript

- **Target**: ES2020, strict mode
- **ES Modules only** — no CommonJS
- **Path Aliases**: `@/` prefix always (e.g., `import { GameState } from '@/shared/types'`)

### React Components

- Mark interactive components with `'use client'`
- Use `useRef` + `useEffect` for canvas setup
- **No React state for game logic** — mutate `gameState` directly

### Canvas / Game Loop Pattern

```typescript
'use client';
import { useEffect, useRef } from 'react';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    const render = () => {
      // clear, update, draw
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full" />;
}
```

### Inventory Data Model

```typescript
// Adding an ingredient — stacks same type, up to 256, max 8 slots
addToInventory(IngredientType.Hexenkraut);

// Removing one from a slot (decrements count, splices if 0)
removeFromInventory(slotIndex);

// Consuming exactly the 3 ingredients a recipe needs
consumeRecipeIngredients(recipe);
```

### API Routes

```typescript
// src/app/api/scores/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ scores: [] });
}
export async function POST(request: NextRequest) {
  const { name, score } = await request.json();
  return NextResponse.json({ success: true });
}
```

---

## ✅ Testing

- **Framework**: Vitest with jsdom (`vitest.config.ts`)
- **Location**: `tests/` (mirrors `src/`)
- **Current**: 18 passing tests (17 navigation, 1 smoke)

```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should work', () => {
    expect(myFunction()).toBe(expectedValue);
  });
});
```

---

## ⚠️ Known Issues & Pitfalls

1. **JSX Configuration**: Next.js 15 sets `"jsx": "preserve"` automatically. Don't override.
2. **swcMinify Deprecated**: Removed from `next.config.ts` (built into Next.js 15).
3. **ES Modules Only**: No `.js` imports — use `.ts`/`.tsx` extensions.
4. **Canvas Rendering**: Canvas component must use `'use client'`.
5. **No React state for game**: Mutate `gameState` directly; don't use `useState` for game logic.
6. **Inventory is `{ type, count }[]`**: Not a fixed-length array. `gameState.inventory[i]` may be `undefined` for empty visual slots — use `?? null` guard in renderers.
7. **HUD slot count**: `INVENTORY_MAX_SLOTS = 8` is defined in `hud.ts`. The renderer always draws 8 slots regardless of how many items are in `gameState.inventory`.
8. **`inventoryFull()`**: Returns `true` only when all 8 slots are occupied AND all stacks are at 256. In practice, "soft full" (8 distinct types) is the common case.

---

## 📦 Dependency Notes

- **next** (15.x), **react**/**react-dom** (19.x), **typescript** (5.x)
- **tailwindcss** (3.x), **iron-session** (8.x)
- **vitest** (1.x) + jsdom, **eslint** + eslint-config-next

---

## 🔍 AI Agent Guidance

1. **Run `npx tsc --noEmit` after edits** — catches type errors before build
2. **Use path aliases** — never relative imports from root
3. **Check `inventoryFull()` semantics** before using it — it's a strict "all 256" check, not "8 distinct types"
4. **Recipe matching uses subsets** — `findMatchingRecipe()` iterates all 3-element combos of slot types
5. **HUD always renders 8 slots** — `gameState.inventory[i]` may be undefined; renderer uses `?? null`
6. **Long-press = 500 ms timeout** in `GameCanvas.tsx` — don't confuse with tap logic

### Full verification

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

---

## 🎨 Styling & Theme

- **Primary**: `#7c3aed` (hexenlabor.primary)
- **Secondary**: `#a78bfa` (hexenlabor.secondary)
- **Accent**: `#ec4899` (hexenlabor.accent)
- **Background**: `bg-slate-900` (dark)
- **Text**: `text-slate-100`

---

## 📚 Possible Next Steps

- [ ] Persistent highscores (PostgreSQL / KV store)
- [ ] Visitor NPC with delivery on screen edge
- [ ] Sound effects / BGM
- [ ] More recipe tiers / seasonal ingredients
- [ ] Tutorial overlay for first-time players

---

## 📖 Quick Reference

| Task | Location | Pattern |
|------|----------|---------|
| Add ingredient type | `src/shared/types.ts` + `src/game/ingredients.ts` | Add to `IngredientType` enum + `INGREDIENT_DEFS` |
| Add recipe | `src/game/recipes.ts` | Push to `ALL_RECIPES` |
| Add NPC | `src/components/GameCanvas.tsx` | Add wander state, sprite draw, long-press handler |
| Add API route | `src/app/api/path/route.ts` | Export `GET`/`POST` |
| Add type | `src/shared/types.ts` | Export interface/type |
| Add test | `tests/path.test.ts` | Import from vitest |

---

Last updated: March 27, 2026
