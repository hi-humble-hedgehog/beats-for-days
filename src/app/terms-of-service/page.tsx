export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-3xl leading-[0.85] font-bold tracking-tighter text-foreground sm:text-5xl">
        Terms of Service
      </h1>

      <p className="leading-relaxed text-foreground">
        Welcome to Beats for Days. By accessing our 24/7 generative radio stream
        or beat studio, you agree to these terms.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Radio Streaming & Fair Use
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The radio stream is free for personal listening and background
          streaming. Automated scraping of raw audio assets or transition files
          without prior permission is prohibited.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Generated Stems & Community Rotation
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Beats created through the waitlist, instant pass, or BYOK enter the
          public catalog and may be played across the continuous 24/7 radio
          stream.
        </p>
      </section>
    </main>
  );
}
