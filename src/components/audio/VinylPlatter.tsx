"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useAudioPlayer } from "./AudioPlayerContext";

/* A11Y-PLAN
 * Landmark: Platter rendered within the active beat audio deck.
 * Heading: Main heading provided by page h1; platter is an accessible action control.
 * Control: Native <button type="button"> with aria-label explaining touch/drag and arrow scratch.
 * Keyboard: ArrowLeft / ArrowDown scratch backward; ArrowRight / ArrowUp scratch forward.
 * Contrast: High-contrast primary orientation needle against dark vinyl card background.
 */

function normalizeAngleDelta(deltaDeg: number): number {
  if (deltaDeg > 180) return deltaDeg - 360;
  if (deltaDeg < -180) return deltaDeg + 360;
  return deltaDeg;
}

function getPointerAngle(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function onArrowScratch(
  key: string,
  setRot: React.Dispatch<React.SetStateAction<number>>,
  start?: () => void,
  setVel?: (v: number, d: number) => void,
): boolean {
  const isBack = key === "ArrowLeft" || key === "ArrowDown";
  const isForward = key === "ArrowRight" || key === "ArrowUp";
  if (!isBack && !isForward) return false;

  setRot((prev) => (prev + (isForward ? 18 : -18)) % 360);
  start?.();
  setVel?.(isForward ? 1.6 : -1.6, 0.05);
  return true;
}

function safePointerCapture(el: HTMLElement, id: number, capture: boolean) {
  try {
    if (capture) el.setPointerCapture?.(id);
    else el.releasePointerCapture?.(id);
  } catch {
    // Ignored
  }
}

function usePlatterAnimation(isPlaying: boolean, isDragging: boolean) {
  const [rotationDeg, setRotationDeg] = useState(0);

  useEffect(() => {
    if (!isPlaying || isDragging) return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;
      setRotationDeg((prev) => (prev + deltaSec * 200) % 360);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDragging]);

  return { rotationDeg, setRotationDeg };
}

function usePlatterDrag() {
  const {
    isPlaying,
    startManualScratch,
    setScratchVelocity,
    stopManualScratch,
  } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const { rotationDeg, setRotationDeg } = usePlatterAnimation(
    isPlaying,
    isDragging,
  );
  const platterRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{ lastAngle: number; lastTime: number; on: boolean }>({
    lastAngle: 0,
    lastTime: 0,
    on: false,
  });

  const getAngle = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!platterRef.current) return 0;
    return getPointerAngle(
      platterRef.current.getBoundingClientRect(),
      e.clientX,
      e.clientY,
    );
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    safePointerCapture(e.currentTarget, e.pointerId, true);
    dragRef.current = {
      lastAngle: getAngle(e),
      lastTime: performance.now(),
      on: true,
    };
    setIsDragging(true);
    startManualScratch?.();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.on) return;
    const now = performance.now();
    const angle = getAngle(e);
    const deltaDeg = normalizeAngleDelta(angle - dragRef.current.lastAngle);
    const deltaSec = Math.max(0.005, (now - dragRef.current.lastTime) / 1000);
    const velocity = deltaDeg / deltaSec / 200;

    dragRef.current = { lastAngle: angle, lastTime: now, on: true };
    setRotationDeg((prev) => (prev + deltaDeg) % 360);
    setScratchVelocity?.(velocity, deltaSec);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.on) return;
    safePointerCapture(e.currentTarget, e.pointerId, false);
    dragRef.current.on = false;
    setIsDragging(false);
    void stopManualScratch?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (
      onArrowScratch(
        e.key,
        setRotationDeg,
        startManualScratch,
        setScratchVelocity,
      )
    ) {
      e.preventDefault();
      setTimeout(() => void stopManualScratch?.(), 90);
    }
  };

  return {
    platterRef,
    rotationDeg,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
  };
}

/**
 * Interactive turntable platter that allows tactile vinyl scratching via mouse, touch, or keys.
 * Visualizes needle angle with a radial line and rotates during active track playback.
 */
export function VinylPlatter() {
  const {
    platterRef,
    rotationDeg,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
  } = usePlatterDrag();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        ref={platterRef}
        type="button"
        aria-label="Interactive vinyl turntable platter. Drag or use arrow keys to scratch"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{ touchAction: "none" }}
        className="relative flex h-52 w-52 cursor-grab items-center justify-center rounded-full border-4 border-foreground/30 bg-card shadow-2xl transition-transform select-none active:cursor-grabbing sm:h-64 sm:w-64"
      >
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-full border border-foreground/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-8 rounded-full border border-foreground/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-14 rounded-full border border-foreground/10"
        />

        <div
          aria-hidden="true"
          className="absolute flex h-20 w-20 items-center justify-center rounded-full border border-primary/50 bg-primary/15 sm:h-24 sm:w-24"
        >
          <div className="h-4 w-4 rounded-full border border-foreground/40 bg-foreground" />
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: `rotate(${rotationDeg}deg)` }}
        >
          <line
            x1="100"
            y1="100"
            x2="192"
            y2="100"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary"
          />
          <circle cx="188" cy="100" r="4" className="fill-primary" />
        </svg>
      </button>

      <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {isDragging
          ? "Scratching live • Release to play"
          : "Drag platter or use arrow keys to scratch"}
      </span>
    </div>
  );
}
