"use client";

import { useEffect } from "react";
import type { AdminTrackRecord } from "@/lib/admin";
import {
  AuditionToolbar,
  BeatPlayer,
  DeckStatusCard,
} from "./AdminAuditionPlayer";
import { TransitionsColumns } from "./AdminAuditionTransitions";
import { formatAdminTrackLabel } from "./useTrackSort";
import { useTrackAudition } from "./useTrackAudition";

interface AdminAuditionModalProps {
  track: AdminTrackRecord | null;
  allTracks?: AdminTrackRecord[];
  onClose: () => void;
  onSelectTrack?: (track: AdminTrackRecord) => void;
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

function useEscapeModal(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

function AuditionFeedback({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        Loading connected transitions...
      </p>
    );
  }
  if (error) {
    return <p className="font-mono text-xs text-destructive">{error}</p>;
  }
  return null;
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
 * Accessible modal dialog for auditioning a beat and testing seamless transitions into other songs.
 * Mimics the Frankenstein Transition Lab with interactive loop scrub timeline, blend tests, and bridge previews.
 */
export function AdminAuditionModal({
  track,
  allTracks = [],
  onClose,
  onSelectTrack,
}: AdminAuditionModalProps) {
  /* A11Y-PLAN
     Landmarks: Dialog container with role="dialog", aria-modal="true", and aria-labelledby.
     Keyboard: Escape key dismisses modal; slider navigation via Arrow keys, Home, and End.
     Live status: Deck status card annotated with aria-live="polite" for seamless vocal transitions.
     Contrast: Foreground on background meet WCAG AAA contrast ratio.
  */
  const audition = useTrackAudition(track ?? EMPTY_TRACK, allTracks);

  useEscapeModal(Boolean(track), () => {
    audition.stop();
    onClose();
  });

  if (!track) return null;
  const trackLabel = formatAdminTrackLabel(audition.currentTrack);

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
          genre={audition.currentTrack.genre}
          bpm={audition.currentTrack.bpm}
          keySig={audition.currentTrack.key}
          onClose={() => {
            audition.stop();
            onClose();
          }}
        />

        <DeckStatusCard
          phase={audition.phase}
          trackLabel={trackLabel}
          pass={audition.pass}
          currentTime={audition.currentTime}
          duration={audition.duration}
          bridgeDurationSec={audition.bridgeDurationSec}
          bridgeElapsedSec={audition.bridgeElapsedSec}
        />

        <AuditionToolbar
          autoMix={audition.autoMix}
          onAutoMixChange={audition.setAutoMix}
          startNearHandover={audition.startNearHandover}
          onStartNearHandoverChange={audition.setStartNearHandover}
        />

        <BeatPlayer
          track={audition.currentTrack}
          isPlaying={audition.isPlaying}
          activeClipId={audition.activeClipId}
          currentTime={audition.currentTime}
          duration={audition.duration}
          isLooping={audition.isLooping}
          hasOutTransitions={audition.outTransitions.length > 0}
          onPlayBeat={audition.playBeat}
          onToggleLoop={audition.toggleLoop}
          onJumpBeforeExit={() => audition.jumpBeforeExit(8)}
          onMixAtNextExit={audition.mixAtNextExit}
          onSeek={audition.seek}
        />

        <AuditionFeedback
          isLoading={audition.isLoading}
          error={audition.error}
        />

        <TransitionsColumns
          outTransitions={audition.outTransitions}
          inTransitions={audition.inTransitions}
          activeClipId={audition.activeClipId}
          isPlaying={audition.isPlaying}
          allTracks={allTracks}
          onTestTransition={audition.testTransition}
          onSelectTrack={onSelectTrack}
        />
      </div>
    </div>
  );
}
