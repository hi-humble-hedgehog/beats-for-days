"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { SITE_NAV } from "@/lib/player/chrome";

type TransportControlsProps = {
  isPlaying: boolean;
  muted: boolean;
  showGrid: boolean;
  activeSection?: "about" | "privacy";
  returnHref?: string;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleMute: () => void;
  onToggleGrid: () => void;
};

const squareButton =
  "flex size-11 shrink-0 items-center justify-center border-2 border-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

function IconSkipBack() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function IconSkipForward() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
    </svg>
  );
}

function IconVolume({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M16.5 12 21 16.5 19.5 18 15 13.5 10.5 18 9 16.5 13.5 12 9 7.5 10.5 6 15 10.5 19.5 6 21 7.5zM3 9h4l5-4v14l-5-4H3z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={props.onPrevious}
        aria-label="Previous beat"
        className={`${squareButton} hover:bg-foreground hover:text-background`}
      >
        <IconSkipBack />
      </button>
      <button
        type="button"
        onClick={props.onToggle}
        aria-label={props.isPlaying ? "Pause" : "Play"}
        className={`${squareButton} border-primary bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground hover:text-background`}
      >
        {props.isPlaying ? <IconPause /> : <IconPlay />}
      </button>
      <button
        type="button"
        onClick={props.onNext}
        aria-label="Next beat"
        className={`${squareButton} hover:bg-foreground hover:text-background`}
      >
        <IconSkipForward />
      </button>
      <button
        type="button"
        onClick={props.onToggleMute}
        aria-label={props.muted ? "Unmute" : "Mute"}
        aria-pressed={props.muted}
        className={`${squareButton} hover:bg-foreground hover:text-background ${props.muted ? "border-primary text-primary" : ""}`}
      >
        <IconVolume muted={props.muted} />
      </button>
      <button
        type="button"
        onClick={props.onToggleGrid}
        aria-pressed={props.showGrid}
        className="ml-auto flex min-h-6 items-center gap-2 text-sm font-bold tracking-widest uppercase hover:text-primary focus-visible:outline-2"
      >
        <span
          className={`grid size-4 grid-cols-2 gap-px border border-current ${props.showGrid ? "bg-primary text-primary" : ""}`}
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
    <div className="flex flex-col gap-2 border-t-2 border-foreground pt-3">
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
      <nav
        aria-label="Information"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-foreground/30 pt-2 text-sm font-bold tracking-wider uppercase"
      >
        {SITE_NAV.map((item, index) => {
          const isActive = props.activeSection === item.id;
          return (
            <span key={item.href} className="contents">
              {index > 0 ? (
                <span className="text-primary" aria-hidden="true">
                  /
                </span>
              ) : null}
              <Link
                href={isActive ? (props.returnHref ?? ROUTES.HOME) : item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-6 items-center transition-colors hover:text-primary focus-visible:outline-2 ${
                  isActive ? "text-primary" : ""
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
