/**
 * Minimal subset of Istanbul's `coverage-final.json` per-file format
 * (what `vitest --coverage` writes with the `json` reporter).
 */
export interface Position {
  /** 1-based line. */
  line: number;
  /** 0-based column. Istanbul may emit `null`. */
  column: number | null;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface FileCoverageData {
  path: string;
  statementMap: Record<string, Range>;
  /** Execution count per statement id. */
  s: Record<string, number>;
}

export interface Span {
  start: number;
  end: number;
}

/** Character offset at which every line of `text` starts. */
export function lineStartsOf(text: string): number[] {
  const starts = [0];
  for (const newline of text.matchAll(/\n/g)) starts.push(newline.index + 1);
  return starts;
}

/** Converts an Istanbul position to a character offset (Infinity if out of range). */
export function toOffset(
  lineStarts: readonly number[],
  position: Position,
): number {
  const lineStart = lineStarts[position.line - 1] ?? Number.POSITIVE_INFINITY;
  return lineStart + (position.column ?? 0);
}

/** Index of the smallest span containing `offset`, or -1 if none does. */
export function innermostSpanAt(
  spans: readonly Span[],
  offset: number,
): number {
  let best = -1;
  let bestSize = Number.POSITIVE_INFINITY;
  spans.forEach((span, index) => {
    const size = span.end - span.start;
    if (offset >= span.start && offset < span.end && size < bestSize) {
      best = index;
      bestSize = size;
    }
  });
  return best;
}

/**
 * Statement coverage (0..1) per function. Each statement is attributed to
 * the innermost function containing it, so nested callbacks don't inflate
 * or dilute their parent's coverage. Functions without statements score 0.
 */
export function functionCoverage(
  functions: readonly Span[],
  coverage: FileCoverageData,
  lineStarts: readonly number[],
): number[] {
  const totals = functions.map(() => ({ total: 0, covered: 0 }));
  for (const [id, range] of Object.entries(coverage.statementMap)) {
    const owner = innermostSpanAt(functions, toOffset(lineStarts, range.start));
    const bucket = totals[owner];
    if (!bucket) continue;
    bucket.total += 1;
    if ((coverage.s[id] ?? 0) > 0) bucket.covered += 1;
  }
  return totals.map(({ total, covered }) =>
    total === 0 ? 0 : covered / total,
  );
}
