import { describe, expect, it } from "vitest";
import type { FileCoverageData } from "./coverage";
import {
  crapScore,
  findOffenders,
  formatEntry,
  formatReport,
  rankByCrap,
  scoreFile,
} from "./crap";
import type { CrapEntry } from "./crap";

const entry = (overrides: Partial<CrapEntry>): CrapEntry => ({
  file: "src/a.ts",
  name: "fn",
  line: 1,
  complexity: 1,
  coverage: 1,
  crap: 1,
  ...overrides,
});

describe("crapScore", () => {
  it("equals complexity when fully covered", () => {
    expect(crapScore(7, 1)).toBe(7);
  });

  it("equals complexity² + complexity when untested", () => {
    expect(crapScore(5, 0)).toBe(30);
  });

  it("cubes the uncovered fraction", () => {
    expect(crapScore(10, 0.5)).toBe(22.5);
  });
});

describe("scoreFile", () => {
  const source = "export function pick(a) {\n  return a ? 1 : 2;\n}\n";
  const coverage: FileCoverageData = {
    path: "src/pick.ts",
    statementMap: {
      "0": { start: { line: 2, column: 2 }, end: { line: 2, column: 19 } },
    },
    s: { "0": 4 },
  };

  it("combines complexity and coverage per function", () => {
    expect(scoreFile("src/pick.ts", source, coverage)).toEqual([
      {
        file: "src/pick.ts",
        name: "pick",
        line: 1,
        complexity: 2,
        coverage: 1,
        crap: 2,
      },
    ]);
  });

  it("treats files without coverage data as untested", () => {
    const [scored] = scoreFile("src/pick.ts", source, undefined);
    expect(scored).toMatchObject({ coverage: 0, crap: 6 });
  });
});

describe("ranking", () => {
  const low = entry({ name: "low", crap: 2 });
  const high = entry({ name: "high", crap: 45 });
  const edge = entry({ name: "edge", crap: 30 });
  const entries = [low, high, edge];

  it("sorts by descending CRAP without mutating the input", () => {
    expect(rankByCrap(entries).map((e) => e.name)).toEqual([
      "high",
      "edge",
      "low",
    ]);
    expect(entries.map((e) => e.name)).toEqual(["low", "high", "edge"]);
  });

  it("flags only functions strictly above the threshold", () => {
    expect(findOffenders(entries, 30)).toEqual([high]);
  });
});

describe("formatting", () => {
  it("formats a single entry as an aligned row", () => {
    expect(
      formatEntry(
        entry({
          file: "src/x.ts",
          name: "mix",
          line: 12,
          complexity: 4,
          coverage: 0.456,
          crap: 7.6543,
        }),
      ),
    ).toBe("   7.7  cc= 4  cov= 46%  src/x.ts:12  mix");
  });

  it("reports success when nothing exceeds the threshold", () => {
    const report = formatReport([entry({ name: "ok" })], 30, 10);
    expect(report).toBe(
      [
        "CRAP report: 1 functions, threshold 30",
        "",
        "Top 1:",
        "   1.0  cc= 1  cov=100%  src/a.ts:1  ok",
        "",
        "✔ All functions are at or below CRAP 30.",
      ].join("\n"),
    );
  });

  it("limits the top list and lists every offender on failure", () => {
    const entries = [
      entry({ name: "a", crap: 31 }),
      entry({ name: "b", crap: 40 }),
      entry({ name: "c", crap: 3 }),
    ];
    const report = formatReport(entries, 30, 1);
    expect(report.split("\n")).toEqual([
      "CRAP report: 3 functions, threshold 30",
      "",
      "Top 1:",
      "  40.0  cc= 1  cov=100%  src/a.ts:1  b",
      "",
      "✖ 2 function(s) exceed CRAP 30. Add tests or reduce complexity:",
      "  40.0  cc= 1  cov=100%  src/a.ts:1  b",
      "  31.0  cc= 1  cov=100%  src/a.ts:1  a",
    ]);
  });
});
