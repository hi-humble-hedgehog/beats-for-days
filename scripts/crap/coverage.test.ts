import { describe, expect, it } from "vitest";
import {
  functionCoverage,
  innermostSpanAt,
  lineStartsOf,
  toOffset,
} from "./coverage";
import type { FileCoverageData, Range } from "./coverage";

const at = (line: number, column: number | null): Range => ({
  start: { line, column },
  end: { line, column },
});

describe("lineStartsOf", () => {
  it("returns the offset of every line start", () => {
    expect(lineStartsOf("a\nbc\n")).toEqual([0, 2, 5]);
  });

  it("returns a single line for empty text", () => {
    expect(lineStartsOf("")).toEqual([0]);
  });

  it("handles CRLF line endings", () => {
    expect(lineStartsOf("a\r\nb")).toEqual([0, 3]);
  });
});

describe("toOffset", () => {
  const starts = lineStartsOf("abc\ndef\n");

  it("maps 1-based lines and 0-based columns to offsets", () => {
    expect(toOffset(starts, { line: 1, column: 0 })).toBe(0);
    expect(toOffset(starts, { line: 2, column: 1 })).toBe(5);
  });

  it("treats a null column as the start of the line", () => {
    expect(toOffset(starts, { line: 2, column: null })).toBe(4);
  });

  it("returns Infinity for lines outside the file", () => {
    expect(toOffset(starts, { line: 99, column: 0 })).toBe(Infinity);
  });
});

describe("innermostSpanAt", () => {
  const spans = [
    { start: 0, end: 100 },
    { start: 10, end: 50 },
    { start: 20, end: 30 },
  ];

  it("returns -1 when no span contains the offset", () => {
    expect(innermostSpanAt(spans, 100)).toBe(-1);
    expect(innermostSpanAt([], 0)).toBe(-1);
  });

  it("returns the smallest containing span regardless of order", () => {
    expect(innermostSpanAt(spans, 25)).toBe(2);
    expect(innermostSpanAt([...spans].reverse(), 25)).toBe(0);
    expect(innermostSpanAt(spans, 40)).toBe(1);
    expect(innermostSpanAt(spans, 5)).toBe(0);
  });

  it("includes the start offset and excludes the end offset", () => {
    expect(innermostSpanAt(spans, 20)).toBe(2);
    expect(innermostSpanAt(spans, 30)).toBe(1);
  });

  it("keeps the first span when two contain the offset with equal size", () => {
    const twins = [
      { start: 0, end: 10 },
      { start: 0, end: 10 },
    ];
    expect(innermostSpanAt(twins, 5)).toBe(0);
  });
});

describe("functionCoverage", () => {
  // line 1: "function outer() {"   offsets 0..18
  // line 2: "  a();"               offsets 19..25
  // line 3: "  const f = () => b();" offsets 26..48
  // line 4: "}"
  const source = "function outer() {\n  a();\n  const f = () => b();\n}\n";
  const starts = lineStartsOf(source);
  const outer = { start: 0, end: source.lastIndexOf("}") + 1 };
  const inner = {
    start: source.indexOf("() =>"),
    end: source.indexOf("b();") + 3,
  };

  const coverage = (s: Record<string, number>): FileCoverageData => ({
    path: "sample.ts",
    statementMap: {
      "0": at(2, 2), // a();             -> outer
      "1": at(3, 2), // const f = ...    -> outer
      "2": at(3, 18), // b()             -> inner
      "3": at(6, 0), // outside any function
    },
    s,
  });

  it("attributes statements to the innermost function", () => {
    const result = functionCoverage(
      [outer, inner],
      coverage({ "0": 1, "1": 0, "2": 3, "3": 0 }),
      starts,
    );
    expect(result).toEqual([0.5, 1]);
  });

  it("treats missing hit counts as not covered", () => {
    expect(
      functionCoverage([outer, inner], coverage({ "0": 1 }), starts),
    ).toEqual([0.5, 0]);
  });

  it("scores functions without statements as 0", () => {
    const empty = { start: 1000, end: 1010 };
    expect(
      functionCoverage([empty], coverage({ "0": 1, "1": 1 }), starts),
    ).toEqual([0]);
  });
});
