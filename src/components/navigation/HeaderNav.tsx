"use client";

import Link from "next/link";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { ROUTES } from "@/lib/constants";
import { formatBeatUrl } from "@/lib/player/url";

export function HeaderNav() {
  const { current } = useAudioPlayer();
  const beatsHref = current?.id ? formatBeatUrl(current.id) : ROUTES.BEATS;

  return (
    <header className="border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-bold tracking-tight text-foreground transition hover:text-primary"
        >
          <span className="font-black text-primary" aria-hidden="true">
            #
          </span>{" "}
          Beats for Days
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-6 text-xs font-bold tracking-widest text-muted-foreground uppercase"
        >
          <Link href={beatsHref} className="transition hover:text-foreground">
            Beats
          </Link>
          <Link
            href={ROUTES.GENERATE}
            className="transition hover:text-foreground"
          >
            Generate
          </Link>
          <Link
            href={ROUTES.ABOUT}
            className="transition hover:text-foreground"
          >
            About
          </Link>
          <Link
            href={ROUTES.TERMS}
            className="transition hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href={ROUTES.PRIVACY}
            className="transition hover:text-foreground"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </header>
  );
}
