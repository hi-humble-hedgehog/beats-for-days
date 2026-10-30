import { PosterInfoSlot } from "@/components/audio/PosterInfoSlot";

export const metadata = {
  title: "About | Beats for Days",
  description:
    "Beats for Days is an infinite generative 90s boom bap radio experience woven together with custom AI transitions.",
};

export default function AboutPage() {
  return <PosterInfoSlot section="about" />;
}
