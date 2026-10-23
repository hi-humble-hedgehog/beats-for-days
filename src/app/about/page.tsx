import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 p-8">
      <nav className="flex gap-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-200">
          ← Back to Deck
        </Link>
        <Link href="/terms-of-service" className="hover:text-zinc-200">
          Terms of Service
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
        About Beats for Days
      </h1>

      <p className="leading-relaxed text-zinc-300">
        Infinite generative 90s boom bap radio. Notice that while you are
        reading this page, the bottom audio player continues advancing every 5
        seconds, but the browser URL stays fixed on{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-amber-400">
          /about
        </code>
        .
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
        <p>
          Head back to the{" "}
          <Link
            href="/"
            className="text-amber-400 underline hover:text-amber-300"
          >
            Deck (Home)
          </Link>{" "}
          to see the URL automatically update with each beat transition.
        </p>
      </div>
    </main>
  );
}
