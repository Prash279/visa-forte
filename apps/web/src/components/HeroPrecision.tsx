'use client';
import React, { useEffect, useRef } from 'react';
import {
  CELL_SIZE,
  FLICKER_DURATION,
  RELEASE_DURATION,
  MAX_ACTIVE,
  type LockPoint,
  getReticleOpacity,
  findSpawnPosition,
} from './heroPrecision.utils';

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = 'rgba(248, 244, 238, 0.08)';
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
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.stroke();
}

export default function HeroPrecision(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setCanvasSize(): void {
      const dpr = window.devicePixelRatio ?? 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      // setTransform resets accumulated scale — never use ctx.scale on resize
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let rafId: number;
    let points: LockPoint[] = [];

    function syncPoints(now: number): void {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      // Remove fully expired points
      points = points.filter((p) => {
        const elapsed = now - p.spawnedAt;
        return elapsed < FLICKER_DURATION + p.holdDuration + RELEASE_DURATION;
      });

      // Count points not yet in release phase (stable active count)
      const stable = points.filter((p) => {
        const elapsed = now - p.spawnedAt;
        return elapsed < FLICKER_DURATION + p.holdDuration;
      }).length;

      // Spawn replacements as soon as a point enters release, keeping count at MAX_ACTIVE
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
      // Static grid only — no animation, no RAF
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

  return <canvas ref={canvasRef} className="hero-video" aria-hidden="true" />;
}
