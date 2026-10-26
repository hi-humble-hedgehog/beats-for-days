import type {
  AudioBufferSourceNodeLike,
  AudioParamLike,
  GainNodeLike,
} from "./types";

export interface VinylSpinUpOptions {
  source: AudioBufferSourceNodeLike | null;
  startTime: number;
  durationSec?: number;
  startRate?: number;
}

export interface VinylBrakeOptions {
  source: AudioBufferSourceNodeLike | null;
  gain: GainNodeLike | null;
  currentTime: number;
  durationSec?: number;
}

function rampParamDown(
  param: AudioParamLike | undefined,
  currentTime: number,
  stopTime: number,
): void {
  if (!param) return;
  try {
    const currentVal = Math.max(0.001, param.value || 1.0);
    param.cancelScheduledValues(currentTime);
    param.setValueAtTime(currentVal, currentTime);

    if (typeof param.exponentialRampToValueAtTime === "function") {
      param.exponentialRampToValueAtTime(0.001, stopTime);
    } else if (typeof param.linearRampToValueAtTime === "function") {
      param.linearRampToValueAtTime(0, stopTime);
    }
  } catch {
    // Ignore parameter schedule conflicts in hardware nodes
  }
}

/**
 * Automates playback rate spin-up to recreate authentic turntable motor start inertia.
 * Ramps smoothly from a low pitch up to normal playback speed.
 */
export function applyVinylSpinUp(options: VinylSpinUpOptions): void {
  const { source, startTime, durationSec = 0.35, startRate = 0.25 } = options;
  if (!source?.playbackRate) return;

  try {
    const rate = source.playbackRate;
    const safeStart = Math.max(0.001, startRate);
    rate.cancelScheduledValues(startTime);
    rate.setValueAtTime(safeStart, startTime);

    if (typeof rate.exponentialRampToValueAtTime === "function") {
      rate.exponentialRampToValueAtTime(1.0, startTime + durationSec);
    } else if (typeof rate.linearRampToValueAtTime === "function") {
      rate.linearRampToValueAtTime(1.0, startTime + durationSec);
    } else {
      rate.setValueAtTime(1.0, startTime);
    }
  } catch {
    // Ignore parameter schedule conflicts
  }
}

/**
 * Automates turntable motor brake on playback pause or track stop.
 * Drops playback pitch and volume exponentially to mimic turntable power-down without digital clicks.
 */
export function applyVinylBrake(options: VinylBrakeOptions): void {
  const { source, gain, currentTime, durationSec = 0.75 } = options;
  if (!source) return;

  const stopTime = currentTime + durationSec;

  rampParamDown(source.playbackRate, currentTime, stopTime);
  rampParamDown(gain?.gain, currentTime, stopTime);

  try {
    source.stop(stopTime);
  } catch {
    // Gracefully catch if node was already stopped
  }
}
