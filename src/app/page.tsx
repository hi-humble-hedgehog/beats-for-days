import { PosterTrackNumber } from "@/components/audio/PosterTrackNumber";
import { STARTER_BEAT_ID } from "@/lib/constants";

export default function Home() {
  return <PosterTrackNumber fallbackBeatId={STARTER_BEAT_ID} />;
}
