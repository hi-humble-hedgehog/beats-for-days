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

function formatTime(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ProgressBarProps {
  positionSec: number;
  durationSec: number;
}

function ProgressBar({ positionSec, durationSec }: ProgressBarProps) {
  const percent =
    durationSec > 0
      ? Math.min(100, Math.max(0, (positionSec / durationSec) * 100))
      : 0;

  return (
    <div
      role="progressbar"
      aria-label="Playback progress"
      aria-valuenow={Math.round(positionSec)}
      aria-valuemin={0}
      aria-valuemax={Math.round(durationSec)}
      aria-valuetext={`${formatTime(positionSec)} of ${formatTime(durationSec)}`}
      className="absolute inset-x-0 top-0 h-1 bg-muted"
    >
      <div
        className="h-full bg-primary transition-[width] duration-75"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function TrackInfo({ isPlaying, name }: { isPlaying: boolean; name?: string }) {
  const indicatorColor = isPlaying ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-2.5 w-2.5 ${indicatorColor}`}
        aria-hidden="true"
      />
      <div>
        <p
          aria-live="polite"
          className="text-xs font-bold tracking-widest text-foreground uppercase"
        >
          Now Playing: {name ?? "Waiting for next beat..."}
        </p>
      </div>
    </div>
  );
}

interface PlayControlsProps {
  isPlaying: boolean;
  phase?: string;
  secondsRemaining: number;
  positionSec: number;
  durationSec: number;
  onTogglePlay: () => void;
  onAdvanceTrack: () => void;
}

function PlayControls(props: PlayControlsProps) {
  const {
    isPlaying,
    phase,
    secondsRemaining,
    positionSec,
    durationSec,
    onTogglePlay,
    onAdvanceTrack,
  } = props;

  return (
    <div className="flex items-center gap-3">
      <span
        aria-label="Playback position"
        className="font-mono text-xs text-muted-foreground tabular-nums"
      >
        {formatTime(positionSec)} / {formatTime(durationSec)}
      </span>

      <button
        type="button"
        onClick={onTogglePlay}
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
        onClick={onAdvanceTrack}
        aria-label="Skip to next track"
        className="border border-border bg-transparent px-3 py-1.5 text-xs font-bold tracking-wider text-foreground uppercase transition hover:bg-foreground hover:text-background"
      >
        ⏭ Skip
      </button>
    </div>
  );
}

export function PersistentPlayerBar() {
  const {
    current,
    isPlaying,
    phase,
    secondsRemaining,
    positionSec = 0,
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

  const durationSec = (current?.durationMs ?? 0) / 1000;

  return (
    <aside
      aria-label="Persistent Audio Player"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-6 py-4 shadow-lg backdrop-blur"
    >
      <ProgressBar positionSec={positionSec} durationSec={durationSec} />
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <TrackInfo isPlaying={isPlaying} name={current?.name} />
        <PlayControls
          isPlaying={isPlaying}
          phase={phase}
          secondsRemaining={secondsRemaining}
          positionSec={positionSec}
          durationSec={durationSec}
          onTogglePlay={togglePlay}
          onAdvanceTrack={advanceTrack}
        />
      </div>
    </aside>
  );
}
