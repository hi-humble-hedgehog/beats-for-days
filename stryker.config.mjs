/**
 * Mutation testing (StrykerJS). Rationale & policy:
 * docs/decisions/0003-testing-strategy.md and docs/guides/testing.md
 */
const config = {
  packageManager: "pnpm",
  // Explicit: pnpm's isolated node_modules defeats Stryker's plugin auto-discovery.
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker",
  ],
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.mts" },
  // Next generates global route types (e.g. LayoutProps) into .next/types.
  buildCommand: "pnpm exec next typegen",
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",

  // Logic lives in .ts files and is mutation-tested; .tsx stays presentational.
  mutate: [
    "src/**/*.ts",
    "scripts/**/*.ts",
    "!**/*.test.ts",
    "!**/*.d.ts",
    "!scripts/**/cli.ts",
  ],

  // Only re-test mutants in code/tests that changed since the last run.
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",

  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },

  thresholds: { high: 90, low: 80, break: 75 },
};

export default config;
