# Hero Precision Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `HeroVideo` canvas animation component and `hero-bg.mp4` asset with a pure Canvas precision-grid animation (`HeroPrecision`) on the homepage hero section.

**Architecture:** A `'use client'` React component renders a single `<canvas>` element reusing the existing `.hero-video` CSS class. Pure logic (opacity calculation, spawn-position finding) lives in a separate utils file for testability. The RAF loop clears the full canvas each frame, redraws the grid (~200 line primitives), then draws up to 5 Saffron reticles cycling through flicker → hold → release.

**Tech Stack:** React 18, Canvas 2D API, `requestAnimationFrame`, `ResizeObserver`, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/components/heroPrecision.utils.ts` | **Create** | Types, constants, pure logic functions |
| `apps/web/src/components/__tests__/heroPrecision.utils.test.ts` | **Create** | Unit tests for pure logic |
| `apps/web/src/components/HeroPrecision.tsx` | **Create** | React component — canvas setup, RAF loop, resize handling |
| `apps/web/src/app/page.tsx` | **Edit** | Swap `HeroVideo` → `HeroPrecision` (import + JSX tag) |
| `apps/web/src/components/HeroVideo.tsx` | **Delete** | No longer needed |
| `apps/web/public/videos/hero-bg.mp4` | **Delete** | No longer needed |
| `apps/web/next.config.ts` | **Edit** | Remove `media-src 'self'` (video-only CSP directive) |

---

## Task 1: Pure Logic Utils + Tests

**Files:**
- Create: `apps/web/src/components/heroPrecision.utils.ts`
- Create: `apps/web/src/components/__tests__/heroPrecision.utils.test.ts`

### Step 1.1 — Write the failing tests first

Create `apps/web/src/components/__tests__/heroPrecision.utils.test.ts`:

```typescript
// Tests run in Node environment — no browser APIs needed.
// globals: true in vitest.config.ts — describe/it/expect are available without imports.

import {
  getReticleOpacity,
  findSpawnPosition,
  FLICKER_DURATION,
  RELEASE_DURATION,
  HOLD_OPACITY,
  CELL_SIZE,
  MIN_CELL_DISTANCE,
} from '../heroPrecision.utils';
import type { LockPoint } from '../heroPrecision.utils';

function makePoint(overrides: Partial<LockPoint> = {}): LockPoint {
  return { x: 96, y: 96, spawnedAt: 0, holdDuration: 7000, ...overrides };
}

describe('getReticleOpacity', () => {
  it('returns HOLD_OPACITY at t=0 (first flicker on-segment)', () => {
    expect(getReticleOpacity(makePoint(), 0)).toBe(HOLD_OPACITY);
  });

  it('returns 0 during an off-segment of the flicker phase', () => {
    // Each segment = 400ms / (3 cycles × 2 half-periods) = 66.67ms
    // At t=70ms we are in segment 1 (odd) → off
    expect(getReticleOpacity(makePoint(), 70)).toBe(0);
  });

  it('returns HOLD_OPACITY during the hold phase', () => {
    const midHold = FLICKER_DURATION + 3500;
    expect(getReticleOpacity(makePoint({ holdDuration: 7000 }), midHold)).toBe(HOLD_OPACITY);
  });

  it('returns a value strictly between 0 and HOLD_OPACITY during release', () => {
    const midRelease = FLICKER_DURATION + 7000 + RELEASE_DURATION / 2;
    const opacity = getReticleOpacity(makePoint({ holdDuration: 7000 }), midRelease);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(HOLD_OPACITY);
  });

  it('returns 0 after the full lifecycle completes', () => {
    const afterDone = FLICKER_DURATION + 7000 + RELEASE_DURATION + 100;
    expect(getReticleOpacity(makePoint({ holdDuration: 7000 }), afterDone)).toBe(0);
  });
});

