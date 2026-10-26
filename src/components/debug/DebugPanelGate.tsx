"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { isDebugQueryEnabled } from "@/lib/debug";

const DebugPanel = dynamic(
  () => import("./DebugPanel").then((mod) => mod.DebugPanel),
  { ssr: false },
);

/**
 * Loads the debug panel only when the URL has `?debug=1`.
 * The root layout renders this gate only when `DEBUG_PANEL=true`.
 */
export function DebugPanelGate() {
  const searchParams = useSearchParams();
  return isDebugQueryEnabled(searchParams) ? <DebugPanel /> : null;
}
