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

function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && Boolean(document.hidden);
}

function useElementSize<T extends HTMLElement>(ref: React.RefObject<T | null>) {
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
  }, [ref]);

  return size;
}

interface GeometryTweenOptions {
  seed: number;
  prevSeed: number;
  setPrevSeed: (seed: number) => void;
  targetGeometry: Geometry;
  currentGeometryRef: React.MutableRefObject<Geometry>;
  setGeometry: (geometry: Geometry) => void;
  tweenRef: React.MutableRefObject<gsap.core.Tween | null>;
}

function useGeometryTween(options: GeometryTweenOptions) {
  const {
    seed,
    prevSeed,
    setPrevSeed,
    targetGeometry,
    currentGeometryRef,
    setGeometry,
    tweenRef,
  } = options;

  useEffect(() => {
    if (
      prevSeed === 0 ||
      prevSeed === seed ||
      isReducedMotionPreferred() ||
      isDocumentHidden()
    ) {
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
        tweenRef.current = null;
        setGeometry(targetGeometry);
        setPrevSeed(seed);
      },
    });

    tweenRef.current = tween;

    return () => {
      tween.kill();
      if (tweenRef.current === tween) {
        tweenRef.current = null;
      }
    };
  }, [
    prevSeed,
    seed,
    targetGeometry,
    currentGeometryRef,
    setGeometry,
    setPrevSeed,
    tweenRef,
  ]);
}

/**
 * Measures the poster wrapper and rebuilds Tonhalle geometry on resize.
 * Smoothly morphs concentric bands with GSAP, snapping immediately when hidden or refocused.
 * Starts at 1280×800 so SSR HTML already has landmarks and the heading.
 * Ignores an empty box: a 0×0 measure makes the first ring radius negative
 * and the vinyl canvas throws on `arc`.
 */
export function usePosterGeometry<T extends HTMLElement>(seed: number) {
  const ref = useRef<T>(null);
  const size = useElementSize(ref);

  const targetGeometry = useMemo(
    () => computeGeometry(size.w, size.h, seed),
    [size, seed],
  );

  const [geometry, setGeometry] = useState<Geometry>(targetGeometry);
  const [prevSeed, setPrevSeed] = useState(seed);
  const [prevSize, setPrevSize] = useState(size);
  const currentGeometryRef = useRef<Geometry>(targetGeometry);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    currentGeometryRef.current = geometry;
  }, [geometry]);

  if (prevSize.w !== size.w || prevSize.h !== size.h) {
    setPrevSize(size);
    setPrevSeed(seed);
    setGeometry(targetGeometry);
  } else if (
    prevSeed !== seed &&
    (prevSeed === 0 || isReducedMotionPreferred() || isDocumentHidden())
  ) {
    setPrevSeed(seed);
    setGeometry(targetGeometry);
  }

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (tweenRef.current) {
          tweenRef.current.kill();
          tweenRef.current = null;
        }
        setGeometry(targetGeometry);
        setPrevSeed(seed);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [seed, targetGeometry]);

  useGeometryTween({
    seed,
    prevSeed,
    setPrevSeed,
    targetGeometry,
    currentGeometryRef,
    setGeometry,
    tweenRef,
  });

  return [ref, geometry] as const;
}
