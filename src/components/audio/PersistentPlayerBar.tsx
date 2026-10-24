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
          ? "fixed inset-x-0 bottom-0 z-50 border-t border-red-900 bg-zinc-950 px-6 py-4 text-red-400"
          : "fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-6 py-4 text-zinc-400 backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p className={isError ? "text-sm" : "animate-pulse text-sm"}>
          {message}
        </p>
      </div>
    </aside>
  );
}

export function PersistentPlayerBar() {
  const {
    current,
    isPlaying,
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-6 py-4 shadow-2xl backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        {/* Track Title */}
        <div className="flex items-center gap-3">
          <span
            className={
              isPlaying
                ? "flex h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                : "flex h-3 w-3 rounded-full bg-zinc-600"
            }
            aria-hidden="true"
          />
          <div>
            <p
              aria-live="polite"
              className="font-mono text-xs tracking-wider text-zinc-300 uppercase"
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
            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-300">
            <span>Next in {secondsRemaining}s</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - secondsRemaining) / 5) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={advanceTrack}
            aria-label="Skip to next track"
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-zinc-400"
          >
            ⏭ Skip
          </button>
        </div>
      </div>
    </aside>
  );
}
