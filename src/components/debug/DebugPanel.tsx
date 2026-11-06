"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { STORAGE_KEYS } from "@/lib/constants";
import styles from "./DebugPanel.module.css";

function DebugDetails({
  currentBeatLabel,
  pathname,
  historyState,
  historyLength,
  phase,
  secondsRemaining,
  positionSec,
  historyList,
}: {
  currentBeatLabel: string;
  pathname: string;
  historyState: string;
  historyLength: number;
  phase?: string;
  secondsRemaining: number;
  positionSec?: number;
  historyList: string[];
}) {
  const formattedHistory =
    historyList.length > 0 ? historyList.join(" → ") : "(empty)";

  return (
    <div className={styles.details}>
      <div>
        <span className={styles.label}>Active Beat: </span>
        <span className={styles.value}>{currentBeatLabel}</span>
      </div>

      <div>
        <span className={styles.label}>Route: </span>
        <span className={styles.value}>{pathname}</span>
      </div>

      <div>
        <span className={styles.label}>History State: </span>
        <code className={styles.code}>{historyState}</code>
      </div>

      <div>
        <span className={styles.label}>History Stack Length: </span>
        <span className={styles.value}>{historyLength}</span>
      </div>

      <div>
        <span className={styles.label}>Engine Phase: </span>
        <span className={styles.value}>
          {phase ?? "idle"} ({secondsRemaining}s remaining, pos:{" "}
          {Math.round(positionSec ?? 0)}s)
        </span>
      </div>

      <div className={styles.history}>
        <span className={styles.label}>
          Played History ({historyList.length}):
        </span>
        <p className={styles.historyText}>{formattedHistory}</p>
      </div>
    </div>
  );
}

function DebugContent({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  const {
    current,
    activePathname,
    phase,
    secondsRemaining,
    positionSec,
    playedHistory,
  } = useAudioPlayer();

  const historyState =
    typeof window !== "undefined"
      ? JSON.stringify(window.history.state ?? null)
      : "null";

  const historyLength =
    typeof window !== "undefined" ? window.history.length : 0;

  const currentBeatLabel = current ? `${current.name} (${current.id})` : "None";

  const historyList = playedHistory ?? [];

  return (
    <div
      id="history-debug-panel"
      role="region"
      aria-label="Playback and history state"
      className={styles.panel}
    >
      <div className={styles.header}>
        <span className={styles.title}>History State Debug</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close debug panel"
          className={styles.close}
        >
          ✕
        </button>
      </div>

      <DebugDetails
        currentBeatLabel={currentBeatLabel}
        pathname={activePathname ?? pathname}
        historyState={historyState}
        historyLength={historyLength}
        phase={phase}
        secondsRemaining={secondsRemaining}
        positionSec={positionSec}
        historyList={historyList}
      />
    </div>
  );
}

function readInitialOpenState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(`${STORAGE_KEYS.DEBUG_PANEL}_open`) ===
      "true"
    );
  } catch {
    return false;
  }
}

function saveOpenState(isOpen: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${STORAGE_KEYS.DEBUG_PANEL}_open`,
      String(isOpen),
    );
  } catch {}
}

/**
 * Floating debug panel displaying real-time browser history and played tracks state.
 * Allows verifying history stack transitions and track synchronization during navigation.
 */
export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(readInitialOpenState);
  const pathname = usePathname();

  useEffect(() => {
    saveOpenState(isOpen);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="history-debug-panel"
        aria-label="Toggle history debug panel"
        className={styles.toggle}
      >
        {isOpen ? "Hide Debug" : "History Debug"}
      </button>

      {isOpen ? (
        <DebugContent pathname={pathname} onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
}
