"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { usePosterContext } from "./PosterContext";
import styles from "./PosterInfoSlot.module.css";

export type PosterInfoSection = "about" | "privacy" | "not-found";

type PosterInfoSlotProps = {
  section: PosterInfoSection;
  returnHref?: string;
};

/**
 * Editorial text replacement for the giant track number in the poster player.
 * Shows a concise two-paragraph summary for about, privacy, or 404 not-found routes
 * with a link back to the player.
 */
export function PosterInfoSlot({ section, returnHref }: PosterInfoSlotProps) {
  /* A11Y-PLAN
    1. Landmarks: Content section slot rendered inside PosterTransport.
    2. Headings: Subordinate <h2> heading ("About Beats for Days", "Privacy & Data", "404 — Beat Not Found").
    3. Controls: Return to player <Link>. Audio is started via the Play button directly below in TransportControls.
    4. Contrast: --foreground on --sleeve (15.3:1 AAA), --primary (4.7:1 AA).
  */
  const poster = usePosterContext();
  const targetHref = returnHref ?? poster?.returnHref ?? ROUTES.HOME;
  const isAbout = section === "about";
  const isNotFound = section === "not-found";

  const title = isAbout
    ? "About Beats for Days"
    : isNotFound
      ? "404 — Beat Not Found"
      : "Privacy & Data";

  return (
    <div className={styles.slot}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{title}</h2>
        <Link
          href={targetHref}
          className={styles.close}
          aria-label="Return to player"
        >
          Close
        </Link>
      </div>
      {isAbout ? (
        <div className={styles.body}>
          <p>
            Beats for Days is an infinite generative 90s boom bap radio
            experience. Every beat is 1 minute long, perfectly loopable, and
            woven together with custom AI transitions inspired by golden-era
            vinyl sampling and 1950s radio station handoffs.
          </p>
          <p className={styles.muted}>
            Instead of fixed repeating playlists, tracks connect in a continuous
            directed graph. AI transitions blend seamlessly from one beat to the
            next, ensuring fresh combinations that evolve over time.
          </p>
        </div>
      ) : isNotFound ? (
        <div className={styles.body}>
          <p>
            That beat is not in the crate. Press play to resume your paused beat
            or start the next track.
          </p>
        </div>
      ) : (
        <div className={styles.body}>
          <p>
            Beats for Days is an experimental boom bap stream run by Rick van
            Mook. We respect your ears and your data: no tracking cookies, no ad
            pixels, no data selling.
          </p>
          <p className={styles.muted}>
            <strong className={styles.strong}>Tracking:</strong> Player settings
            stay in your browser (localStorage) and telemetry is cookieless and
            aggregate. <strong className={styles.strong}>Contact:</strong> Email{" "}
            <a href="mailto:rick@beatsfordays.ai" className={styles.link}>
              rick@beatsfordays.ai
            </a>{" "}
            to delete your data or ask questions.
          </p>
        </div>
      )}
    </div>
  );
}
