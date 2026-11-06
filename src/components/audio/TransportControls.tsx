"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { SITE_NAV } from "@/lib/player/chrome";
import type { PosterInfoSection } from "./PosterInfoSlot";
import styles from "./TransportControls.module.css";

type TransportControlsProps = {
  isPlaying: boolean;
  muted: boolean;
  showGrid: boolean;
  activeSection?: PosterInfoSection;
  returnHref?: string;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleMute: () => void;
  onToggleGrid: () => void;
};

function IconSkipBack() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function IconSkipForward() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
    </svg>
  );
}

function IconVolume({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M16.5 12 21 16.5 19.5 18 15 13.5 10.5 18 9 16.5 13.5 12 9 7.5 10.5 6 15 10.5 19.5 6 21 7.5zM3 9h4l5-4v14l-5-4H3z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M3 9h4l5-4v14l-5-4H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
    </svg>
  );
}

function TransportButtons(props: {
  isPlaying: boolean;
  muted: boolean;
  showGrid: boolean;
  onPrevious: () => void;
  onToggle: () => void;
  onNext: () => void;
  onToggleMute: () => void;
  onToggleGrid: () => void;
}) {
  return (
    <div className={styles.buttons}>
      <button
        type="button"
        onClick={props.onPrevious}
        aria-label="Previous beat"
        className={styles.button}
      >
        <IconSkipBack />
      </button>
      <button
        type="button"
        onClick={props.onToggle}
        aria-label={props.isPlaying ? "Pause" : "Play"}
        className={`${styles.button} ${styles.buttonPrimary}`}
      >
        {props.isPlaying ? <IconPause /> : <IconPlay />}
      </button>
      <button
        type="button"
        onClick={props.onNext}
        aria-label="Next beat"
        className={styles.button}
      >
        <IconSkipForward />
      </button>
      <button
        type="button"
        onClick={props.onToggleMute}
        aria-label={props.muted ? "Unmute" : "Mute"}
        aria-pressed={props.muted}
        className={`${styles.button} ${props.muted ? styles.buttonMuted : ""}`}
      >
        <IconVolume muted={props.muted} />
      </button>
      <button
        type="button"
        onClick={props.onToggleGrid}
        aria-pressed={props.showGrid}
        className={styles.gridToggle}
      >
        <span
          className={`${styles.gridSwatch} ${props.showGrid ? styles.gridSwatchActive : ""}`}
          aria-hidden="true"
        />
        Grid
      </button>
    </div>
  );
}

/**
 * Brutalist transport: previous, play/pause, next, mute, and info links.
 */
export function TransportControls(props: TransportControlsProps) {
  return (
    <div className={styles.transport}>
      <TransportButtons
        isPlaying={props.isPlaying}
        muted={props.muted}
        showGrid={props.showGrid}
        onPrevious={props.onPrevious}
        onToggle={props.onToggle}
        onNext={props.onNext}
        onToggleMute={props.onToggleMute}
        onToggleGrid={props.onToggleGrid}
      />
      <nav aria-label="Information" className={styles.nav}>
        {SITE_NAV.map((item, index) => {
          const isActive = props.activeSection === item.id;
          return (
            <span key={item.href} className={styles.navItem}>
              {index > 0 ? (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              ) : null}
              <Link
                href={isActive ? (props.returnHref ?? ROUTES.HOME) : item.href}
                aria-current={isActive ? "page" : undefined}
                className={`${styles.navLink} ${
                  isActive ? styles.navLinkActive : ""
                }`}
              >
                {item.label}
              </Link>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
