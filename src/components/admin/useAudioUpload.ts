"use client";

import { useState } from "react";
import type { AdminTrackRecord } from "@/lib/admin";
import { API_ROUTES } from "@/lib/constants";

async function extractAudioDuration(file: File): Promise<number | null> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx && typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const duration = Math.round(decoded.duration * 1000);
      await ctx.close();
      return duration;
    }
  } catch {
    // Unsupported or decoding failed
  }
  return null;
}

interface UploadFields {
  file: File;
  id: string;
  name: string;
  index: number;
  bpm: number;
  keySig: string;
  genre: string;
  durationMs: number;
  loopStartMs: number;
  loopEndMs: number;
}

function buildUploadFormData(fields: UploadFields): FormData {
  const formData = new FormData();
  formData.append("audio", fields.file);
  formData.append("id", fields.id);
  formData.append("name", fields.name);
  formData.append("index", String(fields.index));
  formData.append("bpm", String(fields.bpm));
  formData.append("key", fields.keySig);
  formData.append("genre", fields.genre);
  formData.append("duration_ms", String(fields.durationMs));
  formData.append("loop_start_ms", String(fields.loopStartMs));
  formData.append("loop_end_ms", String(fields.loopEndMs));
  return formData;
}

async function postUploadRequest(
  formData: FormData,
): Promise<AdminTrackRecord> {
  const res = await fetch(API_ROUTES.ADMIN_TRACKS, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload track");
  return data.track as AdminTrackRecord;
}

function deriveTrackIndex(fileName: string, fallbackIndex: number) {
  const match = /(\d+)/.exec(fileName);
  const parsed = match ? Number(match[1]) : fallbackIndex;
  const index = parsed > 0 ? parsed : fallbackIndex;
  const label = String(index).padStart(2, "0");
  return { index, label, id: `track-${label}` };
}

function useUploadFormState(suggestedIndex = 1) {
  const [file, setFile] = useState<File | null>(null);
  const [index, setIndex] = useState(suggestedIndex);
  const [id, setId] = useState(
    `track-${String(suggestedIndex).padStart(2, "0")}`,
  );
  const [name, setName] = useState(String(suggestedIndex).padStart(2, "0"));
  const [bpm, setBpm] = useState(90);
  const [keySig, setKeySig] = useState("C minor");
  const [genre, setGenre] = useState("Boom Bap");
  const [durationMs, setDurationMs] = useState(60000);
  const [loopStartMs, setLoopStartMs] = useState(0);
  const [loopEndMs, setLoopEndMs] = useState(60000);

  const handleIndexChange = (newIndex: number) => {
    const valid = Math.max(1, newIndex);
    setIndex(valid);
    const label = String(valid).padStart(2, "0");
    setId(`track-${label}`);
    setName(label);
  };

  const reset = () => {
    setFile(null);
    handleIndexChange(index + 1);
  };

  return {
    file,
    setFile,
    index,
    setIndex: handleIndexChange,
    id,
    setId,
    name,
    setName,
    bpm,
    setBpm,
    keySig,
    setKeySig,
    genre,
    setGenre,
    durationMs,
    setDurationMs,
    loopStartMs,
    setLoopStartMs,
    loopEndMs,
    setLoopEndMs,
    reset,
  };
}

async function executeUpload(
  form: ReturnType<typeof useUploadFormState>,
  onTrackCreated: (track: AdminTrackRecord) => void,
): Promise<void> {
  const formData = buildUploadFormData({
    file: form.file as File,
    id: form.id,
    name: form.name,
    index: form.index,
    bpm: form.bpm,
    keySig: form.keySig,
    genre: form.genre,
    durationMs: form.durationMs,
    loopStartMs: form.loopStartMs,
    loopEndMs: form.loopEndMs,
  });
  const track = await postUploadRequest(formData);
  onTrackCreated(track);
  form.reset();
}

/**
 * Handles audio file selection, Web Audio client duration decoding, and upload submission.
 */
export function useAudioUpload(
  onTrackCreated: (track: AdminTrackRecord) => void,
  suggestedIndex = 1,
) {
  const form = useUploadFormState(suggestedIndex);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    form.setFile(selectedFile);
    const derived = deriveTrackIndex(selectedFile.name, form.index);
    form.setIndex(derived.index);

    void (async () => {
      const dur = await extractAudioDuration(selectedFile);
      if (dur !== null) {
        form.setDurationMs(dur);
        form.setLoopEndMs(dur);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) {
      setIsError(true);
      setStatusMessage("Please select an .m4a audio file to upload.");
      return;
    }

    setIsUploading(true);
    setIsError(false);
    setStatusMessage("Uploading and registering track...");

    try {
      const trackLabel = form.name;
      await executeUpload(form, onTrackCreated);
      setStatusMessage(
        `Track #${trackLabel} uploaded and created successfully!`,
      );
    } catch (err) {
      setIsError(true);
      setStatusMessage((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    index: form.index,
    id: form.id,
    name: form.name,
    bpm: form.bpm,
    keySig: form.keySig,
    genre: form.genre,
    durationMs: form.durationMs,
    loopStartMs: form.loopStartMs,
    loopEndMs: form.loopEndMs,
    isUploading,
    statusMessage,
    isError,
    setIndex: form.setIndex,
    setId: form.setId,
    setName: form.setName,
    setBpm: form.setBpm,
    setKeySig: form.setKeySig,
    setGenre: form.setGenre,
    setDurationMs: form.setDurationMs,
    setLoopStartMs: form.setLoopStartMs,
    setLoopEndMs: form.setLoopEndMs,
    handleFileChange,
    handleSubmit,
  };
}
