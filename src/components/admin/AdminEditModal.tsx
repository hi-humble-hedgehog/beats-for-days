"use client";

import { useEffect, useState } from "react";
import type { AdminTrackRecord, UpdateTrackInput } from "@/lib/admin";
import { formatAdminTrackLabel } from "./useTrackSort";

interface AdminEditModalProps {
  track: AdminTrackRecord | null;
  onClose: () => void;
  onSave: (id: string, updates: UpdateTrackInput) => Promise<void>;
}

interface AdminEditFormProps {
  track: AdminTrackRecord;
  onClose: () => void;
  onSave: (id: string, updates: UpdateTrackInput) => Promise<void>;
}

interface EditIdentityProps {
  index: number;
  bpm: number;
  keySig: string;
  genre: string;
  onIndexChange: (v: number) => void;
  onBpmChange: (v: number) => void;
  onKeyChange: (v: string) => void;
  onGenreChange: (v: string) => void;
}

function EditIdentityInputs({
  index,
  bpm,
  keySig,
  genre,
  onIndexChange,
  onBpmChange,
  onKeyChange,
  onGenreChange,
}: EditIdentityProps) {
  const label = String(index).padStart(2, "0");

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-index" className="font-bold text-foreground">
          Track # (Order Index)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="edit-index"
            type="number"
            min="1"
            required
            value={index}
            onChange={(e) => onIndexChange(Math.max(1, Number(e.target.value)))}
            className="min-h-9 w-32 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
          <span className="font-mono text-xs font-bold text-muted-foreground">
            Label / Slug: #{label}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-bpm" className="font-bold text-foreground">
            BPM
          </label>
          <input
            id="edit-bpm"
            type="number"
            min="40"
            max="200"
            required
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-key" className="font-bold text-foreground">
            Key
          </label>
          <input
            id="edit-key"
            type="text"
            required
            value={keySig}
            onChange={(e) => onKeyChange(e.target.value)}
            className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-genre" className="font-bold text-foreground">
          Genre
        </label>
        <input
          id="edit-genre"
          type="text"
          required
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
    </>
  );
}

interface EditTimingProps {
  loopStartMs: number;
  loopEndMs: number;
  onLoopStartChange: (v: number) => void;
  onLoopEndChange: (v: number) => void;
}

function EditTimingInputs({
  loopStartMs,
  loopEndMs,
  onLoopStartChange,
  onLoopEndChange,
}: EditTimingProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-loop-start" className="font-bold text-foreground">
          Loop Start (ms)
        </label>
        <input
          id="edit-loop-start"
          type="number"
          min="0"
          required
          value={loopStartMs}
          onChange={(e) => onLoopStartChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-loop-end" className="font-bold text-foreground">
          Loop End (ms)
        </label>
        <input
          id="edit-loop-end"
          type="number"
          min="0"
          required
          value={loopEndMs}
          onChange={(e) => onLoopEndChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

function AdminEditForm({ track, onClose, onSave }: AdminEditFormProps) {
  const initialIndex =
    track.index ??
    (Number(/^\d+$/.exec(track.name)?.[0]) ||
      Number(/^track-(\d+)$/i.exec(track.id)?.[1]) ||
      1);

  const [index, setIndex] = useState(initialIndex);
  const [bpm, setBpm] = useState(track.bpm);
  const [keySig, setKeySig] = useState(track.key);
  const [genre, setGenre] = useState(track.genre);
  const [loopStartMs, setLoopStartMs] = useState(track.loop_start_ms);
  const [loopEndMs, setLoopEndMs] = useState(track.loop_end_ms);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const paddedLabel = String(index).padStart(2, "0");
      await onSave(track.id, {
        index,
        name: paddedLabel,
        bpm: Number(bpm),
        key: keySig,
        genre,
        loop_start_ms: Number(loopStartMs),
        loop_end_ms: Number(loopEndMs),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="mt-4 flex flex-col gap-4 text-xs uppercase"
    >
      <EditIdentityInputs
        index={index}
        bpm={bpm}
        keySig={keySig}
        genre={genre}
        onIndexChange={setIndex}
        onBpmChange={setBpm}
        onKeyChange={setKeySig}
        onGenreChange={setGenre}
      />
      <EditTimingInputs
        loopStartMs={loopStartMs}
        loopEndMs={loopEndMs}
        onLoopStartChange={setLoopStartMs}
        onLoopEndChange={setLoopEndMs}
      />

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-foreground/20 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 border border-foreground/30 px-4 font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-9 border border-foreground bg-foreground px-5 font-bold text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

/**
 * Accessible modal dialog for editing an existing track's metadata and loop boundaries.
 * Follows WCAG 2.2 AA modal patterns with Escape dismissal and explicit form labels.
 */
export function AdminEditModal({
  track,
  onClose,
  onSave,
}: AdminEditModalProps) {
  /* A11Y-PLAN
     Landmarks: Dialog overlay with role="dialog", aria-modal="true", and aria-labelledby.
     Headings: Modal title tagged as <h2> with matching ID for accessibility tree labeling.
     Controls: Form inputs with linked <label htmlFor>, numeric constraints, Save and Cancel buttons.
     Contrast: High contrast background (sleeve), foreground borders and text (15.3:1 AAA).
  */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && track) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [track, onClose]);

  if (!track) return null;
  const trackLabel = formatAdminTrackLabel(track);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto border-2 border-foreground bg-background p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-foreground/30 pb-3">
          <h2 id="edit-dialog-title" className="text-sm font-bold uppercase">
            Edit Track: #{trackLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit dialog"
            className="inline-flex min-h-6 min-w-6 items-center justify-center text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            ✕
          </button>
        </div>

        <AdminEditForm
          key={track.id}
          track={track}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
