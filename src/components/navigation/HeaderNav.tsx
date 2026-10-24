"use client";

import Link from "next/link";
import { useAudioPlayer } from "@/components/audio/AudioPlayerContext";
import { ROUTES } from "@/lib/constants";
import { formatBeatUrl } from "@/lib/player/url";

export function HeaderNav() {
  const { current } = useAudioPlayer();
  const beatsHref = current?.id ? formatBeatUrl(current.id) : ROUTES.BEATS;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-bold tracking-tight text-zinc-100 transition hover:text-amber-400"
        >
          <span className="text-amber-500" aria-hidden="true">
            ◈
          </span>{" "}
          Beats for Days
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-6 text-sm font-medium text-zinc-400"
        >
          <Link
            href={beatsHref}
            className="transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Beats
          </Link>
          <Link
            href={ROUTES.GENERATE}
            className="transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Generate
          </Link>
          <Link
            href={ROUTES.ABOUT}
            className="transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            About
          </Link>
          <Link
            href={ROUTES.TERMS}
            className="transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Terms
          </Link>
          <Link
            href={ROUTES.PRIVACY}
            className="transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </header>
  );
}
