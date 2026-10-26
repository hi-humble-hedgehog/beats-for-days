import { redirect } from "next/navigation";

/**
 * Server component redirecting cold-start `/beats` visitors to the root landing page.
 *
 * Rationale:
 * Play history lives in browser `localStorage`, so the server cannot pick an unheard
 * beat on a cold `/beats` request. Redirecting to `/` lets the visitor start the
 * next unheard beat via `resolveStartBeat`. In-app header navigation links directly
 * to the active beat URL when one is loaded.
 */
export default function BeatsPage() {
  redirect("/");
}
