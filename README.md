# Das funkelnde Hexenlabor ✨

A casual browser game for kids built with Next.js 15, TypeScript, React, and HTML5 Canvas. Run a magical witch's laboratory: collect ingredients, brew potions, and deliver them to your pets!

## Gameplay

You are the **witch** in her three-floor hut. Tap anywhere to move, automatically collect ingredients you walk over, brew potions at the cauldron, and deliver them to the cat 🐱 or the monster 👾.

### Controls

| Action | How |
|---|---|
| Move witch | Tap anywhere on screen |
| Collect ingredient | Walk over it — auto-picked up |
| Brew potion | Tap the cauldron (need 3 matching ingredients) |
| Discard ingredient | Tap an inventory slot (top-right) |
| Pet an NPC | Long-press on cat or monster |
| Deliver potion | Long-press on the NPC that ordered it |

### HUD at a glance

| Area | Meaning |
|---|---|
| ⭐ `1234` top-left | Your star count |
| `Lv.3` below stars | Current level |
| 8 slots top-right | Inventory — same types stack, number shows count |
| Pink slot (right of inventory) | Brewed potion ready to deliver |
| Bottom center | Active orders, e.g. `🐱 → 💜` = cat wants a sleep potion |
| 📖 bottom-right | Recipe book (🔒 = not yet unlocked) |

### Ingredients & Floors

| Floor | Ingredients |
|---|---|
| Ground | 🫐 Zauberbeerle (common), 🕯️ Kerze (uncommon) |
| Middle | 🌿 Hexenkraut (common), 🍄 Fliegenpilz (uncommon) |
| Top | 💎 Mondkristall (rare), 🌙 Mondstein (rare), ⭐ Stern (rare), 🦋 Schmetterling (epic) |

### Recipes (8 total, unlocked by level)

| Potion | Emoji | Ingredients | Stars | Level |
|---|---|---|---|---|
| Heiltrank | 💚 | Hexenkraut + Zauberbeerle + Mondkristall | 10 | 1 |
| Schlaftrank | 💜 | Hexenkraut + Mondstein + Zauberbeerle | 15 | 1 |
| Liebestrank | 💕 | Mondstein + Fliegenpilz + Stern | 20 | 2 |
| Feuertrank | 🔥 | Kerze + Fliegenpilz + Stern | 25 | 3 |
| Sternenstaub | ✨ | Stern + Mondkristall + Schmetterling | 30 | 4 |
| Mondtrank | 🌕 | Mondstein + Mondkristall + Kerze | 30 | 4 |
| Regenbogentrank | 🌈 | Mondkristall + Schmetterling + Stern | 50 | 5 |
| Ewigkeitstrank | ♾️ | Schmetterling + Mondstein + Hexenkraut | 50 | 5 |

### Brewing mini-game

Tap the bubbles that appear — each hit multiplies your star reward!

---

## Tech Stack

### Framework & Language

- **Next.js 15** — React framework with App Router
- **TypeScript** — Full-stack type safety (ES Modules only)
- **React 19** — UI component library

### Frontend

- **HTML5 Canvas** — All game rendering via `requestAnimationFrame`
- **Pointer Events API** — Unified touch + mouse input
- **Tailwind CSS** — Utility-first styling
- **Custom game systems** — Navigation, ingredients, recipes, orders, HUD, effects

### Backend

- **Next.js API Routes** — `/src/app/api/scores` for highscores
- **iron-session** — HTTP-only cookie sessions

### Testing

- **Vitest** — Unit and integration tests (18 tests)

---

## Project Structure

```
src/
├── app/
│   ├── api/scores/       # Highscore GET/POST endpoint
│   ├── layout.tsx
│   ├── page.tsx          # Renders <GameCanvas />
│   └── globals.css
├── components/
│   └── GameCanvas.tsx    # Main game loop, input, rendering
├── game/
│   ├── engine.ts         # (legacy stub)
│   ├── navigation.ts     # NavigationMesh + A* + createHutNavMesh()
│   ├── state.ts          # GameState singleton + mutation functions
│   ├── ingredients.ts    # Ingredient spawning & collection
│   ├── recipes.ts        # Recipe definitions + matching + consumption
│   └── orders.ts         # NPC order spawning & delivery
├── renderers/
│   ├── hud.ts            # HUD: stars, inventory, orders, recipe book
│   ├── effects.ts        # Sparkles, glow, brewing bubbles, candles
│   └── index.ts          # Renderer interface
└── shared/
    └── types.ts          # All shared types and enums

tests/
public/assets/            # hut.png, witch.png, catFluffy.png, …
```

---

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install
cp .env.example .env.local
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm run start
```

### Tests

```bash
npm test          # watch mode
npm run test:ui   # Vitest UI
```

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (watch) |
| `npm run test:ui` | Vitest UI |

---

## Deployment on Render

The project includes a [`render.yaml`](render.yaml) for one-click deployment via [Render's Infrastructure as Code](https://render.com/docs/infrastructure-as-code).

### Quick Deploy

1. Push the repository to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**.
3. Connect your repository — Render detects `render.yaml` automatically.
4. Review and click **Apply**.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` (pre-configured in `render.yaml`) |
| `SECRET_COOKIE_PASSWORD` | Yes | 32-char secret for iron-session — auto-generated by Render |

---

## License

MIT

✨ Happy brewing! ✨
