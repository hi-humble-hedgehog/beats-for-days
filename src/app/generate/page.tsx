import { notFound } from "next/navigation";

/**
 * Generation route is disabled for the initial radio streaming MVP.
 * Triggers 404 until generation and studio features launch.
 */
export default function GeneratePage(): null {
  notFound();
}
