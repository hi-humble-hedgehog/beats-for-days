import { describe, expect, it, vi } from "vitest";
import { applyVinylBrake, applyVinylScratch, applyVinylSpinUp } from "./vinyl";
import type {
  AudioBufferSourceNodeLike,
  GainNodeLike,
  AudioParamLike,
} from "./types";

function createMockAudioParam(initialValue = 1): AudioParamLike {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

function createMockSource(hasParam = true): AudioBufferSourceNodeLike {
  return {
    buffer: null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    playbackRate: hasParam ? createMockAudioParam(1) : undefined,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockGain(initialValue = 1): GainNodeLike {
  return {
    gain: createMockAudioParam(initialValue),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe("applyVinylSpinUp", () => {
  it("does nothing when source or playbackRate is absent", () => {
    expect(() =>
      applyVinylSpinUp({ source: null, startTime: 10 }),
    ).not.toThrow();

    const noParamSource = createMockSource(false);
    expect(() =>
      applyVinylSpinUp({ source: noParamSource, startTime: 10 }),
    ).not.toThrow();
  });

  it("schedules exponential ramp from startRate to 1.0", () => {
    const source = createMockSource(true);
    applyVinylSpinUp({
      source,
      startTime: 5,
      durationSec: 0.3,
      startRate: 0.2,
    });

    const param = source.playbackRate!;
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(5);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0.2, 5);
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(1, 5.3);
  });

  it("falls back to linear ramp when exponential ramp is absent", () => {
    const source = createMockSource(true);
    delete source.playbackRate!.exponentialRampToValueAtTime;

    applyVinylSpinUp({
      source,
      startTime: 2,
      durationSec: 0.25,
      startRate: 0.1,
    });

    const param = source.playbackRate!;
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(2);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0.1, 2);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 2.25);
  });

  it("falls back to setValueAtTime when neither ramp is available", () => {
    const source = createMockSource(true);
    delete source.playbackRate!.exponentialRampToValueAtTime;
    delete source.playbackRate!.linearRampToValueAtTime;

    applyVinylSpinUp({ source, startTime: 1 });
    const param = source.playbackRate!;
    expect(param.setValueAtTime).toHaveBeenCalledWith(1, 1);
  });

  it("uses default durationSec of 0.35s when unspecified", () => {
    const source = createMockSource(true);
    applyVinylSpinUp({ source, startTime: 1 });
    const param = source.playbackRate!;
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(1, 1.35);
  });
});

describe("applyVinylBrake", () => {
  it("does nothing when source is null", () => {
    expect(() =>
      applyVinylBrake({ source: null, gain: null, currentTime: 10 }),
    ).not.toThrow();
  });

  it("uses default durationSec of 0.75s when unspecified", () => {
    const source = createMockSource(true);
    const gain = createMockGain(1);

    applyVinylBrake({ source, gain, currentTime: 2 });
    expect(
      source.playbackRate!.exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(0.001, 2.75);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      2.75,
    );
    expect(source.stop).toHaveBeenCalledWith(2.75);
  });

  it("ramps down playbackRate and gain then schedules stop", () => {
    const source = createMockSource(true);
    const gain = createMockGain(1);

    applyVinylBrake({
      source,
      gain,
      currentTime: 10,
      durationSec: 0.4,
    });

    const rateParam = source.playbackRate!;
    expect(rateParam.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(rateParam.setValueAtTime).toHaveBeenCalledWith(1, 10);
    expect(rateParam.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      10.4,
    );

    const gainParam = gain.gain;
    expect(gainParam.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(gainParam.setValueAtTime).toHaveBeenCalledWith(1, 10);
    expect(gainParam.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      10.4,
    );

    expect(source.stop).toHaveBeenCalledWith(10.4);
  });

  it("falls back to linear ramps when exponential ramp is unavailable", () => {
    const source = createMockSource(true);
    const gain = createMockGain(1);
    delete source.playbackRate!.exponentialRampToValueAtTime;
    delete gain.gain.exponentialRampToValueAtTime;

    applyVinylBrake({
      source,
      gain,
      currentTime: 5,
      durationSec: 0.5,
    });

    expect(source.playbackRate!.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      5.5,
    );
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 5.5);
    expect(source.stop).toHaveBeenCalledWith(5.5);
  });

  it("safely catches errors if source.stop throws", () => {
    const source = createMockSource(true);
    source.stop = vi.fn().mockImplementation(() => {
      throw new Error("Already stopped");
    });

    expect(() =>
      applyVinylBrake({ source, gain: null, currentTime: 1 }),
    ).not.toThrow();
  });
});

describe("applyVinylScratch", () => {
  it("does nothing when source has no playbackRate", () => {
    const source = createMockSource(false);
    expect(() =>
      applyVinylScratch({ source, currentTime: 10, rateMultiplier: 1.5 }),
    ).not.toThrow();
  });

  it("modulates playbackRate to multiplier and back to 1.0", () => {
    const source = createMockSource(true);
    applyVinylScratch({
      source,
      currentTime: 10,
      rateMultiplier: 1.8,
      durationSec: 0.2,
    });

    const param = source.playbackRate!;
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(param.setValueAtTime).toHaveBeenCalledWith(1, 10);
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(1.8, 10.1);
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(1, 10.2);
  });

  it("clamps extreme multipliers to safe range", () => {
    const source = createMockSource(true);
    applyVinylScratch({
      source,
      currentTime: 0,
      rateMultiplier: 999,
      durationSec: 0.2,
    });

    const param = source.playbackRate!;
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(3, 0.1);
  });

  it("falls back to linear ramp when exponential ramp is absent", () => {
    const source = createMockSource(true);
    delete source.playbackRate!.exponentialRampToValueAtTime;

    applyVinylScratch({
      source,
      currentTime: 4,
      rateMultiplier: 1.5,
      durationSec: 0.2,
    });

    const param = source.playbackRate!;
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1.5, 4.1);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 4.2);
  });
});