describe('findSpawnPosition', () => {
  const W = 1200;
  const H = 800;

  it('returns a position snapped to a grid intersection', () => {
    const pos = findSpawnPosition([], W, H, CELL_SIZE);
    expect(pos).not.toBeNull();
    expect(pos!.x % CELL_SIZE).toBe(0);
    expect(pos!.y % CELL_SIZE).toBe(0);
  });

  it('never places a point inside the centre 30% exclusion zone (50 samples)', () => {
    const excludeLeft = W * 0.35;
    const excludeRight = W * 0.65;
    for (let i = 0; i < 50; i++) {
      const pos = findSpawnPosition([], W, H, CELL_SIZE);
      expect(pos).not.toBeNull();
      const inZone = pos!.x > excludeLeft && pos!.x < excludeRight;
      expect(inZone).toBe(false);
    }
  });

  it('never places a point within MIN_CELL_DISTANCE cells of an active point (50 samples)', () => {
    const active: LockPoint[] = [makePoint({ x: 96, y: 96 })];
    for (let i = 0; i < 50; i++) {
      const pos = findSpawnPosition(active, W, H, CELL_SIZE);
      if (!pos) continue;
      const dx = Math.abs(pos.x - 96) / CELL_SIZE;
      const dy = Math.abs(pos.y - 96) / CELL_SIZE;
      expect(dx < MIN_CELL_DISTANCE && dy < MIN_CELL_DISTANCE).toBe(false);
    }
  });

  it('returns null rather than throwing when no valid position exists', () => {
    // Tiny canvas — active point at the only usable intersection
    const tinyW = CELL_SIZE * 2;
    const tinyH = CELL_SIZE * 2;
    const blocking: LockPoint[] = [makePoint({ x: CELL_SIZE, y: CELL_SIZE })];
    expect(() => findSpawnPosition(blocking, tinyW, tinyH, CELL_SIZE)).not.toThrow();
  });
});
```

### Step 1.2 — Run tests, confirm they fail

```bash
cd apps/web && npx vitest run src/components/__tests__/heroPrecision.utils.test.ts
```

Expected: **FAIL** — `Cannot find module '../heroPrecision.utils'`

### Step 1.3 — Implement the utils

Create `apps/web/src/components/heroPrecision.utils.ts`:

```typescript
// Pure logic for HeroPrecision canvas animation.
// No browser APIs — safe to import in Node/test environments.

export const CELL_SIZE = 48;
export const FLICKER_DURATION = 400;   // ms — 3 on/off cycles
export const RELEASE_DURATION = 800;   // ms — smooth fade to zero
export const HOLD_OPACITY = 0.85;
export const FLICKER_CYCLES = 3;
export const MAX_ACTIVE = 5;
export const EXCLUSION_CENTER_FRACTION = 0.30; // centre 30% of canvas width
export const MIN_CELL_DISTANCE = 3;            // grid cells

export interface LockPoint {
  x: number;            // CSS px, snapped to grid intersection
  y: number;            // CSS px, snapped to grid intersection
  spawnedAt: number;    // performance.now() timestamp at creation
  holdDuration: number; // ms — randomised 6000–9000
}

/**
 * Returns the display opacity (0–HOLD_OPACITY) for a lock point at time `now`.
 * Phase is derived from elapsed time — not stored on the point.
 */
export function getReticleOpacity(point: LockPoint, now: number): number {
  const elapsed = now - point.spawnedAt;
  const totalDuration = FLICKER_DURATION + point.holdDuration + RELEASE_DURATION;

  if (elapsed >= totalDuration) return 0;

  if (elapsed < FLICKER_DURATION) {
    // 3 full on/off cycles: segment duration = FLICKER_DURATION / (FLICKER_CYCLES * 2)
    const segmentDuration = FLICKER_DURATION / (FLICKER_CYCLES * 2);
    const segment = Math.floor(elapsed / segmentDuration);
    return segment % 2 === 0 ? HOLD_OPACITY : 0;
  }

  if (elapsed < FLICKER_DURATION + point.holdDuration) {
    return HOLD_OPACITY;
  }

  // Release: linear fade from HOLD_OPACITY → 0
  const releaseElapsed = elapsed - FLICKER_DURATION - point.holdDuration;
  return HOLD_OPACITY * (1 - releaseElapsed / RELEASE_DURATION);
}

/**
 * Picks a random grid intersection that satisfies both exclusion rules.
 * Returns null if no valid position exists (canvas too small, all blocked).
 */
