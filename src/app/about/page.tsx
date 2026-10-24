export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
        About Beats for Days
      </h1>

      <p className="leading-relaxed text-zinc-300">
        Beats for Days is an infinite generative 90s boom bap radio experience.
        Every beat is 1 minute long, perfectly loopable, and woven together with
        custom AI transitions inspired by golden-era vinyl sampling and 1950s
        radio station handoffs.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-200">
          The Continuous Radio Graph
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Instead of fixed repeating playlists, tracks connect in a directed
          graph. AI transitions blend seamlessly from one beat to the next,
          ensuring listeners hear fresh combinations that evolve over time.
        </p>
      </section>
    </main>
  );
}
