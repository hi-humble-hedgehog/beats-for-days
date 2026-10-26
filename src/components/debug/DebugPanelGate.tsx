"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/constants";
import { isDebugQueryEnabled, shouldRenderDebugGate } from "@/lib/debug";

const DebugPanel = dynamic(
  () => import("./DebugPanel").then((mod) => mod.DebugPanel),
  { ssr: false },
);

function checkDebugCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${STORAGE_KEYS.DEBUG_PANEL}=`));
}

function persistDebugCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${STORAGE_KEYS.DEBUG_PANEL}=1; path=/; max-age=31536000; SameSite=Lax`;
}

function subscribeToDebugCookie() {
  return () => {};
}

/**
 * Loads the debug panel when `?debug=1` is present or when the debug cookie is set.
 * Persists the debug flag via cookie so the panel stays available across history navigation.
 * The root layout renders this gate only when `DEBUG_PANEL=true`.
 */
export function DebugPanelGate() {
  const searchParams = useSearchParams();
  const hasQueryFlag = isDebugQueryEnabled(searchParams);
  const hasCookie = useSyncExternalStore(
    subscribeToDebugCookie,
    checkDebugCookie,
    () => false,
  );

  useEffect(() => {
    if (hasQueryFlag) {
      persistDebugCookie();
    }
  }, [hasQueryFlag]);

  const shouldRender = shouldRenderDebugGate({
    hasQueryFlag,
    hasCookie,
  });

  return shouldRender ? <DebugPanel /> : null;
}
