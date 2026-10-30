import { describe, expect, it } from "vitest";
import { formatBeatNumber, formatTime, seedFromBeatId } from "./format";

describe("formatTime", () => {
  it("formats minutes and seconds with two-digit pads", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(61)).toBe("01:01");
    expect(formatTime(125.9)).toBe("02:05");
  });

  it("collapses invalid and negative values to 00:00", () => {
    expect(formatTime(-1)).toBe("00:00");
    expect(formatTime(Number.NaN)).toBe("00:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});

describe("seedFromBeatId", () => {
  it("parses numeric catalog ids as integers and treats empty or dash as 0", () => {
    expect(seedFromBeatId("0001")).toBe(1);
    expect(seedFromBeatId("0629")).toBe(629);
    expect(seedFromBeatId("")).toBe(0);
    expect(seedFromBeatId("—")).toBe(0);
  });

  it("hashes slugs to a stable unsigned integer", () => {
    expect(seedFromBeatId("track-a")).toBe(seedFromBeatId("track-a"));
    expect(seedFromBeatId("track-a")).not.toBe(seedFromBeatId("track-b"));
    expect(seedFromBeatId("track-a")).toBeGreaterThan(0);
    expect(seedFromBeatId("abc123")).not.toBe(123);
    expect(seedFromBeatId("123abc")).not.toBe(123);
  });
});

describe("formatBeatNumber", () => {
  it("pads numeric ids and seeds to two catalog digits", () => {
    expect(formatBeatNumber("0001")).toBe("01");
    expect(formatBeatNumber("0629")).toBe("29");
    expect(formatBeatNumber("1502")).toBe("02");
    expect(formatBeatNumber("1")).toBe("01");
    expect(formatBeatNumber(629)).toBe("29");
    expect(formatBeatNumber(0)).toBe("00");
    expect(formatBeatNumber("—")).toBe("00");
    expect(formatBeatNumber("")).toBe("00");
  });

  it("formats slugs from their deterministic seed", () => {
    const slug = formatBeatNumber("track-a");
    expect(slug).toMatch(/^\d{2}$/);
    expect(slug).toBe(formatBeatNumber(seedFromBeatId("track-a")));
    expect(formatBeatNumber("track-a")).not.toBe(formatBeatNumber("track-b"));
    expect(formatBeatNumber("x1")).not.toBe("01");
    expect(formatBeatNumber("1x")).not.toBe("01");
  });

  it("wraps large, negative, and fractional numbers into the two-digit catalog", () => {
    expect(formatBeatNumber(101)).toBe("01");
    expect(formatBeatNumber(-7)).toBe("07");
    expect(formatBeatNumber(7.9)).toBe("07");
    expect(formatBeatNumber(Number.NaN)).toBe("00");
  });
});
