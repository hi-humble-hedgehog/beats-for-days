"use client";

import { useMemo, useState } from "react";
import type { AdminTrackRecord } from "@/lib/admin";

export type TrackSortField =
  "status" | "track" | "name" | "bpm" | "loop" | "created_at" | "updated_at";

export type SortDirection = "asc" | "desc";

/**
 * Formats a track record into a 2-digit track label (e.g. "01", "02").
 */
export function formatAdminTrackLabel(
  track: Pick<AdminTrackRecord, "id" | "name" | "index">,
): string {
  if (track.index !== undefined && track.index !== null && track.index > 0) {
    return String(track.index).padStart(2, "0");
  }
  const match = /^(\d+)$/.exec(track.name) ?? /^track-(\d+)$/i.exec(track.id);
  if (match && match[1]) {
    return String(Number(match[1])).padStart(2, "0");
  }
  return track.name;
}

/**
 * Derives a numeric ordering value for a track from index or identifier.
 */
export function getTrackSortNumber(
  track: Pick<AdminTrackRecord, "id" | "name" | "index">,
): number {
  if (track.index !== undefined && track.index !== null && track.index > 0) {
    return track.index;
  }
  const match = /^(\d+)$/.exec(track.name) ?? /^track-(\d+)$/i.exec(track.id);
  if (match && match[1]) {
    return Number(match[1]);
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Formats an ISO date string to a deterministic UTC format (YYYY-MM-DD HH:mm).
 * Returns an em-dash if date is missing or invalid to avoid hydration mismatches.
 */
export function formatAdminDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return "—";
  }
}

function compareByDate(dateA?: string, dateB?: string): number {
  const timeA = dateA ? new Date(dateA).getTime() : 0;
  const timeB = dateB ? new Date(dateB).getTime() : 0;
  return timeA - timeB;
}

function compareTrackOrder(a: AdminTrackRecord, b: AdminTrackRecord): number {
  const numA = getTrackSortNumber(a);
  const numB = getTrackSortNumber(b);
  return numA !== numB ? numA - numB : a.name.localeCompare(b.name);
}

function compareTrackDates(
  a: AdminTrackRecord,
  b: AdminTrackRecord,
  field: "created_at" | "updated_at",
): number {
  if (field === "created_at") {
    return compareByDate(a.created_at, b.created_at);
  }
  return compareByDate(
    a.updated_at ?? a.created_at,
    b.updated_at ?? b.created_at,
  );
}

function compareTracks(
  a: AdminTrackRecord,
  b: AdminTrackRecord,
  field: TrackSortField,
): number {
  switch (field) {
    case "status":
      return Number(b.is_active) - Number(a.is_active);
    case "track":
      return compareTrackOrder(a, b);
    case "name":
      return a.name.localeCompare(b.name);
    case "bpm":
      return a.bpm - b.bpm;
    case "loop":
      return a.loop_duration_ms - b.loop_duration_ms;
    case "created_at":
    case "updated_at":
      return compareTrackDates(a, b, field);
  }
}

/**
 * Pure sorting function for catalog tracks across all available table columns.
 */
export function sortTracks(
  tracks: AdminTrackRecord[],
  field: TrackSortField,
  direction: SortDirection,
): AdminTrackRecord[] {
  return [...tracks].sort((a, b) => {
    const diff = compareTracks(a, b, field);
    return direction === "asc" ? diff : -diff;
  });
}

/**
 * Manages sorting state and produces sorted track records for the admin table.
 */
export function useTrackSort(tracks: AdminTrackRecord[]) {
  const [sortField, setSortField] = useState<TrackSortField>("track");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: TrackSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTracks = useMemo(
    () => sortTracks(tracks, sortField, sortDirection),
    [tracks, sortField, sortDirection],
  );

  return {
    sortedTracks,
    sortField,
    sortDirection,
    handleSort,
  };
}
