import { BeatNumber } from "@/components/audio/BeatNumber";
import { STARTER_BEAT_ID } from "@/lib/constants";

export default function Home() {
  return <BeatNumber fallbackBeatId={STARTER_BEAT_ID} />;
}
