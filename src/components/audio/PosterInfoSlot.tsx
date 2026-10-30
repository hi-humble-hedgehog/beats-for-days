"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { usePosterContext } from "./PosterContext";

export type PosterInfoSection = "about" | "privacy";

type PosterInfoSlotProps = {
  section: PosterInfoSection;
  returnHref?: string;
};

/**
 * Editorial text replacement for the giant track number in the poster player.
 * Shows a concise two-paragraph summary for about or privacy routes with a
 * link back to the player.
 */
export function PosterInfoSlot({ section, returnHref }: PosterInfoSlotProps) {
  const poster = usePosterContext();
  const targetHref = returnHref ?? poster?.returnHref ?? ROUTES.HOME;
  const isAbout = section === "about";

  return (
    <div className="flex w-full flex-col gap-2 pb-1 text-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-foreground/30 pb-1.5">
        <h2 className="text-xs font-bold tracking-widest text-primary uppercase">
          {isAbout ? "About Beats for Days" : "Privacy & Data"}
        </h2>
        <Link
          href={targetHref}
          className="inline-flex min-h-6 items-center text-xs font-bold tracking-wider text-muted-foreground uppercase transition-colors hover:text-primary focus-visible:outline-2"
          aria-label="Return to player"
        >
          Return to player ✕
        </Link>
      </div>
      {isAbout ? (
        <div className="flex flex-col gap-2 text-xs leading-relaxed md:text-sm">
          <p>
            Beats for Days is an infinite generative 90s boom bap radio
            experience. Every beat is 1 minute long, perfectly loopable, and
            woven together with custom AI transitions inspired by golden-era
            vinyl sampling and 1950s radio station handoffs.
          </p>
          <p className="text-muted-foreground">
            Instead of fixed repeating playlists, tracks connect in a continuous
            directed graph. AI transitions blend seamlessly from one beat to the
            next, ensuring fresh combinations that evolve over time.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-xs leading-relaxed md:text-sm">
          <p>
            Beats for Days is an experimental boom bap stream run by Rick van
            Mook. We respect your ears and your data: no tracking cookies, no ad
            pixels, no data selling.
          </p>
          <p className="text-muted-foreground">
            <strong className="font-semibold text-foreground">Tracking:</strong>{" "}
            Player settings stay in your browser (localStorage) and telemetry is
            cookieless and aggregate.{" "}
            <strong className="font-semibold text-foreground">Contact:</strong>{" "}
            Email{" "}
            <a
              href="mailto:rick@beatsfordays.ai"
              className="text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2"
            >
              rick@beatsfordays.ai
            </a>{" "}
            to delete your data or ask questions.
          </p>
        </div>
      )}
    </div>
  );
}
