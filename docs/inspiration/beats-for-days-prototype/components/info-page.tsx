import Link from 'next/link'

type InfoPageProps = {
  section: 'about' | 'terms'
  description: string
  note?: string
}

export function InfoPage({ section, description, note }: InfoPageProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 py-4 text-foreground md:px-8 md:py-8">
      <header className="grid grid-cols-6 items-start gap-x-3 border-b-2 border-foreground pb-4 md:grid-cols-12 md:gap-x-4">
        <Link
          href="/"
          aria-label="Beats for Days player"
          className="col-span-3 text-xl font-bold leading-[0.82] tracking-[-0.06em] md:col-span-2"
        >
          Beats
          <br />
          for Days
        </Link>
        <nav
          aria-label="Site navigation"
          className="col-span-3 flex items-center justify-end gap-3 text-sm font-bold uppercase tracking-wider md:col-span-10 md:gap-6"
        >
          <Link
            href="/about"
            aria-current={section === 'about' ? 'page' : undefined}
            className="transition-colors hover:text-primary focus-visible:outline-2 aria-[current=page]:text-primary"
          >
            About
          </Link>
          <Link
            href="/terms"
            aria-current={section === 'terms' ? 'page' : undefined}
            className="transition-colors hover:text-primary focus-visible:outline-2 aria-[current=page]:text-primary"
          >
            Terms
          </Link>
        </nav>
      </header>

      <article className="grid grid-cols-6 gap-x-3 pt-12 md:grid-cols-12 md:gap-x-4 md:pt-24">
        <div className="col-span-6 md:col-span-7 md:col-start-3 lg:col-span-6">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Beats for Days / {section}
          </p>
          <h1 className="text-5xl font-bold leading-[0.85] tracking-[-0.07em] text-balance md:text-8xl">
            {section === 'about' ? 'About' : 'Terms'}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">{description}</p>
          {note && (
            <p className="mt-6 max-w-xl border-t border-foreground/30 pt-3 text-sm leading-relaxed text-muted-foreground">
              {note}
            </p>
          )}
        </div>
      </article>

      <footer className="mt-auto grid grid-cols-6 items-end gap-x-3 border-t-2 border-foreground pt-3 text-sm font-bold uppercase tracking-wider md:grid-cols-12 md:gap-x-4">
        <span className="col-span-3">Beats for Days</span>
        <Link
          href="/"
          className="col-span-3 text-right transition-colors hover:text-primary focus-visible:outline-2 md:col-span-9"
        >
          Return to player
        </Link>
      </footer>
    </main>
  )
}
