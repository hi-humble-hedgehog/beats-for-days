"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";

function DebugDetails({
  currentBeatLabel,
  pathname,
  historyState,
  historyLength,
  phase,
  secondsRemaining,
  positionSec,
  historyList,
}: {
  currentBeatLabel: string;
  pathname: string;
  historyState: string;
  historyLength: number;
  phase?: string;
  secondsRemaining: number;
  positionSec?: number;
  historyList: string[];
}) {
  const formattedHistory =
    historyList.length > 0 ? historyList.join(" → ") : "(empty)";

  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="font-bold text-muted-foreground">Active Beat: </span>
        <span className="text-foreground">{currentBeatLabel}</span>
      </div>

      <div>
        <span className="font-bold text-muted-foreground">Route: </span>
        <span className="text-foreground">{pathname}</span>
      </div>

      <div>
        <span className="font-bold text-muted-foreground">History State: </span>
        <code className="break-all text-primary">{historyState}</code>
      </div>

      <div>
        <span className="font-bold text-muted-foreground">
          History Stack Length:{" "}
        </span>
        <span className="text-foreground">{historyLength}</span>
      </div>

      <div>
        <span className="font-bold text-muted-foreground">Engine Phase: </span>
        <span className="text-foreground">
          {phase ?? "idle"} ({secondsRemaining}s remaining, pos:{" "}
          {Math.round(positionSec ?? 0)}s)
        </span>
      </div>

      <div className="border-t border-border pt-2">
        <span className="font-bold text-muted-foreground">
          Played History ({historyList.length}):
        </span>
        <p className="mt-1 break-words text-foreground">{formattedHistory}</p>
      </div>
    </div>
  );
}

function DebugContent({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  const {
    current,
    activePathname,
    phase,
    secondsRemaining,
    positionSec,
    playedHistory,
  } = useAudioPlayer();

  const historyState =
    typeof window !== "undefined"
      ? JSON.stringify(window.history.state ?? null)
      : "null";

  const historyLength =
    typeof window !== "undefined" ? window.history.length : 0;

  const currentBeatLabel = current ? `${current.name} (${current.id})` : "None";

  const historyList = playedHistory ?? [];

  return (
    <div
      id="history-debug-panel"
      role="region"
      aria-label="Playback and history state"
      className="fixed right-4 bottom-24 z-50 flex max-h-[80vh] w-80 flex-col gap-3 overflow-y-auto border border-border bg-background/95 p-4 font-mono text-xs shadow-2xl backdrop-blur sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="font-bold tracking-wider text-foreground uppercase">
          History State Debug
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close debug panel"
          className="border border-border px-2 py-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <DebugDetails
        currentBeatLabel={currentBeatLabel}
        pathname={activePathname ?? pathname}
        historyState={historyState}
        historyLength={historyLength}
        phase={phase}
        secondsRemaining={secondsRemaining}
        positionSec={positionSec}
        historyList={historyList}
      />
    </div>
  );
}

/**
 * Floating debug panel displaying real-time browser history and played tracks state.
 * Allows verifying history stack transitions and track synchronization during navigation.
 */
export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="history-debug-panel"
        aria-label="Toggle history debug panel"
        className="fixed right-4 bottom-14 z-50 border border-border bg-background/90 px-3 py-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase shadow backdrop-blur transition hover:bg-muted hover:text-foreground"
      >
        {isOpen ? "Hide Debug" : "History Debug"}
      </button>

      {isOpen ? (
        <DebugContent pathname={pathname} onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
}
