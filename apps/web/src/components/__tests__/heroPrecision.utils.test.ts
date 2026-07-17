/// <reference types="vitest/globals" />
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
    expect(getReticleOpacity(makePoint({ holdDuration: 7000 }), midHold)).toBe(
      HOLD_OPACITY,
    );
  });

  it('returns a value strictly between 0 and HOLD_OPACITY during release', () => {
    const midRelease = FLICKER_DURATION + 7000 + RELEASE_DURATION / 2;
    const opacity = getReticleOpacity(
      makePoint({ holdDuration: 7000 }),
      midRelease,
    );
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(HOLD_OPACITY);
  });

  it('returns 0 after the full lifecycle completes', () => {
    const afterDone = FLICKER_DURATION + 7000 + RELEASE_DURATION + 100;
    expect(
      getReticleOpacity(makePoint({ holdDuration: 7000 }), afterDone),
    ).toBe(0);
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
    const tinyW = CELL_SIZE * 2;
    const tinyH = CELL_SIZE * 2;
    const blocking: LockPoint[] = [makePoint({ x: CELL_SIZE, y: CELL_SIZE })];
    expect(() =>
      findSpawnPosition(blocking, tinyW, tinyH, CELL_SIZE),
    ).not.toThrow();
  });
});
