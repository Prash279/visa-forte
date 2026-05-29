export const CELL_SIZE = 48;
export const FLICKER_DURATION = 400;
export const RELEASE_DURATION = 800;
export const HOLD_OPACITY = 0.85;
const FLICKER_CYCLES = 3;
export const MAX_ACTIVE = 5;
const EXCLUSION_CENTER_FRACTION = 0.30;
export const MIN_CELL_DISTANCE = 3;

export interface LockPoint {
  x: number;
  y: number;
  spawnedAt: number;
  holdDuration: number;
}

export function getReticleOpacity(point: LockPoint, now: number): number {
  const elapsed = now - point.spawnedAt;
  const totalDuration = FLICKER_DURATION + point.holdDuration + RELEASE_DURATION;
  if (elapsed >= totalDuration) return 0;
  if (elapsed < FLICKER_DURATION) {
    const segmentDuration = FLICKER_DURATION / (FLICKER_CYCLES * 2);
    const segment = Math.floor(elapsed / segmentDuration);
    return segment % 2 === 0 ? HOLD_OPACITY : 0;
  }
  if (elapsed < FLICKER_DURATION + point.holdDuration) {
    return HOLD_OPACITY;
  }
  const releaseElapsed = elapsed - FLICKER_DURATION - point.holdDuration;
  return HOLD_OPACITY * (1 - releaseElapsed / RELEASE_DURATION);
}

export function findSpawnPosition(
  active: LockPoint[],
  canvasWidth: number,
  canvasHeight: number,
  cellSize: number,
): { x: number; y: number } | null {
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
