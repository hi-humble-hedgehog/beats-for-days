import { PosterInfoSlot } from "@/components/audio/PosterInfoSlot";

export const metadata = {
  title: "About | Beats for Days",
  description:
    "Beats for Days is an infinite generative 90s boom bap radio experience woven together with custom AI transitions.",
};

export default function AboutPage() {
  return (
    <PosterInfoSlot title="About Beats for Days">
      <p>
        Beats for Days is an infinite generative 90s boom bap radio experience.
        Every beat is 1 minute long, perfectly loopable, and woven together with
        custom AI transitions inspired by golden-era vinyl sampling and 1950s
        radio station handoffs.
      </p>
      <p className="muted">
        Instead of fixed repeating playlists, tracks connect in a continuous
        directed graph. AI transitions blend seamlessly from one beat to the
        next, ensuring fresh combinations that evolve over time.
      </p>
    </PosterInfoSlot>
  );
}
