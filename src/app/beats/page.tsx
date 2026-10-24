import { redirect } from "next/navigation";

/**
 * Server component redirecting cold-start /beats visitors to the canonical beat deck.
 *
 * Rationale:
 * Issuing an HTTP 307 server redirect eliminates client-side DOM mounting and avoids
 * any render flash when a user arrives directly at `/beats` via bookmark or external link.
 * In-app header navigation directly computes the active beat URL, bypassing this route entirely.
 */
export default function BeatsPage() {
  redirect("/beat/0001");
}