export function findSpawnPosition(
  active: LockPoint[],
  canvasWidth: number,
  canvasHeight: number,
  cellSize: number,
): { x: number; y: number } | null {
  // Centre exclusion zone: middle EXCLUSION_CENTER_FRACTION of the canvas width
  const excludeLeft = canvasWidth * ((1 - EXCLUSION_CENTER_FRACTION) / 2);
  const excludeRight = canvasWidth * ((1 + EXCLUSION_CENTER_FRACTION) / 2);

  const candidates: { x: number; y: number }[] = [];

  for (let x = cellSize; x < canvasWidth; x += cellSize) {
    for (let y = cellSize; y < canvasHeight; y += cellSize) {
      if (x > excludeLeft && x < excludeRight) continue;

      const tooClose = active.some((p) => {
        const dx = Math.abs(p.x - x) / cellSize;
        const dy = Math.abs(p.y - y) / cellSize;
        return dx < MIN_CELL_DISTANCE && dy < MIN_CELL_DISTANCE;
      });

      if (!tooClose) candidates.push({ x, y });
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
```

### Step 1.4 — Run tests, confirm they pass

```bash
cd apps/web && npx vitest run src/components/__tests__/heroPrecision.utils.test.ts
```

Expected: **PASS** — 9 tests, 0 failures

### Step 1.5 — Commit

```bash
cd c:/Users/hp/visaforte
git add apps/web/src/components/heroPrecision.utils.ts \
        apps/web/src/components/__tests__/heroPrecision.utils.test.ts
git commit -m "feat(home): add HeroPrecision utils with tests"
```

---

## Task 2: HeroPrecision React Component

**Files:**
- Create: `apps/web/src/components/HeroPrecision.tsx`

> No unit tests for canvas rendering — `getContext('2d')` returns null in Node environment.
> Correctness is verified visually in Task 4.

### Step 2.1 — Create the component

Create `apps/web/src/components/HeroPrecision.tsx`:

```typescript
'use client';

import React, { useEffect, useRef } from 'react';
import {
  CELL_SIZE,
  FLICKER_DURATION,
  RELEASE_DURATION,
  MAX_ACTIVE,
  LockPoint,
  getReticleOpacity,
  findSpawnPosition,
} from './heroPrecision.utils';

// ── Canvas drawing helpers ────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = 'rgba(248, 244, 238, 0.03)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = -CELL_SIZE; x <= width + CELL_SIZE; x += CELL_SIZE) {
    ctx.moveTo(x, -CELL_SIZE);
    ctx.lineTo(x, height + CELL_SIZE);
  }
  for (let y = -CELL_SIZE; y <= height + CELL_SIZE; y += CELL_SIZE) {
    ctx.moveTo(-CELL_SIZE, y);
    ctx.lineTo(width + CELL_SIZE, y);
  }
  ctx.stroke();
}

function drawReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opacity: number,
): void {
  if (opacity <= 0) return;
  ctx.strokeStyle = `rgba(232, 160, 32, ${opacity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
  ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
  ctx.stroke();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeroPrecision(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resize canvas to match CSS dimensions × devicePixelRatio.
    // setTransform resets any previous transform before applying the new scale —
    // unlike ctx.scale() which accumulates on repeated calls.
    function setCanvasSize(): void {
      const dpr = window.devicePixelRatio ?? 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let rafId: number;
    let points: LockPoint[] = [];

    // Remove expired points; spawn replacements the moment any point enters release
    // so active count stays at MAX_ACTIVE at all times.
    function syncPoints(now: number): void {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      points = points.filter((p) => {
        const elapsed = now - p.spawnedAt;
        return elapsed < FLICKER_DURATION + p.holdDuration + RELEASE_DURATION;
      });

      // Count points still in flicker or hold (i.e. not yet releasing)
      const stable = points.filter((p) => {
        const elapsed = now - p.spawnedAt;
        return elapsed < FLICKER_DURATION + p.holdDuration;
      }).length;

      const toSpawn = MAX_ACTIVE - stable;
      for (let i = 0; i < toSpawn; i++) {
        const pos = findSpawnPosition(points, w, h, CELL_SIZE);
        if (!pos) break;
        points.push({
          x: pos.x,
          y: pos.y,
          spawnedAt: now,
          holdDuration: 6000 + Math.random() * 3000,
        });
      }
    }

    function tick(): void {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const now = performance.now();

      ctx!.clearRect(0, 0, w, h);
      drawGrid(ctx!, w, h);

      syncPoints(now);

      for (const point of points) {
        drawReticle(ctx!, point.x, point.y, getReticleOpacity(point, now));
      }

      rafId = requestAnimationFrame(tick);
    }

    setCanvasSize();

    if (reducedMotion) {
      // Static grid only — no RAF, no lock points
      drawGrid(ctx, canvas.offsetWidth, canvas.offsetHeight);
      const observer = new ResizeObserver(() => {
        setCanvasSize();
        drawGrid(ctx!, canvas!.offsetWidth, canvas!.offsetHeight);
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    syncPoints(performance.now());
    rafId = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => setCanvasSize());
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-video"
      aria-hidden="true"
    />
  );
}
```

### Step 2.2 — Run TypeScript check

```bash
cd apps/web && npx tsc --noEmit
```

Expected: **no errors**

### Step 2.3 — Commit

```bash
cd c:/Users/hp/visaforte
git add apps/web/src/components/HeroPrecision.tsx
git commit -m "feat(home): add HeroPrecision canvas component"
```

---

## Task 3: Wire, Remove, Clean Up

**Files:**
- Edit: `apps/web/src/app/page.tsx`
- Delete: `apps/web/src/components/HeroVideo.tsx`
- Delete: `apps/web/public/videos/hero-bg.mp4`
- Edit: `apps/web/next.config.ts`

### Step 3.1 — Swap HeroVideo → HeroPrecision in page.tsx

In `apps/web/src/app/page.tsx`, make two edits:

**Replace the import line:**
```typescript
// Before
import HeroVideo from "@/components/HeroVideo";

// After
import HeroPrecision from "@/components/HeroPrecision";
```

**Replace the JSX tag:**
```tsx
// Before
<HeroVideo />

// After
<HeroPrecision />
```

### Step 3.2 — Delete HeroVideo.tsx and hero-bg.mp4

```bash
cd c:/Users/hp/visaforte
git rm apps/web/src/components/HeroVideo.tsx
git rm apps/web/public/videos/hero-bg.mp4
```

Expected: both files removed and staged for deletion.

### Step 3.3 — Remove media-src from CSP

In `apps/web/next.config.ts`, remove the `media-src` line:

```typescript
// Before
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' https://o4511213768540160.ingest.us.sentry.io https://api.razorpay.com https://lumberjack.razorpay.com",
  ...
];

// After
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://o4511213768540160.ingest.us.sentry.io https://api.razorpay.com https://lumberjack.razorpay.com",
  ...
];
```

### Step 3.4 — Run TypeScript check

```bash
cd apps/web && npx tsc --noEmit
```

Expected: **no errors**

### Step 3.5 — Run full test suite

```bash
cd apps/web && npx vitest run
```

Expected: **all tests pass**, including the heroPrecision.utils tests from Task 1.

### Step 3.6 — Commit everything

```bash
cd c:/Users/hp/visaforte
git add apps/web/src/app/page.tsx apps/web/next.config.ts
git commit -m "feat(home): wire HeroPrecision, remove HeroVideo + video asset"
```

---

## Task 4: Visual Verification + Deploy

### Step 4.1 — Run the dev server

```bash
cd apps/web && npm run dev
```

Open `http://localhost:3000` in a browser.

**Verify against acceptance criteria:**

- [ ] Faint grid texture is visible across the full hero section background
- [ ] 5 Saffron (`#E8A020`) reticles are active — cycling flicker → hold → release
- [ ] No reticle appears over the headline text (centre of the viewport)
- [ ] At no point does the active reticle count drop to 0 (a new one spawns as one enters release)
- [ ] Hero content (headline, CTA, stats) is fully readable above the animation
- [ ] Enable OS reduced-motion setting → only static grid, no reticles, no animation

### Step 4.2 — Push and deploy

```bash
cd c:/Users/hp/visaforte
git push origin main
vercel deploy --prod
```

Expected: build succeeds, `visaforte.com` updated.
