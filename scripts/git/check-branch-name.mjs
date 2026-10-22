#!/usr/bin/env node
/**
 * Verifies that the current git branch follows repo standards:
 * - Direct commits to 'main' or 'master' are disallowed.
 * - Branches must start with an accepted prefix: feat/, fix/, refactor/, perf/, test/, docs/, chore/
 */
import { execSync } from "node:child_process";

const ALLOWED_BRANCH_PREFIXES =
  /^(feat|fix|refactor|perf|test|docs|chore)\/[a-z0-9._-]+$/;
const PROTECTED_BRANCHES = new Set(["main", "master"]);

function getBranchName() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function main() {
  const branch = getBranchName();
  if (!branch || branch === "HEAD") {
    // Detached head (e.g. CI runner)
    return;
  }

  if (PROTECTED_BRANCHES.has(branch)) {
    console.error(`\n✖ Direct commits to "${branch}" are blocked.`);
    console.error("  Create a feature branch first:");
    console.error("    git checkout -b feat/your-feature-name\n");
    process.exit(1);
  }

  if (!ALLOWED_BRANCH_PREFIXES.test(branch)) {
    console.error(`\n✖ Invalid branch name: "${branch}".`);
    console.error("  Branches must follow: <type>/<description>");
    console.error(
      "  Types: feat/, fix/, refactor/, perf/, test/, docs/, chore/",
    );
    console.error("  Example: feat/audio-loop-scheduler\n");
    process.exit(1);
  }
}

main();
