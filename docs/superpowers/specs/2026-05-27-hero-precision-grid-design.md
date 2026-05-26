# Hero Precision Grid — Design Spec
**Date:** 2026-05-27
**Scope:** Hero section background animation, home page only
**Replaces:** `HeroVideo` component + `hero-bg.mp4`

---

## Summary

Replace the video background on the homepage hero with a pure Canvas animation: a faint
engineering calibration grid with slowly appearing/releasing Saffron lock-point reticles.
No video file, no autoplay policy issues, no large asset. Pure React + Canvas.

---

## Component

**File:** `apps/web/src/components/HeroPrecision.tsx`
**Type:** `'use client'` React component
**Renders:** Single `<canvas>` element with class `hero-video` (reuses existing absolute
positioning CSS — no changes to `home.css`)

---

## Visual Specification

### Grid
| Parameter | Value |
|---|---|
| Cell size | 48 × 48 px |
| Line color | Pearl `#F8F4EE` at 3% opacity |
| Line width | 0.5 px |
| Coverage | Full canvas + 48px bleed on all edges (prevents gap on resize) |
| Redraw trigger | Mount + `ResizeObserver` only — never per frame |

### Lock Points
| Parameter | Value |
|---|---|
| Shape | Surveying reticle — 4 arms, 6px inward + 6px outward from centre (12px arm) |
| Color | Saffron `#E8A020` |
| Active count | 5 points at all times |
| Snap rule | Always on a grid intersection — never floating mid-cell |
| Spawn exclusion zone | Centre 30% of canvas width (headline area); minimum 3 grid cells from any active point |

### Lock Point Lifecycle
| Phase | Duration | Behaviour |
|---|---|---|
| Flicker | 0.4 s | Opacity snaps on/off 3 times rapidly — signal acquiring |
| Hold | 6–9 s (randomised per point) | Solid at 85% opacity |
| Release | 0.8 s | Smooth fade to 0 |

A new point spawns the moment an old one enters its release phase, keeping the active
count stable at 5.

---

## Animation Loop

One canvas element. Each frame:

```
requestAnimationFrame loop:
  1. clearRect — full canvas
  2. Draw grid (fast — ~200 line primitives, <0.1ms)
  3. For each active lock point: compute opacity from lifecycle state + elapsed time
  4. Draw reticle at computed opacity
  5. Schedule next frame
```

Grid is redrawn each frame alongside the points. At ~200 line primitives this is
negligible — simpler and more correct than dirty-region tracking.

### Canvas Resolution

On mount and resize: `canvas.width = offsetWidth * devicePixelRatio`,
`canvas.height = offsetHeight * devicePixelRatio`, then `ctx.scale(dpr, dpr)`.
This keeps lines sharp on retina displays.

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* handled in component — RAF loop never starts, grid drawn statically */
}
```

Inside the component: check `window.matchMedia('(prefers-reduced-motion: reduce)')` on
mount. If true: draw grid once, return. No RAF, no lock points, no event listeners beyond
the ResizeObserver.

---

## Performance Budget

| Operation | Frequency | Cost |
|---|---|---|
| Grid draw | On mount + resize only | ~1ms, negligible |
| RAF tick | 60 fps | 5 small `clearRect` + 5 reticle draws — <0.1ms |
| ResizeObserver | On window resize | Grid redraw only |
| Memory | — | Canvas 2D context + array of 5 point objects |

No image assets. No video decoding. No network requests.

---

## File Changes

| File | Action |
|---|---|
| `apps/web/src/components/HeroPrecision.tsx` | **Create** |
| `apps/web/src/app/page.tsx` | **Edit** — swap import + JSX tag |
| `apps/web/src/components/HeroVideo.tsx` | **Delete** |
| `apps/web/public/videos/hero-bg.mp4` | **Delete** |
| `apps/web/next.config.ts` | **Edit** — remove `media-src 'self'` (video-only CSP directive) |
| `apps/web/src/app/home.css` | **No change** — `.hero-video` class reused as-is |

All other files: untouched.

---

## Acceptance Criteria

1. On desktop: faint grid visible as background texture behind hero content
2. 5 Saffron reticles alive at all times, cycling through flicker → hold → release
3. No reticle spawns over the headline text (centre exclusion zone respected)
4. On `prefers-reduced-motion`: static grid only, no animation
5. No layout shift, no flash — canvas fills hero section flush on mount
6. Build passes TypeScript strict mode
7. `media-src 'self'` removed from CSP (video no longer served)
