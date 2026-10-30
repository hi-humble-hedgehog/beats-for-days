"use client";

interface IdentityInputsProps {
  index: number;
  id: string;
  name: string;
  onIndexChange: (v: number) => void;
  onIdChange: (v: string) => void;
  onNameChange: (v: string) => void;
}

/** Grouped identifier inputs: track number, internal ID, and public label. */
export function IdentityInputs({
  index,
  id,
  name,
  onIndexChange,
  onIdChange,
  onNameChange,
}: IdentityInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-index" className="font-bold text-foreground">
          Track # (Index)
        </label>
        <input
          id="upload-index"
          type="number"
          min="1"
          required
          value={index}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-id" className="font-bold text-foreground">
          Track ID
        </label>
        <input
          id="upload-id"
          type="text"
          required
          placeholder="e.g. track-37"
          value={id}
          onChange={(e) => onIdChange(e.target.value)}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-name" className="font-bold text-foreground">
          Track Name
        </label>
        <input
          id="upload-name"
          type="text"
          required
          placeholder="e.g. 37"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

interface MusicalInputsProps {
  bpm: number;
  keySig: string;
  genre: string;
  onBpmChange: (v: number) => void;
  onKeyChange: (v: string) => void;
  onGenreChange: (v: string) => void;
}

/** Grouped musical metadata inputs: BPM, key, and genre. */
export function MusicalInputs({
  bpm,
  keySig,
  genre,
  onBpmChange,
  onKeyChange,
  onGenreChange,
}: MusicalInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-bpm" className="font-bold text-foreground">
          BPM
        </label>
        <input
          id="upload-bpm"
          type="number"
          min="40"
          max="200"
          required
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-key" className="font-bold text-foreground">
          Key
        </label>
        <input
          id="upload-key"
          type="text"
          required
          value={keySig}
          onChange={(e) => onKeyChange(e.target.value)}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-genre" className="font-bold text-foreground">
          Genre
        </label>
        <input
          id="upload-genre"
          type="text"
          required
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

interface TimingInputsProps {
  durationMs: number;
  loopStartMs: number;
  loopEndMs: number;
  onDurationChange: (v: number) => void;
  onLoopStartChange: (v: number) => void;
  onLoopEndChange: (v: number) => void;
}

/** Grouped timing inputs: total track duration, loop start, and loop end. */
export function TimingInputs({
  durationMs,
  loopStartMs,
  loopEndMs,
  onDurationChange,
  onLoopStartChange,
  onLoopEndChange,
}: TimingInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-duration" className="font-bold text-foreground">
          Duration (ms)
        </label>
        <input
          id="upload-duration"
          type="number"
          min="1000"
          required
          value={durationMs}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="upload-loop-start"
          className="font-bold text-foreground"
        >
          Loop Start (ms)
        </label>
        <input
          id="upload-loop-start"
          type="number"
          min="0"
          required
          value={loopStartMs}
          onChange={(e) => onLoopStartChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="upload-loop-end" className="font-bold text-foreground">
          Loop End (ms)
        </label>
        <input
          id="upload-loop-end"
          type="number"
          min="1000"
          required
          value={loopEndMs}
          onChange={(e) => onLoopEndChange(Number(e.target.value))}
          className="min-h-9 border border-foreground/40 bg-background px-3 py-1 font-mono text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

/** Accessible file picker for .m4a audio track upload. */
export function UploadFileInput({
  onChange,
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="upload-audio" className="font-bold text-foreground">
        Audio File (.m4a)
      </label>
      <input
        id="upload-audio"
        type="file"
        accept=".m4a,audio/mp4,audio/x-m4a"
        required
        onChange={onChange}
        className="file:mr-4 file:border file:border-foreground file:bg-background file:px-4 file:py-1 file:font-mono file:text-xs file:font-bold file:text-foreground file:uppercase hover:file:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      />
    </div>
  );
}

/** Form submit button with loading state. */
export function UploadSubmitButton({ isUploading }: { isUploading: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-end">
      <button
        type="submit"
        disabled={isUploading}
        className="min-h-10 border border-foreground bg-foreground px-6 font-bold tracking-wider text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Upload & Register Beat"}
      </button>
    </div>
  );
}
