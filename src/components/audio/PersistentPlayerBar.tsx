"use client";

import { useAudioPlayer } from "./AudioPlayerContext";

function PlayerStatusBanner({
  message,
  isError = false,
}: {
  message: string;
  isError?: boolean;
}) {
  return (
    <aside
      aria-label="Persistent Audio Player"
      className={
        isError
          ? "fixed inset-x-0 bottom-0 z-50 border-t border-destructive bg-background px-6 py-4 text-destructive"
          : "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-6 py-4 text-muted-foreground backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p
          className={
            isError
              ? "text-xs font-bold tracking-widest uppercase"
              : "animate-pulse text-xs font-bold tracking-widest uppercase"
          }
        >
          {message}
        </p>
      </div>
    </aside>
  );
}

function formatCountdownLabel(
  phase: string | undefined,
  secondsRemaining: number,
): string {
  if (phase === "bridge") {
    return `Transitioning (${secondsRemaining}s)`;
  }
  if (phase === "armed") {
    return `Transition in ${secondsRemaining}s`;
  }
  return `Next in ${secondsRemaining}s`;
}

export function PersistentPlayerBar() {
  const {
    current,
    isPlaying,
    phase,
    secondsRemaining,
    isLoading,
    error,
    togglePlay,
    advanceTrack,
  } = useAudioPlayer();

  if (isLoading) {
    return <PlayerStatusBanner message="Loading beat catalog..." />;
  }

  if (error) {
    return <PlayerStatusBanner message={`Player error: ${error}`} isError />;
  }

  return (
    <aside
      aria-label="Persistent Audio Player"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-6 py-4 shadow-lg backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        {/* Track Title */}
        <div className="flex items-center gap-3">
          <span
            className={
              isPlaying
                ? "flex h-2.5 w-2.5 bg-primary"
                : "flex h-2.5 w-2.5 bg-muted-foreground"
            }
            aria-hidden="true"
          />
          <div>
            <p
              aria-live="polite"
              className="text-xs font-bold tracking-widest text-foreground uppercase"
            >
              Now Playing: {current?.name ?? "Waiting for next beat..."}
            </p>
          </div>
        </div>

        {/* Play/Pause & Skip Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            className="bg-primary px-3 py-1.5 text-xs font-bold tracking-wider text-primary-foreground uppercase transition hover:opacity-90"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <div className="flex items-center gap-2 border border-border bg-card px-3 py-1 text-xs font-bold tracking-widest text-foreground uppercase tabular-nums">
            <span aria-live="polite">
              {formatCountdownLabel(phase, secondsRemaining)}
            </span>
          </div>

          <button
            type="button"
            onClick={advanceTrack}
            aria-label="Skip to next track"
            className="border border-border bg-transparent px-3 py-1.5 text-xs font-bold tracking-wider text-foreground uppercase transition hover:bg-foreground hover:text-background"
          >
            ⏭ Skip
          </button>
        </div>
      </div>
    </aside>
  );
}
