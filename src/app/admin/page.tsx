import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { type AdminTrackRecord, fetchAdminTracks } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const instant = false;

export const metadata = {
  title: "Catalog Admin | Beats for Days",
  description: "Local development audio catalog administration.",
};

/**
 * Local-only admin dashboard route.
 * Throws 404 in production to protect the audio catalog (ADR 0016).
 */
export default async function AdminPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  let tracks: AdminTrackRecord[] = [];
  try {
    const client = getSupabaseAdminClient();
    tracks = await fetchAdminTracks(client);
  } catch (err) {
    console.error("Failed to load admin tracks:", err);
  }

  return <AdminDashboard initialTracks={tracks} />;
}
