import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 p-8">
      <nav className="flex gap-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-200">
          ← Back to Deck
        </Link>
        <Link href="/about" className="hover:text-zinc-200">
          About
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
        Terms of Service
      </h1>

      <p className="leading-relaxed text-zinc-300">
        Standard terms for Beats for Days. Audio playback persists seamlessly
        across all routes without interrupting playback or unmounting state.
      </p>
    </main>
  );
}
