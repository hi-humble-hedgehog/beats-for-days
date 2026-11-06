"use client";

import type { AdminTrackRecord, AdminTransitionView } from "@/lib/admin";

interface TransitionItemProps {
  badge: string;
  transition: AdminTransitionView;
  isActive: boolean;
  isPlaying: boolean;
  targetTrack?: AdminTrackRecord;
  onTestTransition: (
    transition: AdminTransitionView,
    mode: "blend" | "bridge",
  ) => void;
  onSelectTrack?: (track: AdminTrackRecord) => void;
  direction: "out" | "in";
}

function TransitionItem({
  badge,
  transition,
  isActive,
  isPlaying,
  targetTrack,
  onTestTransition,
  onSelectTrack,
  direction,
}: TransitionItemProps) {
  const isCurrentPlaying = isActive && isPlaying;
  const glueSec = (transition.timing.glueMs / 1000).toFixed(1);
  const targetLabel =
    direction === "out" ? transition.to_label : transition.from_label;

  return (
    <div
      className={`flex flex-col gap-2 border p-2.5 font-mono text-xs transition-colors ${
        isActive
          ? "border-primary bg-primary/10 shadow-xs"
          : "border-foreground/20 bg-foreground/5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{badge}</span>
          {targetTrack && (
            <span className="text-[11px] text-foreground/80">
              {targetTrack.bpm} BPM · {targetTrack.key}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          glue: {glueSec}s · {transition.timing.crossfadeMs}ms
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
        {onSelectTrack && targetTrack && direction === "in" && (
          <button
            type="button"
            onClick={() => onSelectTrack(targetTrack)}
            aria-label={`Audition track #${targetLabel}`}
            className="min-h-7 border border-foreground/30 px-2 text-[10px] font-bold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            VIEW #{targetLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => onTestTransition(transition, "bridge")}
          aria-label={`Audition bridge only to #${targetLabel}`}
          className="min-h-7 border border-foreground/40 px-2 font-bold text-foreground transition-colors hover:border-foreground hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          BRIDGE
        </button>

        <button
          type="button"
          onClick={() => onTestTransition(transition, "blend")}
          aria-label={`Test blend transition to #${targetLabel}`}
          className="min-h-7 border border-primary bg-primary/20 px-2.5 font-bold text-foreground transition-colors hover:bg-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {isCurrentPlaying ? "PAUSE" : "PLAY BLEND"}
        </button>
      </div>
    </div>
  );
}

interface TransitionsColumnsProps {
  outTransitions: AdminTransitionView[];
  inTransitions: AdminTransitionView[];
  activeClipId: string | null;
  isPlaying: boolean;
  allTracks?: AdminTrackRecord[];
  onPlay?: (transition: AdminTransitionView) => void;
  onTestTransition?: (
    transition: AdminTransitionView,
    mode: "blend" | "bridge",
  ) => void;
  onSelectTrack?: (track: AdminTrackRecord) => void;
}

/**
 * Renders incoming and outgoing transitions with rich audition controls.
 * Supports both full blend transitions with surrounding tracks and isolated bridge testing.
 */
export function TransitionsColumns({
  outTransitions,
  inTransitions,
  activeClipId,
  isPlaying,
  allTracks = [],
  onPlay,
  onTestTransition,
  onSelectTrack,
}: TransitionsColumnsProps) {
  const handleTest = onTestTransition ?? ((t, _mode) => onPlay?.(t));

  const trackMap = new Map<string, AdminTrackRecord>();
  for (const track of allTracks) {
    trackMap.set(track.id, track);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Outgoing Transitions ({outTransitions.length})
        </h3>
        <div className="flex flex-col gap-2">
          {outTransitions.map((t) => (
            <TransitionItem
              key={t.id}
              badge={`-> #${t.to_label}`}
              transition={t}
              isActive={activeClipId === t.id}
              isPlaying={isPlaying}
              targetTrack={trackMap.get(t.to_track_id)}
              onTestTransition={handleTest}
              direction="out"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Incoming Transitions ({inTransitions.length})
        </h3>
        <div className="flex flex-col gap-2">
          {inTransitions.map((t) => (
            <TransitionItem
              key={t.id}
              badge={`#${t.from_label} ->`}
              transition={t}
              isActive={activeClipId === t.id}
              isPlaying={isPlaying}
              targetTrack={trackMap.get(t.from_track_id)}
              onTestTransition={handleTest}
              onSelectTrack={onSelectTrack}
              direction="in"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
