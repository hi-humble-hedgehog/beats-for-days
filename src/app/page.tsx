import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-400">
          Infinite Generative 90s Boom Bap
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          Beats for Days
        </h1>
        <p className="max-w-md text-sm text-zinc-400">
          The player automatically advances every 5 seconds. When on this page,
          the URL updates to reflect the active beat. Try navigating to other
          pages to test persistence.
        </p>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
        <Link
          href="/about"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
        >
          About (Route Test)
        </Link>
        <Link
          href="/terms-of-service"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
        >
          Terms of Service (Route Test)
        </Link>
      </nav>
    </main>
  );
}
