"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminTrackRecord } from "@/lib/admin";
import { ROUTES } from "@/lib/constants";
import { AdminAuditionModal } from "./AdminAuditionModal";
import { AdminEditModal } from "./AdminEditModal";
import { AdminTrackTable } from "./AdminTrackTable";
import { AdminUploadForm } from "./AdminUploadForm";
import { useAdminTracks } from "./useAdminTracks";

interface AdminDashboardProps {
  initialTracks: AdminTrackRecord[];
}

function AdminHeader() {
  return (
    <header className="gap-2 border-foreground pb-4 md:flex-row md:items-center md:justify-between flex flex-col border-b-2">
      <div>
        <span className="font-bold tracking-widest text-primary text-[10px] uppercase">
          LOCAL DEV ONLY (ADR 0016)
        </span>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl uppercase">
          CATALOG MANAGEMENT
        </h1>
      </div>
      <Link
        href={ROUTES.HOME}
        className="min-h-9 border-foreground/40 px-4 text-xs font-bold hover:border-foreground hover:bg-foreground/10 focus-visible:ring-primary inline-flex items-center border uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Return to Player ✕
      </Link>
    </header>
  );
}

/**
 * Administrative dashboard container for boom bap audio catalog curation.
 * Enables one-click active/inactive toggling, metadata editing, and direct audio file uploads.
 */
export function AdminDashboard({ initialTracks }: AdminDashboardProps) {
  /* A11Y-PLAN
     Landmarks: <main> landmarks wrapping header, upload section, and catalog table.
     Headings: Single <h1> for page title, logical <h2> for subsections.
     Controls: High-contrast link returning to main player, interactive buttons with visible focus rings.
     Contrast: Foreground on sleeve background (15.3:1 AAA), primary accents (4.7:1 AA).
  */

  const {
    tracks,
    errorMessage,
    handleToggleActive,
    handleSaveEdit,
    handleTrackCreated,
  } = useAdminTracks(initialTracks);

  const [editingTrack, setEditingTrack] = useState<AdminTrackRecord | null>(
    null,
  );
  const [auditionTrack, setAuditionTrack] = useState<AdminTrackRecord | null>(
    null,
  );

  const activeCount = tracks.filter((t) => t.is_active).length;
  const disabledCount = tracks.length - activeCount;
  const suggestedIndex =
    tracks.length > 0 ? Math.max(...tracks.map((t) => t.index ?? 0)) + 1 : 1;

  return (
    <main className="max-w-5xl gap-8 p-6 md:p-12 mx-auto flex min-h-screen w-full flex-col">
      <AdminHeader />

      {errorMessage && (
        <div
          role="alert"
          className="border-primary bg-primary/10 p-4 text-xs font-bold text-primary border uppercase"
        >
          {errorMessage}
        </div>
      )}

      <AdminUploadForm
        onTrackCreated={handleTrackCreated}
        suggestedIndex={suggestedIndex}
      />

      <section aria-labelledby="tracks-heading" className="gap-4 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 id="tracks-heading" className="text-sm font-bold uppercase">
            Existing Tracks ({tracks.length})
          </h2>
          <span className="font-mono text-muted-foreground text-[11px] uppercase">
            {activeCount} Active • {disabledCount} Disabled
          </span>
        </div>

        <AdminTrackTable
          tracks={tracks}
          onToggleActive={(id, nextActive) => {
            void handleToggleActive(id, nextActive);
          }}
          onEdit={(track) => setEditingTrack(track)}
          onAudition={(track) => setAuditionTrack(track)}
        />
      </section>

      <AdminEditModal
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
        onSave={handleSaveEdit}
      />

      <AdminAuditionModal
        track={auditionTrack}
        allTracks={tracks}
        onClose={() => setAuditionTrack(null)}
        onSelectTrack={(track) => setAuditionTrack(track)}
      />
    </main>
  );
}
