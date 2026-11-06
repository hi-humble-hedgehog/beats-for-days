"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { usePosterContext } from "./PosterContext";
import styles from "./PosterInfoSlot.module.css";

export type PosterInfoSection = "about" | "privacy" | "not-found";

export type PosterInfoSlotProps = {
  title: string;
  returnHref?: string;
  children: ReactNode;
};

/**
 * Editorial text container for the poster player slot.
 * Renders a subordinate <h2> heading and "Return to player" link in its header,
 * with route-provided editorial copy passed as children.
 */
export function PosterInfoSlot({
  title,
  returnHref,
  children,
}: PosterInfoSlotProps) {
  /* A11Y-PLAN
    1. Landmarks: Content section slot rendered inside PosterTransport.
    2. Headings: Subordinate <h2> heading.
    3. Controls: Return to player <Link>. Audio is started via the Play button directly below in TransportControls.
    4. Contrast: --foreground on --sleeve (15.3:1 AAA), --primary (4.7:1 AA).
  */
  const poster = usePosterContext();
  const targetHref = returnHref ?? poster?.returnHref ?? ROUTES.HOME;

  return (
    <div className={styles.slot}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{title}</h2>
        <Link href={targetHref} className={styles.close}>
          Return to player <span aria-hidden="true">✕</span>
        </Link>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
