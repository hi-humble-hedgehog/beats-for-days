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
      className={`gap-2 p-2.5 font-mono text-xs flex flex-col border transition-colors ${
        isActive
          ? "border-primary bg-primary/10 shadow-xs"
          : "border-foreground/20 bg-foreground/5"
      }`}
    >
      <div className="gap-1 flex flex-wrap items-center justify-between">
        <div className="gap-2 flex items-center">
          <span className="font-bold text-foreground">{badge}</span>
          {targetTrack && (
            <span className="text-foreground/80 text-[11px]">
              {targetTrack.bpm} BPM · {targetTrack.key}
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-[11px]">
          glue: {glueSec}s · {transition.timing.crossfadeMs}ms
        </span>
      </div>

      <div className="gap-1.5 pt-1 flex flex-wrap items-center justify-end">
        {onSelectTrack && targetTrack && direction === "in" && (
          <button
            type="button"
            onClick={() => onSelectTrack(targetTrack)}
            aria-label={`Audition track #${targetLabel}`}
            className="min-h-7 border-foreground/30 px-2 font-bold text-muted-foreground hover:border-foreground hover:text-foreground focus-visible:ring-primary border text-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            VIEW #{targetLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => onTestTransition(transition, "bridge")}
          aria-label={`Audition bridge only to #${targetLabel}`}
          className="min-h-7 border-foreground/40 px-2 font-bold text-foreground hover:border-foreground hover:bg-foreground/10 focus-visible:ring-primary border transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          BRIDGE
        </button>

        <button
          type="button"
          onClick={() => onTestTransition(transition, "blend")}
          aria-label={`Test blend transition to #${targetLabel}`}
          className="min-h-7 border-primary bg-primary/20 px-2.5 font-bold text-foreground hover:bg-primary/30 focus-visible:ring-primary border transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
    <div className="gap-4 md:grid-cols-2 grid grid-cols-1">
      <div className="gap-2 flex flex-col">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Outgoing Transitions ({outTransitions.length})
        </h3>
        <div className="gap-2 flex flex-col">
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

      <div className="gap-2 flex flex-col">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Incoming Transitions ({inTransitions.length})
        </h3>
        <div className="gap-2 flex flex-col">
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
