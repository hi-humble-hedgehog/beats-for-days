"use client";

import type { AdminTrackRecord } from "@/lib/admin";
import {
  IdentityInputs,
  MusicalInputs,
  TimingInputs,
  UploadFileInput,
  UploadSubmitButton,
} from "./AdminUploadFields";
import { useAudioUpload } from "./useAudioUpload";

interface AdminUploadFormProps {
  onTrackCreated: (track: AdminTrackRecord) => void;
  suggestedIndex?: number;
}

/**
 * Upload form for new M4A boom bap tracks.
 * Decodes audio in browser using Web Audio API to pre-fill duration and loop boundaries.
 */
export function AdminUploadForm({
  onTrackCreated,
  suggestedIndex = 1,
}: AdminUploadFormProps) {
  /* A11Y-PLAN
     Landmarks: Contained within an accessible section with aria-labelledby="upload-heading".
     Headings: Section title marked as <h2>.
     Controls: Native file picker with accept=".m4a,audio/mp4", explicit <label htmlFor> for all inputs.
     Announcements: aria-live="polite" status region for error and success announcements.
     Contrast: High-contrast inputs and buttons adhering to 4.5:1 text and 3:1 UI boundaries.
  */

  const upload = useAudioUpload(onTrackCreated, suggestedIndex);

  return (
    <section
      aria-labelledby="upload-heading"
      className="border border-foreground/30 p-6"
    >
      <h2 id="upload-heading" className="text-sm font-bold uppercase">
        Upload New Beat (.m4a)
      </h2>
      <div
        aria-live="polite"
        className={`mt-2 text-xs font-bold uppercase ${
          upload.isError ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {upload.statusMessage}
      </div>

      <form
        onSubmit={(e) => {
          void upload.handleSubmit(e);
        }}
        className="mt-4 flex flex-col gap-4 text-xs uppercase"
      >
        <UploadFileInput onChange={upload.handleFileChange} />
        <IdentityInputs
          index={upload.index}
          id={upload.id}
          name={upload.name}
          onIndexChange={upload.setIndex}
          onIdChange={upload.setId}
          onNameChange={upload.setName}
        />
        <MusicalInputs
          bpm={upload.bpm}
          keySig={upload.keySig}
          genre={upload.genre}
          onBpmChange={upload.setBpm}
          onKeyChange={upload.setKeySig}
          onGenreChange={upload.setGenre}
        />
        <TimingInputs
          durationMs={upload.durationMs}
          loopStartMs={upload.loopStartMs}
          loopEndMs={upload.loopEndMs}
          onDurationChange={upload.setDurationMs}
          onLoopStartChange={upload.setLoopStartMs}
          onLoopEndChange={upload.setLoopEndMs}
        />
        <UploadSubmitButton isUploading={upload.isUploading} />
      </form>
    </section>
  );
}
