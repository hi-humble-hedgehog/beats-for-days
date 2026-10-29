"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { renderVinylFrame, type VinylPalette } from "@/lib/grid/canvas-draw";
import type { Geometry } from "@/lib/grid/poster-geometry";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readCssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function readVinylColors(
  ref: React.RefObject<VinylPalette | null>,
): VinylPalette {
  ref.current ??= {
    ink: readCssColor("--vinyl", "#141414"),
    stamp: readCssColor("--stamp", "#d62718"),
    sleeve: readCssColor("--sleeve", "#eceae4"),
  };
  return ref.current;
}

function paintVinyl(
  canvas: HTMLCanvasElement,
  geometry: Geometry,
  colors: VinylPalette,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderVinylFrame(canvas, ctx, { geometry, colors, dpr });
}

export interface VinylVisualizerProps {
  geometry: Geometry;
}

/**
 * Concentric vinyl rings, stamp-red accent gutter, and centre spindle.
 * Pure decoration; the poster heading and transport carry the semantics.
 */
export function VinylVisualizer({ geometry }: VinylVisualizerProps) {
  const colorsRef = useRef<VinylPalette | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      paintVinyl(canvas, geometry, readVinylColors(colorsRef));
    };

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
