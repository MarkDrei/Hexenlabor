# Das funkelnde Hexenlabor - AI Agent Instructions

Workspace instructions for "Das funkelnde Hexenlabor", a full-stack game engine built with Next.js 15, TypeScript, React, and HTML5 Canvas.

---

## 🎯 Project Overview

**Das funkelnde Hexenlabor** is a magical game engine featuring:
- Full-stack TypeScript with ES Modules only
- React 19 + Next.js 15 App Router for frontend
- HTML5 Canvas for game rendering
- Next.js API routes for backend
- iron-session for HTTP-only cookie sessions
- Vitest for testing

**Key principle**: Type-safe, compile-time verified full-stack development.

---

## 📁 Project Structure

### Core Directories

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API route handlers [src/app/api/route.ts pattern]
│   ├── layout.tsx          # Root layout component with metadata
│   ├── page.tsx            # Home page (imports components)
│   └── globals.css         # Tailwind + global styles
├── components/             # React client components [use 'use client' directive]
├── game/                   # Game engine logic & state management
├── renderers/              # Canvas rendering utilities & interfaces
└── shared/                 # Shared types, utilities, constants
    └── types.ts            # Common interfaces (Position, Size, etc.)

tests/                       # Vitest unit and integration tests
├── *.test.ts              # Test files mirror src/ structure
└── example.test.ts        # Reference test with Vitest patterns

public/                      # Static assets
```

### Key Configuration Files

- `next.config.ts` - Next.js configuration (no swcMinify in Next.js 15)
- `tsconfig.json` - TypeScript with path aliases (@/*, @/components/*, etc.)
- `tailwind.config.ts` - Tailwind CSS configuration with theme extensions
- `vitest.config.ts` - Vitest with jsdom environment
- `postcss.config.mjs` - PostCSS with Tailwind and autoprefixer

---

## 🔧 Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (localhost:3000 with hot reload) |
| `npm run build` | Build for production (compiles .next/) |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint with Next.js config |
| `npm test` | Run Vitest suite in watch mode |
| `npm run test:ui` | Run Vitest with UI dashboard |

### Build & Test Workflow

```bash
# Development cycle
npm run dev          # Start dev server, make changes
npm test             # Run tests in watch mode during development

# Before committing
npm run lint         # Check code quality
npm test             # Run full test suite
npm run build        # Verify production build works

# Production deployment
npm run build        # Create .next/ build artifact
npm run start        # Run built app
```

---

## 📝 Code Style & Conventions

### TypeScript

- **Target**: ES2020
- **Module System**: ESNext + ES Modules only (`.ts`/`.tsx` extensions required)
- **Strict Mode**: Enabled (`"strict": true`)
- **JSX**: Preserved for Next.js transformation
- **Path Aliases**: Use `@/` prefix (e.g., `import { Component } from '@/components/Component';`)

### React Components

- **Client vs Server**: Explicitly mark client components with `'use client'`
- **Hooks**: Use React Hooks (useState, useEffect, useRef) for state/side effects
- **Canvas Components**: 
  - Mark with `'use client'`
  - Use `useRef` for canvas element
  - Set dimensions and rendering in `useEffect`
  - Example in `src/components/HelloWorld.tsx`

### Styling

- **Framework**: Tailwind CSS (utility-first)
- **Global Styles**: `src/app/globals.css` (includes Tailwind directives)
- **Color Scheme**: Dark theme (slate-900 background, slate-100 text)
  - Theme colors defined in `tailwind.config.ts`: hexenlabor.primary, secondary, accent
- **Canvas Styling**: Apply Tailwind classes to canvas container, not canvas element

### API Routes

- **Location**: `src/app/api/**/route.ts`
- **Pattern**: Named exports (GET, POST, PUT, DELETE, etc.)
- **Example**:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  
  export async function POST(request: NextRequest) {
    const data = await request.json();
    // Process data
    return NextResponse.json({ success: true });
  }
  ```

### Game Engine Patterns

- **Engine Class**: `src/game/engine.ts` with update/render methods
- **Renderer Interface**: `src/renderers/index.ts` defines Renderer interface
- **Shared Types**: Keep game types in `src/shared/types.ts` for full-stack access

---

## ✅ Testing

