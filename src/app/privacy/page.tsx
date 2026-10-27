import { PosterInfoSlot } from "@/components/audio/PosterInfoSlot";

export const metadata = {
  title: "Privacy | Beats for Days",
  description:
    "Privacy and data policy for Beats for Days: cookieless telemetry, local storage only, and no tracking pixels.",
};

export default function PrivacyPage() {
  return <PosterInfoSlot section="privacy" />;
}
