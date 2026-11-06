"use client";

import { type ChangeEvent } from "react";
import type { AdminTrackRecord } from "@/lib/admin";
import { AdminTimelineSlider } from "./AdminTimelineSlider";
import type { AutoMixSetting } from "./useTrackAudition";

function formatAudioTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface DeckStatusCardProps {
  phase: "idle" | "playing" | "armed" | "bridge";
  trackLabel: string;
  pass: number;
  currentTime: number;
  duration: number;
  bridgeDurationSec: number;
  bridgeElapsedSec: number;
}

const PHASE_STYLES = {
  idle: "border-foreground/30 bg-foreground/5 text-muted-foreground",
  playing: "border-primary bg-primary/20 text-foreground",
  armed: "border-amber-500 bg-amber-500/20 text-foreground",
  bridge: "border-amber-600 bg-amber-600/30 text-foreground",
};

/** Renders live playback phase, pass counter, and radio bridge progress bar. */
export function DeckStatusCard({
  phase,
  trackLabel,
  pass,
  currentTime,
  duration,
  bridgeDurationSec,
  bridgeElapsedSec,
}: DeckStatusCardProps) {
  const phaseLabel =
    phase === "idle"
      ? "STOPPED"
      : phase === "playing"
        ? `LOOPING (PASS ${pass + 1})`
        : phase === "armed"
          ? "HANDOVER ARMED"
          : "FRANKENSTEIN BRIDGE";

  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-2 border border-foreground/30 bg-foreground/5 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${PHASE_STYLES[phase]}`}
          >
            {phaseLabel}
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            #{trackLabel}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </span>
      </div>

      {phase === "bridge" && bridgeDurationSec > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>Radio transition speech & chops</span>
            <span>
              {bridgeElapsedSec.toFixed(1)}s / {bridgeDurationSec.toFixed(1)}s
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden bg-foreground/20">
            <div
              style={{
                width: `${Math.min(100, (bridgeElapsedSec / bridgeDurationSec) * 100)}%`,
              }}
              className="h-full bg-primary transition-all duration-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditionToolbarProps {
  autoMix: AutoMixSetting;
  onAutoMixChange: (val: AutoMixSetting) => void;
  startNearHandover: boolean;
  onStartNearHandoverChange: (val: boolean) => void;
}

/** Controls auto-mix pass thresholds and 8-second lead-in handover preview. */
export function AuditionToolbar({
  autoMix,
  onAutoMixChange,
  startNearHandover,
  onStartNearHandoverChange,
}: AuditionToolbarProps) {
  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    onAutoMixChange(v === "off" ? "off" : (Number(v) as 1 | 2 | 4));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/20 pb-3 font-mono text-xs">
      <label className="flex cursor-pointer items-center gap-2 font-bold text-foreground">
        <input
          type="checkbox"
          checked={startNearHandover}
          onChange={(e) => onStartNearHandoverChange(e.target.checked)}
          className="accent-primary"
        />
        <span>Start 8s before exit on test</span>
      </label>

      <div className="flex items-center gap-2">
        <label htmlFor="automix-select" className="text-muted-foreground">
          Auto-mix:
        </label>
        <select
          id="automix-select"
          value={String(autoMix)}
          onChange={handleSelect}
          className="border border-foreground/30 bg-background px-2 py-1 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <option value="off">Off (mix manually)</option>
          <option value="1">After 1 loop pass</option>
          <option value="2">After 2 loop passes</option>
          <option value="4">After 4 loop passes</option>
        </select>
      </div>
    </div>
  );
}

interface BeatPlayerProps {
  track: AdminTrackRecord;
  isPlaying: boolean;
  activeClipId: string | null;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  hasOutTransitions: boolean;
  onPlayBeat: () => void;
  onToggleLoop: () => void;
  onJumpBeforeExit: () => void;
  onMixAtNextExit: () => void;
  onSeek: (sec: number) => void;
}

/** Renders transport controls, jump-to-exit shortcut, loop toggles, and loop timeline. */
export function BeatPlayer({
  track,
  isPlaying,
  activeClipId,
  currentTime,
  duration,
  isLooping,
  hasOutTransitions,
  onPlayBeat,
  onToggleLoop,
  onJumpBeforeExit,
  onMixAtNextExit,
  onSeek,
}: BeatPlayerProps) {
  const isBeatPlaying = activeClipId === "beat" && isPlaying;
  const loopStart = (track.loop_start_ms / 1000).toFixed(2);
  const loopEnd = (track.loop_end_ms / 1000).toFixed(2);
  const loopDur = (track.loop_duration_ms / 1000).toFixed(2);

  return (
    <div className="flex flex-col gap-3 border border-foreground/30 bg-foreground/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={onJumpBeforeExit}
            aria-label="Jump 8s before exit"
            className="min-h-9 border border-foreground/40 px-3 font-mono text-xs font-bold text-foreground transition-colors hover:border-foreground hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            JUMP 8s BEFORE EXIT
          </button>
          {hasOutTransitions && (
            <button
              type="button"
              onClick={onMixAtNextExit}
              aria-label="Mix at next loop end"
              className="min-h-9 border border-foreground/40 px-3 font-mono text-xs font-bold text-foreground transition-colors hover:border-foreground hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              MIX AT NEXT EXIT
            </button>
          )}
        </div>

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
      </div>

      <AdminTimelineSlider
        currentTime={currentTime}
        duration={duration}
        loopStartSec={track.loop_start_ms / 1000}
        loopEndSec={track.loop_end_ms / 1000}
        onSeek={onSeek}
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
