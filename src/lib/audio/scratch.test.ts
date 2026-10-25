import { describe, expect, it, vi } from "vitest";
import {
  createReversedAudioBuffer,
  createScratchSession,
  ScratchController,
  stopScratchSession,
  updateScratchSession,
} from "./scratch";
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  GainNodeLike,
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

function createMockSource(): AudioBufferSourceNodeLike {
  return {
    buffer: null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    playbackRate: createMockAudioParam(1),
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockGain(): GainNodeLike {
  return {
    gain: createMockAudioParam(1),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

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

describe("createReversedAudioBuffer", () => {
  it("inverts channel samples backwards", () => {
    const ctx = createTestContext();
    const buf = createTestBuffer([[1, 2, 3, 4]]);
    const rev = createReversedAudioBuffer(ctx, buf);

    expect(rev).not.toBeNull();
    expect(Array.from(rev!.getChannelData!(0))).toEqual([4, 3, 2, 1]);
  });

  it("handles null cases for empty or invalid buffer", () => {
    const ctx = createTestContext();
    const emptyBuf = createTestBuffer([[]]);
    expect(createReversedAudioBuffer(ctx, emptyBuf)).toBeNull();
  });
});

describe("ScratchSession & updateScratchSession", () => {
  it("creates session, responds to forward and reverse velocity, and stops cleanly", () => {
    const ctx = createTestContext();
    const forwardBuf = {
      duration: 60,
      length: 60000,
      numberOfChannels: 1,
      sampleRate: 1000,
      getChannelData: () => new Float32Array(60000),
    };
    const reverseBuf = {
      duration: 60,
      length: 60000,
      numberOfChannels: 1,
      sampleRate: 1000,
      getChannelData: () => new Float32Array(60000),
    };
    const outputNode: AudioNodeLike = createMockGain();

    const session = createScratchSession({
      ctx,
      forwardBuffer: forwardBuf,
      reverseBuffer: reverseBuf,
      outputNode,
      initialPositionSec: 0.002,
    });

    expect(session.positionSec).toBe(0.002);
    expect(session.direction).toBe("idle");

    // 1. Move forward at 1.5x speed
    updateScratchSession(session, 1.5, 0.01);
    expect(session.direction).toBe("forward");
    expect(session.positionSec).toBeCloseTo(0.002 + 1.5 * 0.01, 4);

    // 2. Move reverse at -2.0x speed
    updateScratchSession(session, -2.0, 0.01);
    expect(session.direction).toBe("reverse");

    // 3. Low velocity idle threshold (< 0.05)
    updateScratchSession(session, 0.02, 0.01);
    expect(session.direction).toBe("idle");

    // 4. Stop session
    const finalPos = stopScratchSession(session);
    expect(finalPos).toBe(session.positionSec);
  });
});

describe("ScratchController", () => {
  it("coordinates full scratch lifecycle across start, update, stop, and reset", () => {
    const ctx = createTestContext();
    const forwardBuf = createTestBuffer([[10, 20, 30, 40]], 1000);
    const outputNode: AudioNodeLike = createMockGain();
    const controller = new ScratchController();

    controller.start(ctx, forwardBuf, outputNode, 0.001);
    controller.update(1.2, 0.02);
    const finalPos = controller.stop();

    expect(finalPos).not.toBeNull();
    expect(finalPos).toBeGreaterThan(0.001);

    controller.reset();
  });
});
