"use client";

import { useState } from "react";
import type { AdminTrackRecord, UpdateTrackInput } from "@/lib/admin";
import { API_ROUTES } from "@/lib/constants";

/**
 * Manages administrative track list state, active toggling, and metadata updates.
 */
export function useAdminTracks(initialTracks: AdminTrackRecord[]) {
  const [tracks, setTracks] = useState<AdminTrackRecord[]>(initialTracks);
  const [errorMessage, setErrorMessage] = useState("");

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: nextActive } : t)),
    );

    try {
      const res = await fetch(`${API_ROUTES.ADMIN_TRACKS}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (!res.ok) throw new Error("Failed to update status on server");
      const data = await res.json();
      setTracks((prev) => prev.map((t) => (t.id === id ? data.track : t)));
    } catch (err) {
      setErrorMessage((err as Error).message);
      setTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !nextActive } : t)),
      );
    }
  };

  const handleSaveEdit = async (id: string, updates: UpdateTrackInput) => {
    const res = await fetch(`${API_ROUTES.ADMIN_TRACKS}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update track");
    }

    const data = await res.json();
    setTracks((prev) => prev.map((t) => (t.id === id ? data.track : t)));
  };

  const handleTrackCreated = (newTrack: AdminTrackRecord) => {
    setTracks((prev) => [
      newTrack,
      ...prev.filter((t) => t.id !== newTrack.id),
    ]);
  };

  return {
    tracks,
    errorMessage,
    handleToggleActive,
    handleSaveEdit,
    handleTrackCreated,
  };
}