- **Framework**: Vitest (configured in `vitest.config.ts`)
- **Environment**: jsdom (for DOM APIs + component testing)
- **Location**: `tests/` directory (mirror structure of `src/`)
- **Patterns**:
  ```typescript
  import { describe, it, expect } from 'vitest';
  
  describe('ComponentName', () => {
    it('should do something', () => {
      expect(value).toBe(expectedValue);
    });
  });
  ```

---

## 🚀 Common Tasks

### Create a New Component

```typescript
// src/components/MyComponent.tsx
'use client';

import { useState } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(null);
  
  return (
    <div className="flex items-center gap-4">
      {/* component JSX */}
    </div>
  );
}
```

### Create a New API Route

```typescript
// src/app/api/game/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Process with iron-session if needed
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
```

### Add a Test

```typescript
// tests/components/MyComponent.test.ts
import { describe, it, expect } from 'vitest';
// import component or function to test

describe('MyComponent', () => {
  it('should render correctly', () => {
    // test implementation
  });
});
```

### Extend Shared Types

```typescript
// src/shared/types.ts
export interface GameState {
  score: number;
  level: number;
  active: boolean;
}

export interface PlayerEntity {
  id: string;
  position: Position;
  health: number;
}
```

---

## ⚠️ Known Issues & Pitfalls

1. **JSX Configuration**: Next.js 15 sets `"jsx": "preserve"` automatically. Don't override.
2. **swcMinify Deprecated**: Removed from `next.config.ts` (built into Next.js 15).
3. **ES Modules Only**: All imports must use extensions (`.ts`/`.tsx`). No `.js` exports.
4. **Canvas Rendering**: Canvas must be rendered in client components (`'use client'`).
5. **Type Imports**: Use explicit imports for types to avoid bundling issues.
6. **Path Aliases**: Work in both code and tests, configured in both `tsconfig.json` and `vitest.config.ts`.

---

## 📦 Dependency Notes

### Critical Dependencies

- **next** (15.x): Framework
- **react**, **react-dom** (19.x): UI library
- **typescript** (5.x): Language
- **tailwindcss** (3.x): Styling
- **iron-session** (8.x): Session management (ready for auth)

### DevDependencies

- **vitest** (1.x): Test runner with jsdom
- **eslint**, **eslint-config-next**: Linting

### When Adding New Packages

- Prefer ES Module packages (check `package.json` `"type": "module"`)
- Run `npm run build` after adding dependencies
- Update docs if adding major functionality

---

## 🔍 AI Agent Guidance

### When Working in This Workspace

1. **Always run tests** after making changes: `npm test`
2. **Use path aliases**: Never use relative imports from root (use `@/*`)
3. **Type everything**: Leverage TypeScript strict mode for safety
4. **Client components**: Always mark components that use hooks/refs with `'use client'`
5. **Canvas management**: Use `useRef` and `useEffect` pattern for Canvas setup
6. **Check build**: Verify `npm run build` succeeds before committing

### Recommended Checks

```bash
# Full verification before committing
npm run lint && npm test && npm run build
```

---

## 🎨 Styling & Theme

- **Primary Color**: `#7c3aed` (hexenlabor.primary)
- **Secondary**: `#a78bfa` (hexenlabor.secondary)
- **Accent**: `#ec4899` (hexenlabor.accent)
- **Background**: Dark mode (`bg-slate-900`)
- **Text**: Light (`text-slate-100`)

Use theme colors in components for consistent branding:
```tsx
<div className="bg-hexenlabor-primary text-hexenlabor-secondary">
  ✨ Magical content
</div>
```

---

## 📚 Next Steps & Future Features

- [ ] Database schema (PostgreSQL) - schema-first approach
- [ ] Multiple Canvas renderers for different game elements
- [ ] Advanced game state management system
- [ ] Type-safe concurrent lock system
- [ ] In-memory caching with persistence
- [ ] Authentication flows with iron-session
- [ ] More comprehensive test coverage

---

## 📖 Quick Reference

| Task | Location | Pattern |
|------|----------|---------|
| Add page | `src/app/[path]/page.tsx` | Export default component |
| Add component | `src/components/Name.tsx` | Use `'use client'` if interactive |
| Add API route | `src/app/api/path/route.ts` | Export POST/GET/etc |
| Add type | `src/shared/types.ts` | Export interface/type |
| Add test | `tests/path.test.ts` | Import from vitest |
| Style | Use Tailwind classes | Apply to JSX elements |
| Canvas setup | Client component + useEffect | See HelloWorld.tsx |

---

Last updated: March 15, 2026
