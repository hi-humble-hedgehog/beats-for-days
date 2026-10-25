import { describe, expect, it, vi } from "vitest";
import { applyVinylBrake, applyVinylScratch, applyVinylSpinUp } from "./vinyl";
import {
  createReversedAudioBuffer,
  scheduleBabyScratchDrop,
} from "./baby-scratch";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
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
});

describe("applyVinylBrake", () => {
  it("does nothing when source is null", () => {
    expect(() =>
      applyVinylBrake({ source: null, gain: null, currentTime: 10 }),
    ).not.toThrow();
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

describe("createReversedAudioBuffer", () => {
  function createTestBuffer(
    channelsData: number[][],
    sampleRate = 1000,
  ): AudioBufferLike {
    const channelArrays = channelsData.map((arr) => new Float32Array(arr));
    const firstLength = channelArrays[0]?.length ?? 0;
    return {
      duration: firstLength / sampleRate,
      length: firstLength,
      numberOfChannels: channelArrays.length,
      sampleRate,
      getChannelData: (ch: number) => channelArrays[ch] ?? new Float32Array(0),
    };
  }

  function createTestContext(): AudioContextLike {
    return {
      currentTime: 0,
      state: "running",
      destination: { connect: vi.fn(), disconnect: vi.fn() },
      createGain: () => createMockGain(),
      createBufferSource: () => createMockSource(),
      createBuffer: (
        channels: number,
        length: number,
        sampleRate: number,
      ): AudioBufferLike => {
        const arrays: Float32Array[] = [];
        for (let i = 0; i < channels; i++) {
          arrays.push(new Float32Array(length));
        }
        return {
          duration: length / sampleRate,
          length,
          numberOfChannels: channels,
          sampleRate,
          getChannelData: (ch: number) => arrays[ch] ?? new Float32Array(0),
        };
      },
      resume: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("returns null if ctx lacks createBuffer or source lacks getChannelData or is empty", () => {
    const ctx = createTestContext();
    const buf = createTestBuffer([[1, 2, 3]]);

    const noCreateBufferCtx = { ...ctx, createBuffer: undefined };
    expect(createReversedAudioBuffer(noCreateBufferCtx, buf)).toBeNull();

    const noGetChannelDataBuf = { ...buf, getChannelData: undefined };
    expect(createReversedAudioBuffer(ctx, noGetChannelDataBuf)).toBeNull();

    const emptyBuf = createTestBuffer([[]]);
    expect(createReversedAudioBuffer(ctx, emptyBuf)).toBeNull();
  });

  it("reverses audio channel data backwards correctly", () => {
    const ctx = createTestContext();
    const buf = createTestBuffer([
      [10, 20, 30, 40],
      [100, 200, 300, 400],
    ]);

    const reversed = createReversedAudioBuffer(ctx, buf);
    expect(reversed).not.toBeNull();
    expect(Array.from(reversed!.getChannelData!(0))).toEqual([40, 30, 20, 10]);
    expect(Array.from(reversed!.getChannelData!(1))).toEqual([
      400, 300, 200, 100,
    ]);
  });

  it("reverses a specific time slice given startSec and durationSec", () => {
    const ctx = createTestContext();
    // sampleRate = 1000, 1 sample = 0.001s
    const buf = createTestBuffer([[0, 10, 20, 30, 40, 50, 60]], 1000);

    // Slice from 0.002s (index 2) for 0.003s (3 samples: 20, 30, 40)
    const reversed = createReversedAudioBuffer(ctx, buf, {
      startSec: 0.002,
      durationSec: 0.003,
    });
    expect(reversed).not.toBeNull();
    expect(reversed!.length).toBe(3);
    expect(Array.from(reversed!.getChannelData!(0))).toEqual([40, 30, 20]);
  });
});

describe("scheduleBabyScratchDrop", () => {
  it("schedules alternating forward and reverse strokes aligned to 4th notes based on BPM", () => {
    const createdSources: AudioBufferSourceNodeLike[] = [];
    const createdGains: GainNodeLike[] = [];

    const mockCtx: AudioContextLike = {
      currentTime: 10,
      state: "running",
      destination: { connect: vi.fn(), disconnect: vi.fn() },
      createBufferSource: () => {
        const s = createMockSource(true);
        createdSources.push(s);
        return s;
      },
      createGain: () => {
        const g = createMockGain();
        createdGains.push(g);
        return g;
      },
      resume: vi.fn().mockResolvedValue(undefined),
    };

    const forwardBuffer = {
      duration: 60,
      length: 60000,
      numberOfChannels: 2,
      sampleRate: 1000,
    };
    const reverseBuffer = {
      duration: 2.0,
      length: 2000,
      numberOfChannels: 2,
      sampleRate: 1000,
    };
    const outputNode: GainNodeLike = createMockGain();

    // At 120 BPM, a 4th note (quarter note) is 60 / 120 = 0.5 seconds
    const result = scheduleBabyScratchDrop({
      ctx: mockCtx,
      forwardBuffer,
      reverseBuffer,
      outputNode,
      startTime: 10,
      offsetSec: 0,
      bpm: 120,
    });

    // 4 strokes (forward, reverse, forward, reverse) created
    expect(createdSources).toHaveLength(4);
    expect(createdGains).toHaveLength(4);

    // Release time should be startTime + 4 * 0.5 = 12.0s
    expect(result.releaseTime).toBeCloseTo(12.0, 4);
    expect(result.strokeNodes).toHaveLength(4);

    // Stroke 0: forward
    expect(createdSources[0]?.start).toHaveBeenCalledWith(10, 0, 0.5);
    // Stroke 1: reverse
    expect(createdSources[1]?.start).toHaveBeenCalledWith(10.5, 0, 0.5);
    // Stroke 2: forward
    expect(createdSources[2]?.start).toHaveBeenCalledWith(11.0, 0, 0.5);
    // Stroke 3: reverse
    expect(createdSources[3]?.start).toHaveBeenCalledWith(11.5, 0, 0.5);
  });

  it("defaults to 90 BPM when bpm is missing or invalid", () => {
    const mockCtx: AudioContextLike = {
      currentTime: 0,
      state: "running",
      destination: { connect: vi.fn(), disconnect: vi.fn() },
      createBufferSource: () => createMockSource(true),
      createGain: () => createMockGain(),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    const dummyBuf = {
      duration: 10,
      length: 10000,
      numberOfChannels: 1,
      sampleRate: 1000,
    };

    // 60 / 90 = 2/3s per stroke, 4 strokes = 8/3s (~2.6667s)
    const result = scheduleBabyScratchDrop({
      ctx: mockCtx,
      forwardBuffer: dummyBuf,
      reverseBuffer: dummyBuf,
      outputNode: createMockGain(),
      startTime: 0,
      bpm: 0,
    });

    expect(result.releaseTime).toBeCloseTo(8 / 3, 4);
  });
});
