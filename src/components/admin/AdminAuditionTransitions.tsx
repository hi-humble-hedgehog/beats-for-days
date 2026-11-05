"use client";

import type { AdminTransitionView } from "@/lib/admin";

interface TransitionItemProps {
  badge: string;
  transition: AdminTransitionView;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (transition: AdminTransitionView) => void;
}

function TransitionItem({
  badge,
  transition,
  isActive,
  isPlaying,
  onPlay,
}: TransitionItemProps) {
  const isCurrentPlaying = isActive && isPlaying;
  const glueSec = (transition.timing.glueMs / 1000).toFixed(1);

  return (
    <div className="border-foreground/20 bg-foreground/5 p-2 font-mono text-xs flex items-center justify-between border">
      <div className="gap-2 flex items-center">
        <span className="font-bold text-foreground">{badge}</span>
        <span className="text-muted-foreground text-[11px]">
          glue: {glueSec}s · {transition.timing.crossfadeMs}ms
        </span>
      </div>
      <button
        type="button"
        onClick={() => onPlay(transition)}
        aria-label={`${isCurrentPlaying ? "Pause" : "Play"} transition ${badge}`}
        className="min-h-7 border-foreground/40 px-2 font-bold text-foreground hover:border-foreground hover:bg-foreground/10 focus-visible:ring-primary border transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {isCurrentPlaying ? "PAUSE" : "PLAY"}
      </button>
    </div>
  );
}

interface TransitionsColumnsProps {
  outTransitions: AdminTransitionView[];
  inTransitions: AdminTransitionView[];
  activeClipId: string | null;
  isPlaying: boolean;
  onPlay: (transition: AdminTransitionView) => void;
}

/**
 * Renders two columns displaying incoming and outgoing connected transitions.
 * Provides audition buttons and timing metadata for each transition path.
 */
export function TransitionsColumns({
  outTransitions,
  inTransitions,
  activeClipId,
  isPlaying,
  onPlay,
}: TransitionsColumnsProps) {
  return (
    <div className="gap-4 md:grid-cols-2 grid grid-cols-1">
      <div className="gap-2 flex flex-col">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Outgoing Transitions ({outTransitions.length})
        </h3>
        <div className="gap-1.5 flex flex-col">
          {outTransitions.map((t) => (
            <TransitionItem
              key={t.id}
              badge={`-> #${t.to_label}`}
              transition={t}
              isActive={activeClipId === t.id}
              isPlaying={isPlaying}
              onPlay={onPlay}
            />
          ))}
        </div>
      </div>

      <div className="gap-2 flex flex-col">
        <h3 className="font-mono text-xs font-bold text-foreground uppercase">
          Incoming Transitions ({inTransitions.length})
        </h3>
        <div className="gap-1.5 flex flex-col">
          {inTransitions.map((t) => (
            <TransitionItem
              key={t.id}
              badge={`#${t.from_label} ->`}
              transition={t}
              isActive={activeClipId === t.id}
              isPlaying={isPlaying}
              onPlay={onPlay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
