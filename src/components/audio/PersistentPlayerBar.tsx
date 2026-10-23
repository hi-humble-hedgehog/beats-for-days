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
    cycle,
    orderHash,
    secondsRemaining,
    isLoading,
    error,
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
            className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-mono text-xs tracking-wider text-zinc-400 uppercase">
              Now Playing: {current?.name ?? "Waiting for next beat..."}
            </p>
          </div>
        </div>

        {/* Progress & Countdown */}
        <div className="flex items-center gap-3">
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
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            ⏭ Skip Now
          </button>
        </div>

        {/* Epoch & Seed badges */}
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5">
            Cycle #{cycle}
          </span>
          <span
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5"
            title={`Full seed: ${orderHash}`}
          >
            Seed: {orderHash.slice(0, 10)}
          </span>
        </div>
      </div>
    </aside>
  );
}
