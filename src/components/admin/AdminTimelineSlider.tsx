"use client";

import { useState, type PointerEvent, type KeyboardEvent } from "react";

interface AdminTimelineSliderProps {
  currentTime: number;
  duration: number;
  loopStartSec: number;
  loopEndSec: number;
  onSeek: (timeSec: number) => void;
}

function formatAudioTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface TimelineKeyParams {
  key: string;
  shiftKey: boolean;
  currentTime: number;
  totalDuration: number;
  loopStartSec: number;
  loopEndSec: number;
}

function computeKeySeekTime(params: TimelineKeyParams): number | null {
  const {
    key,
    shiftKey,
    currentTime,
    totalDuration,
    loopStartSec,
    loopEndSec,
  } = params;
  const step = shiftKey ? 4 : 1;
  if (key === "ArrowLeft") return Math.max(0, currentTime - step);
  if (key === "ArrowRight") return Math.min(totalDuration, currentTime + step);
  if (key === "Home") return loopStartSec;
  if (key === "End") return Math.max(loopStartSec, loopEndSec - 8);
  return null;
}

function getTimeFromClientX(
  rect: DOMRect,
  clientX: number,
  duration: number,
): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * duration;
}

function useTimelineDrag(totalDuration: number, onSeek: (t: number) => void) {
  const [dragTime, setDragTime] = useState<number | null>(null);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragTime(
      getTimeFromClientX(
        e.currentTarget.getBoundingClientRect(),
        e.clientX,
        totalDuration,
      ),
    );
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragTime !== null) {
      setDragTime(
        getTimeFromClientX(
          e.currentTarget.getBoundingClientRect(),
          e.clientX,
          totalDuration,
        ),
      );
    }
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragTime === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const time = getTimeFromClientX(
      e.currentTarget.getBoundingClientRect(),
      e.clientX,
      totalDuration,
    );
    setDragTime(null);
    onSeek(time);
  };

  return { dragTime, onDown, onMove, onUp, onCancel: () => setDragTime(null) };
}

interface MarkerProps {
  loopLeft: number;
  loopWidth: number;
  playheadLeft: number;
  loopStartSec: number;
  loopEndSec: number;
}

function TimelineMarkers({
  loopLeft,
  loopWidth,
  playheadLeft,
  loopStartSec,
  loopEndSec,
}: MarkerProps) {
  return (
    <>
      <div
        data-testid="shaded-loop-window"
        style={{ left: `${loopLeft}%`, width: `${loopWidth}%` }}
        className="absolute top-0 bottom-0 border-r-2 border-primary bg-primary/25"
        title={`Loop window: ${loopStartSec.toFixed(1)}s → ${loopEndSec.toFixed(1)}s`}
      />
      <div
        data-testid="timeline-playhead"
        style={{ left: `${playheadLeft}%` }}
        className="pointer-events-none absolute top-0 bottom-0 w-1 -translate-x-1/2 bg-foreground"
      />
    </>
  );
}

/**
 * Accessible timeline slider displaying shaded Verse → Bridge loop boundaries and playhead.
 * Supports pointer dragging and standard keyboard navigation (arrows, Shift+arrow, Home, End).
 */
export function AdminTimelineSlider({
  currentTime,
  duration,
  loopStartSec,
  loopEndSec,
  onSeek,
}: AdminTimelineSliderProps) {
  const totalDuration = Math.max(duration, 1);
  const drag = useTimelineDrag(totalDuration, onSeek);
  const displayTime = drag.dragTime !== null ? drag.dragTime : currentTime;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const nextTime = computeKeySeekTime({
      key: e.key,
      shiftKey: e.shiftKey,
      currentTime,
      totalDuration,
      loopStartSec,
      loopEndSec,
    });
    if (nextTime !== null) {
      e.preventDefault();
      onSeek(nextTime);
    }
  };

  const loopLeft = Math.max(
    0,
    Math.min(100, (loopStartSec / totalDuration) * 100),
  );
  const loopWidth = Math.max(
    0,
    Math.min(
      100 - loopLeft,
      ((loopEndSec - loopStartSec) / totalDuration) * 100,
    ),
  );
  const playheadLeft = Math.max(
    0,
    Math.min(100, (displayTime / totalDuration) * 100),
  );

  return (
    <div className="flex flex-col gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Beat timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(totalDuration)}
        aria-valuenow={Math.round(displayTime)}
        aria-valuetext={formatAudioTime(displayTime)}
        onPointerDown={drag.onDown}
        onPointerMove={drag.onMove}
        onPointerUp={drag.onUp}
        onPointerCancel={drag.onCancel}
        onKeyDown={handleKeyDown}
        className="relative h-6 w-full cursor-pointer overflow-hidden border border-foreground/30 bg-foreground/10 select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <TimelineMarkers
          loopLeft={loopLeft}
          loopWidth={loopWidth}
          playheadLeft={playheadLeft}
          loopStartSec={loopStartSec}
          loopEndSec={loopEndSec}
        />
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        Shaded: Verse → Bridge loop window. Handover leaves at right edge.
        Click/drag to scrub. Arrow keys nudge 1s (Shift+arrow 4s).
      </p>
    </div>
  );
}
