import { extractFunctions } from "./complexity";
import { functionCoverage, lineStartsOf } from "./coverage";
import type { FileCoverageData } from "./coverage";

/**
 * CRAP (Change Risk Anti-Patterns) score for a single function:
 *
 *   CRAP(m) = comp(m)^2 * (1 - cov(m))^3 + comp(m)
 *
 * where comp is cyclomatic complexity and cov is test coverage (0..1).
 * A fully covered function scores exactly its complexity; an untested one
 * scores comp^2 + comp. Above 30 is conventionally considered "crappy".
 */
export function crapScore(complexity: number, coverage: number): number {
  return complexity ** 2 * (1 - coverage) ** 3 + complexity;
}

export interface CrapEntry {
  file: string;
  name: string;
  line: number;
  complexity: number;
  coverage: number;
  crap: number;
}

/** Scores every function in one file. Missing coverage counts as 0%. */
export function scoreFile(
  file: string,
  sourceText: string,
  coverage: FileCoverageData | undefined,
): CrapEntry[] {
  const functions = extractFunctions(file, sourceText);
  const coverages = coverage
    ? functionCoverage(functions, coverage, lineStartsOf(sourceText))
    : [];
  return functions.map((fn, index) => {
    const covered = coverages[index] ?? 0;
    return {
      file,
      name: fn.name,
      line: fn.line,
      complexity: fn.complexity,
      coverage: covered,
      crap: crapScore(fn.complexity, covered),
    };
  });
}

/** Highest CRAP first. Does not mutate the input. */
export function rankByCrap(entries: readonly CrapEntry[]): CrapEntry[] {
  return [...entries].sort((a, b) => b.crap - a.crap);
}

export function findOffenders(
  entries: readonly CrapEntry[],
  threshold: number,
): CrapEntry[] {
  return rankByCrap(entries).filter((entry) => entry.crap > threshold);
}

export function formatEntry(entry: CrapEntry): string {
  const crap = entry.crap.toFixed(1).padStart(6);
  const complexity = String(entry.complexity).padStart(2);
  const coverage = `${Math.round(entry.coverage * 100)}%`.padStart(4);
  return `${crap}  cc=${complexity}  cov=${coverage}  ${entry.file}:${entry.line}  ${entry.name}`;
}

export function formatReport(
  entries: readonly CrapEntry[],
  threshold: number,
  top: number,
): string {
  const ranked = rankByCrap(entries);
  const offenders = findOffenders(entries, threshold);
  const lines = [
    `CRAP report: ${entries.length} functions, threshold ${threshold}`,
    "",
    `Top ${Math.min(top, ranked.length)}:`,
    ...ranked.slice(0, top).map(formatEntry),
    "",
  ];
  if (offenders.length === 0) {
    lines.push(`✔ All functions are at or below CRAP ${threshold}.`);
  } else {
    lines.push(
      `✖ ${offenders.length} function(s) exceed CRAP ${threshold}. Add tests or reduce complexity:`,
      ...offenders.map(formatEntry),
    );
  }
  return lines.join("\n");
}
