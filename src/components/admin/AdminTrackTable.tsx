"use client";

import type { AdminTrackRecord } from "@/lib/admin";
import {
  formatAdminDate,
  formatAdminTrackLabel,
  type SortDirection,
  type TrackSortField,
  useTrackSort,
} from "./useTrackSort";

interface AdminTrackTableProps {
  tracks: AdminTrackRecord[];
  onToggleActive: (id: string, nextActive: boolean) => void;
  onEdit: (track: AdminTrackRecord) => void;
  onAudition: (track: AdminTrackRecord) => void;
}

interface TrackTableRowProps {
  track: AdminTrackRecord;
  onToggleActive: (id: string, nextActive: boolean) => void;
  onEdit: (track: AdminTrackRecord) => void;
  onAudition: (track: AdminTrackRecord) => void;
}

interface SortableHeaderProps {
  label: string;
  field: TrackSortField;
  activeField: TrackSortField;
  direction: SortDirection;
  onSort: (field: TrackSortField) => void;
}

function SortableHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = activeField === field;
  const sortAria = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th scope="col" aria-sort={sortAria} className="p-3 font-bold">
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}${isActive ? ` (${direction})` : ""}`}
        className="group inline-flex items-center gap-1.5 font-bold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={`text-[10px] transition-colors ${
            isActive
              ? "font-black text-foreground"
              : "text-muted-foreground/60 group-hover:text-muted-foreground"
          }`}
        >
          {isActive ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

interface TrackRowActionsProps {
  trackLabel: string;
  onAudition: () => void;
  onEdit: () => void;
}

function TrackRowActions({
  trackLabel,
  onAudition,
  onEdit,
}: TrackRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Audition Track ${trackLabel}`}
        onClick={onAudition}
        className="min-h-8 border border-primary/60 bg-primary/10 px-2.5 py-1 font-bold text-foreground transition-colors hover:border-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        AUDITION
      </button>
      <button
        type="button"
        aria-label={`Edit Track ${trackLabel}`}
        onClick={onEdit}
        className="min-h-8 border border-foreground/40 px-3 py-1 font-bold text-foreground transition-colors hover:border-foreground hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        EDIT
      </button>
    </div>
  );
}

function TrackTableRow({
  track,
  onToggleActive,
  onEdit,
  onAudition,
}: TrackTableRowProps) {
  const effectiveUpdatedAt = track.updated_at ?? track.created_at;
  const trackLabel = formatAdminTrackLabel(track);

  return (
    <tr
      className={`transition-colors hover:bg-foreground/5 ${
        !track.is_active ? "bg-foreground/[0.02] opacity-60" : ""
      }`}
    >
      <td className="p-3">
        <button
          type="button"
          role="switch"
          aria-checked={track.is_active}
          aria-label={`Toggle Track ${trackLabel} active status`}
          onClick={() => onToggleActive(track.id, !track.is_active)}
          className={`inline-flex min-h-6 min-w-16 items-center justify-center border px-2 py-1 text-[10px] font-bold tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            track.is_active
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground text-muted-foreground"
          }`}
        >
          {track.is_active ? "ACTIVE" : "OFF"}
        </button>
      </td>
      <td className="p-3 font-mono">
        <div className="text-sm font-bold text-foreground">#{trackLabel}</div>
        <div className="text-[10px] text-muted-foreground">
          Index: {track.index ?? trackLabel}
        </div>
      </td>
      <td className="p-3">
        <div className="text-foreground">{track.bpm} BPM</div>
        <div className="text-[10px] text-muted-foreground">
          {track.key} • {track.genre}
        </div>
      </td>
      <td className="p-3 font-mono text-[11px] text-foreground">
        {(track.loop_start_ms / 1000).toFixed(2)}s -{" "}
        {(track.loop_end_ms / 1000).toFixed(2)}s
        <div className="font-sans text-[10px] text-muted-foreground">
          Total: {(track.duration_ms / 1000).toFixed(1)}s
        </div>
      </td>
      <td className="p-3 font-mono text-[11px] text-foreground">
        <time dateTime={track.created_at}>
          {formatAdminDate(track.created_at)}
        </time>
      </td>
      <td className="p-3 font-mono text-[11px] text-foreground">
        <time dateTime={effectiveUpdatedAt}>
          {formatAdminDate(effectiveUpdatedAt)}
        </time>
      </td>
      <td className="p-3">
        <TrackRowActions
          trackLabel={trackLabel}
          onAudition={() => onAudition(track)}
          onEdit={() => onEdit(track)}
        />
      </td>
    </tr>
  );
}

interface TrackTableHeadProps {
  sortField: TrackSortField;
  sortDirection: SortDirection;
  onSort: (field: TrackSortField) => void;
}

function TrackTableHead({
  sortField,
  sortDirection,
  onSort,
}: TrackTableHeadProps) {
  return (
    <thead className="border-b border-foreground/30 bg-foreground/5 text-muted-foreground">
      <tr>
        <SortableHeader
          label="Status"
          field="status"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <SortableHeader
          label="Track #"
          field="track"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <SortableHeader
          label="BPM / Key"
          field="bpm"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <SortableHeader
          label="Loop / Dur"
          field="loop"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <SortableHeader
          label="Created At"
          field="created_at"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <SortableHeader
          label="Updated At"
          field="updated_at"
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
        />
        <th scope="col" className="p-3 font-bold">
          Actions
        </th>
      </tr>
    </thead>
  );
}

/**
 * Editorial catalog table displaying tracks, BPM, key, loop points, and active switches.
 * Follows WCAG 2.2 AA with full keyboard navigation, accessible sort states, and timestamps.
 */
export function AdminTrackTable({
  tracks,
  onToggleActive,
  onEdit,
  onAudition,
}: AdminTrackTableProps) {
  /* A11Y-PLAN
     Landmarks: Table container wrapped in role="region" with accessible label for horizontal overflow scrolling.
     Headings: Column headers marked with scope="col" in standard <thead>, with aria-sort reflecting current sort direction.
     Controls: Column sort headers use native accessible <button>, status switches use native <button role="switch">.
     Contrast: Foreground text (15.3:1 AAA), muted metadata (4.7:1 AA), active badge (high contrast border and text).
  */

  const { sortedTracks, sortField, sortDirection, handleSort } =
    useTrackSort(tracks);

  if (tracks.length === 0) {
    return (
      <p className="border border-foreground/20 p-6 text-sm text-muted-foreground uppercase">
        No tracks found in the catalog.
      </p>
    );
  }

  return (
    <div
      role="region"
      aria-label="Audio Tracks Table"
      tabIndex={0}
      className="overflow-x-auto border border-foreground/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <table className="w-full border-collapse text-left text-xs uppercase">
        <caption className="sr-only">Catalog audio tracks list</caption>
        <TrackTableHead
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        <tbody className="divide-y divide-foreground/20">
          {sortedTracks.map((track) => (
            <TrackTableRow
              key={track.id}
              track={track}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onAudition={onAudition}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
