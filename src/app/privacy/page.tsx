import { PosterInfoSlot } from "@/components/audio/PosterInfoSlot";

export const metadata = {
  title: "Privacy | Beats for Days",
  description:
    "Privacy and data policy for Beats for Days: cookieless telemetry, local storage only, and no tracking pixels.",
};

export default function PrivacyPage() {
  return (
    <PosterInfoSlot title="Privacy & Data">
      <p>
        Beats for Days is an experimental boom bap stream run by Rick van Mook.
        We respect your ears and your data: no tracking cookies, no ad pixels,
        no data selling.
      </p>
      <p className="muted">
        <strong>Tracking:</strong> Player settings stay in your browser
        (localStorage) and telemetry is cookieless and aggregate.{" "}
        <strong>Contact:</strong> Email{" "}
        <a href="mailto:rick@beatsfordays.ai">rick@beatsfordays.ai</a> to delete
        your data or ask questions.
      </p>
    </PosterInfoSlot>
  );
}
