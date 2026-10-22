/**
 * CRAP gate. Reads Istanbul coverage produced by `pnpm test:coverage`,
 * scores every function, prints a report and exits non-zero if any function
 * exceeds the threshold.
 *
 *   pnpm crap [--threshold 30] [--top 10] [--coverage <file>] [--json <file>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { FileCoverageData } from "./coverage";
import { findOffenders, formatReport, rankByCrap, scoreFile } from "./crap";

const { values } = parseArgs({
  options: {
    coverage: { type: "string", default: "coverage/coverage-final.json" },
    threshold: { type: "string", default: "30" },
    top: { type: "string", default: "10" },
    json: { type: "string", default: "reports/crap.json" },
  },
});

function loadCoverage(file: string): Record<string, FileCoverageData> {
  if (!existsSync(file)) {
    console.error(`No coverage found at ${file}. Run "pnpm test:coverage".`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(file, "utf8")) as Record<
    string,
    FileCoverageData
  >;
}

function main(): void {
  const threshold = Number(values.threshold);
  const coverage = loadCoverage(values.coverage);
  const entries = Object.entries(coverage).flatMap(([absolutePath, data]) =>
    scoreFile(
      path.relative(process.cwd(), absolutePath),
      readFileSync(absolutePath, "utf8"),
      data,
    ),
  );
  const offenders = findOffenders(entries, threshold);

  console.log(formatReport(entries, threshold, Number(values.top)));

  mkdirSync(path.dirname(values.json), { recursive: true });
  const report = { threshold, offenders, functions: rankByCrap(entries) };
  writeFileSync(values.json, `${JSON.stringify(report, null, 2)}\n`);

  process.exitCode = offenders.length > 0 ? 1 : 0;
}

main();
