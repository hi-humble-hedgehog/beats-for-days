"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { computeGeometry } from "@/lib/grid/poster-geometry";
import type { Geometry } from "@/lib/grid/poster-model";
import { interpolateGeometry } from "@/lib/grid/poster-transition";

const SSR_VIEWPORT = { w: 1280, h: 800 };

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function isReducedMotionPreferred(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

/**
 * Measures the poster wrapper and rebuilds Tonhalle geometry on resize.
 * Smoothly morphs concentric bands and marker bars with GSAP when the beat seed changes.
 * Starts at 1280×800 so SSR HTML already has landmarks and the heading.
 * Ignores an empty box: a 0×0 measure makes the first ring radius negative
 * and the vinyl canvas throws on `arc`.
 */
export function usePosterGeometry<T extends HTMLElement>(seed: number) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(SSR_VIEWPORT);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      if (next.w <= 0 || next.h <= 0) return;
      setSize((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const targetGeometry = useMemo(
    () => computeGeometry(size.w, size.h, seed),
    [size, seed],
  );

  const [geometry, setGeometry] = useState<Geometry>(targetGeometry);
  const [prevSeed, setPrevSeed] = useState(seed);
  const [prevSize, setPrevSize] = useState(size);
  const currentGeometryRef = useRef<Geometry>(targetGeometry);

  useEffect(() => {
    currentGeometryRef.current = geometry;
  }, [geometry]);

  if (prevSize.w !== size.w || prevSize.h !== size.h) {
    setPrevSize(size);
    setPrevSeed(seed);
    setGeometry(targetGeometry);
  } else if (
    prevSeed !== seed &&
    (prevSeed === 0 || isReducedMotionPreferred())
  ) {
    setPrevSeed(seed);
    setGeometry(targetGeometry);
  }

  useEffect(() => {
    if (prevSeed === 0 || prevSeed === seed || isReducedMotionPreferred()) {
      return;
    }

    const fromGeom = currentGeometryRef.current;
    const tweenTarget = { progress: 0 };
    const tween = gsap.to(tweenTarget, {
      progress: 1,
      duration: 0.7,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => {
        setGeometry(
          interpolateGeometry(fromGeom, targetGeometry, tweenTarget.progress),
        );
      },
      onComplete: () => {
        setGeometry(targetGeometry);
        setPrevSeed(seed);
      },
    });

    return () => {
      tween.kill();
    };
  }, [prevSeed, seed, targetGeometry]);

  return [ref, geometry] as const;
}
