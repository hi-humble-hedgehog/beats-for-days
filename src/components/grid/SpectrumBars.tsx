"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  markerEdgeInset,
  markerRadii,
  markerTilts,
} from "@/lib/grid/canvas-draw";
import { visibleSpans, type Geometry } from "@/lib/grid/poster-geometry";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const MARKER_GROUP_SIZE = 2;

function readCssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function fillMarkerGroups(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  radii: NonNullable<ReturnType<typeof markerRadii>>,
  dpr: number,
): void {
  const tilts = markerTilts(radii);
  ctx.fillStyle = readCssColor("--stamp", "#d62718");
  const cx = geometry.px * dpr;
  const cy = geometry.py * dpr;
  for (
    let index = 0;
    index < geometry.bars.length;
    index += MARKER_GROUP_SIZE
  ) {
    const from = geometry.bars[index]?.from;
    const to =
      geometry.bars[
        Math.min(index + MARKER_GROUP_SIZE - 1, geometry.bars.length - 1)
      ]?.to;
    if (from === undefined || to === undefined) continue;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radii.outer,
      -(from + tilts.tiltOuter),
      -(to - tilts.tiltOuter),
      true,
    );
    ctx.arc(
      cx,
      cy,
      radii.inner,
      -(to - tilts.tiltInner),
      -(from + tilts.tiltInner),
      false,
    );
    ctx.closePath();
    ctx.fill();
  }
}

function clipToFirstBand(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  dpr: number,
): boolean {
  const firstBand = geometry.bands[0];
  if (!firstBand || geometry.bars.length === 0) return false;
  const cx = geometry.px * dpr;
  const cy = geometry.py * dpr;
  const base = geometry.barBase * dpr;
  const edgeInset = markerEdgeInset(geometry.bars);
  ctx.beginPath();
  let drew = false;
  for (const [a, b] of visibleSpans(
    firstBand.from,
    firstBand.to,
    firstBand.cut,
  )) {
    const insetFrom = a + edgeInset;
    const insetTo = b - edgeInset;
    if (insetTo <= insetFrom) continue;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, base + dpr, -insetFrom, -insetTo, true);
    ctx.closePath();
    drew = true;
  }
  if (drew) ctx.clip();
  return drew;
}

function paintMarkers(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const radii = markerRadii(geometry.barBase * dpr, dpr);
  if (!radii) return;
  ctx.save();
  if (!clipToFirstBand(ctx, geometry, dpr)) {
    ctx.restore();
    return;
  }
  fillMarkerGroups(ctx, geometry, radii, dpr);
  ctx.restore();
}

export interface SpectrumBarsProps {
  geometry: Geometry;
}

/**
 * Resting stamp-red markers inside the first ring's visible span.
 * Decorative only; transport and the beat number announce playback state.
 */
export function SpectrumBars({ geometry }: SpectrumBarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const draw = () => paintMarkers(canvas, ctx, geometry);
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();

    return () => observer.disconnect();
  }, [geometry]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      aria-hidden="true"
    />
  );
}
