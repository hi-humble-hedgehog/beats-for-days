import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_NAV } from "@/lib/player/chrome";
import { ROUTES } from "@/lib/constants";

export type InfoSection =
  "about" | "terms" | "privacy" | "generate" | "not-found";

type InfoPageProps = {
  section: InfoSection;
  title: string;
  children: ReactNode;
};

/**
 * 6/12-column Swiss editorial frame for about, legal, generate, and 404.
 */
export function InfoPage({ section, title, children }: InfoPageProps) {
  return (
    /* A11Y-PLAN
      1. Landmarks: <header> banner with site name; <nav aria-label="Site navigation">;
         <main> article body; <footer> contentinfo
      2. Headings: single <h1> from `title`
      3. Controls: header and footer links; page-specific children (forms/buttons)
      4. Contrast: --foreground/--primary/--muted-foreground on --sleeve
    */
    <div className="flex min-h-dvh flex-col bg-background px-4 py-4 text-foreground md:px-8 md:py-8">
      <header className="grid grid-cols-6 items-start gap-x-3 border-b-2 border-foreground pb-4 md:grid-cols-12 md:gap-x-4">
        <Link
          href={ROUTES.HOME}
          aria-label="Beats for Days player"
          className="col-span-3 text-xl leading-[0.82] font-bold tracking-[-0.06em] md:col-span-2"
        >
          Beats
          <br />
          for Days
        </Link>
        <nav
          aria-label="Site navigation"
          className="col-span-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm font-bold tracking-wider uppercase md:col-span-10 md:gap-6"
        >
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={section === item.id ? "page" : undefined}
              className="inline-flex min-h-6 items-center transition-colors hover:text-primary focus-visible:outline-2 aria-[current=page]:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">
        <article className="grid grid-cols-6 gap-x-3 pt-12 md:grid-cols-12 md:gap-x-4 md:pt-24">
          <div className="col-span-6 md:col-span-7 md:col-start-3 lg:col-span-6">
            <p className="mb-3 text-sm font-bold tracking-widest text-primary uppercase">
              Beats for Days / {section}
            </p>
            <h1 className="text-5xl leading-[0.85] font-bold tracking-[-0.07em] text-balance md:text-8xl">
              {title}
            </h1>
            <div className="mt-8 max-w-2xl space-y-6 text-lg leading-relaxed md:text-xl">
              {children}
            </div>
          </div>
        </article>
      </main>
      <footer className="grid grid-cols-6 items-end gap-x-3 border-t-2 border-foreground pt-3 text-sm font-bold tracking-wider uppercase md:grid-cols-12 md:gap-x-4">
        <span className="col-span-3">Beats for Days</span>
        <Link
          href={ROUTES.HOME}
          className="col-span-3 min-h-6 text-right transition-colors hover:text-primary focus-visible:outline-2 md:col-span-9"
        >
          Return to player
        </Link>
      </footer>
    </div>
  );
}
