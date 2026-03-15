# Das funkelnde Hexenlabor ✨

A magical game engine built with Next.js 15, TypeScript, React, and HTML5 Canvas.

## Project Overview

Das funkelnde Hexenlabor is a full-stack game engine combining:

- **Frontend**: React components with Canvas rendering
- **Backend**: Next.js API routes with iron-session authentication
- **Shared**: TypeScript types and utilities for type-safe full-stack development
- **Testing**: Vitest for unit and integration tests

## Tech Stack

### Framework & Language

- **Next.js 15** - React framework with App Router
- **TypeScript** - Full-stack type safety (ES Modules only)
- **React 19** - UI component library

### Frontend

- **React Hooks** - State and side-effect management
- **HTML5 Canvas** - Game rendering engine
- **Tailwind CSS** - Utility-first styling
- **Custom Game Engine** - Core game logic in `/src/game`

### Backend

- **Next.js API Routes** - Located in `/src/app/api`
- **iron-session** - HTTP-only cookie session management
- **Shared Types** - TypeScript types in `/src/shared`

### Development & Testing

- **Vitest** - Fast unit and integration testing
- **TypeScript** - Compile-time type safety
- **Tailwind CSS** - Responsive design

## Project Structure

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   ├── layout.tsx        # Root layout component
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles with Tailwind
├── components/           # React components
├── game/                 # Game engine logic
├── renderers/            # Canvas rendering utilities
└── shared/               # Shared types and utilities

tests/                     # Test files
public/                    # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ (with npm or pnpm)
- Git

### Installation

1. Navigate to the project directory:
```bash
cd Hexenlabor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file from the template:
```bash
cp .env.example .env.local
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The page will auto-reload on code changes.

### Build for Production

```bash
npm run build
npm run start
```

### Testing

Run tests with Vitest:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run test:ui` - Run tests with UI

## Development Guidelines

### TypeScript

This project uses **ES Modules only**. All imports must use the `.ts`/`.tsx` extensions:

```typescript
import { Component } from '@/components/Component.ts';
```

### Path Aliases

Use path aliases defined in `tsconfig.json`:

- `@/*` - Src directory
- `@/components/*` - Components
- `@/game/*` - Game engine
- `@/renderers/*` - Rendering utilities
- `@/shared/*` - Shared types and utilities

### Styling

Use Tailwind CSS for styling. Global styles are defined in `src/app/globals.css`.

```tsx
<div className="flex items-center justify-center bg-slate-900">
  Canvas Game
</div>
```

### Component Patterns

Use React hooks for state management:

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function GameComponent() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    // Setup game
  }, []);

  return <canvas ref={canvasRef} />;
}
```

## API Routes

API routes are located in `src/app/api/` and use the Next.js 15 App Router pattern:

```typescript
// src/app/api/game/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
}
```

## Authentication

Session management is handled with `iron-session`. Implement protected routes using:

```typescript
import { getSession } from '@/lib/session.ts';

export async function GET(request: NextRequest) {
  const session = await getSession();
  // Use session data
}
```

## Future Enhancements

- [ ] Database schema (PostgreSQL) - schema-first approach
- [ ] Advanced rendering with multiple Canvas renderers
- [ ] Game state management system
- [ ] Type-safe lock system for concurrency
- [ ] In-memory caching with persistence

## License

MIT

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

---

✨ Happy coding in Das funkelnde Hexenlabor! ✨
