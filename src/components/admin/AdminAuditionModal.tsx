"use client";

import { useEffect } from "react";
import type { AdminTrackRecord } from "@/lib/admin";
import { TransitionsColumns } from "./AdminAuditionTransitions";
import { formatAdminTrackLabel } from "./useTrackSort";
import { useTrackAudition } from "./useTrackAudition";

interface AdminAuditionModalProps {
  track: AdminTrackRecord | null;
  onClose: () => void;
}

function formatAudioTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface BeatPlayerProps {
  track: AdminTrackRecord;
  isPlaying: boolean;
  activeClipId: string | null;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  onPlayBeat: () => void;
  onToggleLoop: () => void;
  onSeek: (sec: number) => void;
}

function BeatPlayer({
  track,
  isPlaying,
  activeClipId,
  currentTime,
  duration,
  isLooping,
  onPlayBeat,
  onToggleLoop,
  onSeek,
}: BeatPlayerProps) {
  const isBeatPlaying = activeClipId === "beat" && isPlaying;
  const loopStart = (track.loop_start_ms / 1000).toFixed(2);
  const loopEnd = (track.loop_end_ms / 1000).toFixed(2);
  const loopDur = (track.loop_duration_ms / 1000).toFixed(2);

  return (
    <div className="flex flex-col gap-3 border border-foreground/30 bg-foreground/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPlayBeat}
          aria-label={isBeatPlaying ? "Pause beat" : "Play beat"}
          className="min-h-9 border border-primary bg-primary/20 px-4 font-bold text-foreground transition-colors hover:bg-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {isBeatPlaying ? "PAUSE BEAT" : "PLAY BEAT"}
        </button>
        <button
          type="button"
          onClick={onToggleLoop}
          aria-pressed={isLooping}
          className={`min-h-9 border px-3 font-mono text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            isLooping
              ? "border-primary bg-primary text-background"
              : "border-foreground/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          LOOP PREVIEW: {isLooping ? "ON" : "OFF"}
        </button>
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Beat playback position"
        className="w-full accent-primary"
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>
          Loop: {loopStart}s → {loopEnd}s
        </span>
        <span>Duration: {loopDur}s</span>
        <span>BPM: {track.bpm}</span>
        <span>Key: {track.key}</span>
      </div>
    </div>
  );
}

interface AuditionHeaderProps {
  trackLabel: string;
  genre: string;
  bpm: number;
  keySig: string;
  onClose: () => void;
}

function AuditionHeader({
  trackLabel,
  genre,
  bpm,
  keySig,
  onClose,
}: AuditionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-foreground/30 pb-3">
      <div className="flex items-baseline gap-2">
        <h2 id="audition-dialog-title" className="text-sm font-bold uppercase">
          Audition Beat: #{trackLabel}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {genre} · {bpm} BPM · {keySig}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close audition dialog"
        className="inline-flex min-h-6 min-w-6 items-center justify-center text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        ✕
      </button>
    </div>
  );
}

const EMPTY_TRACK: AdminTrackRecord = {
  id: "",
  name: "",
  bpm: 90,
  key: "",
  genre: "",
  duration_ms: 0,
  loop_start_ms: 0,
  loop_end_ms: 0,
  loop_duration_ms: 0,
  audio_path: "",
  is_active: false,
};

/**
 * Accessible modal dialog for auditioning a beat and its 16 connected transitions.
 * Allows loop playback testing and listening to both incoming and outgoing transition clips.
 */
export function AdminAuditionModal({
  track,
  onClose,
}: AdminAuditionModalProps) {
  /* A11Y-PLAN
     Landmarks: Dialog container with role="dialog", aria-modal="true", and aria-labelledby.
     Keyboard: Escape key dismisses modal and releases all audio playback.
     Controls: Semantic buttons with accessible labels for playing beat and transitions.
     Contrast: High contrast text on background sleeve meeting WCAG AAA.
  */
  const audition = useTrackAudition(track ?? EMPTY_TRACK);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && track) {
        audition.stop();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [track, onClose, audition]);

  if (!track) return null;
  const trackLabel = formatAdminTrackLabel(track);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audition-dialog-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto border-2 border-foreground bg-background p-6 shadow-2xl"
      >
        <AuditionHeader
          trackLabel={trackLabel}
          genre={track.genre}
          bpm={track.bpm}
          keySig={track.key}
          onClose={() => {
            audition.stop();
            onClose();
          }}
        />

        <BeatPlayer
          track={track}
          isPlaying={audition.isPlaying}
          activeClipId={audition.activeClipId}
          currentTime={audition.currentTime}
          duration={audition.duration}
          isLooping={audition.isLooping}
          onPlayBeat={audition.playBeat}
          onToggleLoop={audition.toggleLoop}
          onSeek={audition.seek}
        />

        {audition.isLoading && (
          <p className="font-mono text-xs text-muted-foreground">
            Loading connected transitions...
          </p>
        )}

        {audition.error && (
          <p className="font-mono text-xs text-destructive">{audition.error}</p>
        )}

        <TransitionsColumns
          outTransitions={audition.outTransitions}
          inTransitions={audition.inTransitions}
          activeClipId={audition.activeClipId}
          isPlaying={audition.isPlaying}
          onPlay={audition.playTransition}
        />
      </div>
    </div>
  );
}
