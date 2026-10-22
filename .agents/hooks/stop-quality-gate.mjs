#!/usr/bin/env node
/**
 * Antigravity Stop hook: see .agents/hooks.json and
 * docs/decisions/0005-agent-guidelines.md.
 *
 * When an agent tries to end its turn with uncommitted code changes, run the
 * fast checks (typecheck + ESLint on the changed files). If they fail, send
 * the agent back to fix them. Gives up after MAX_ATTEMPTS consecutive
 * failures so it can never trap the agent in a loop.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MAX_ATTEMPTS = 3;
const MAX_OUTPUT_CHARS = 4000;
const CODE_FILE = /^(src|scripts|test)\/.+\.(ts|tsx|mts|js|mjs)$/;
const root = path.resolve(import.meta.dirname, "../..");

function respond(result) {
  process.stdout.write(JSON.stringify(result));
}

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

/** Runs a command in the repo root. Missing tools count as a pass (CI still enforces). */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.error) return { ok: true, output: "" };
  return {
    ok: result.status === 0,
    output: `${result.stdout}${result.stderr}`.trim(),
  };
}

function changedCodeFiles() {
  const { output } = run("git", ["status", "--porcelain", "-uall"]);
  return output
    .split("\n")
    .map((line) => line.slice(3).split(" -> ").at(-1).trim())
    .filter((file) => CODE_FILE.test(file))
    .filter((file) => existsSync(path.join(root, file)));
}

function checks(files) {
  return [
    { name: "pnpm typecheck", ...run("pnpm", ["-s", "typecheck"]) },
    {
      name: "eslint (changed files)",
      ...run("pnpm", [
        "exec",
        "eslint",
        "--max-warnings=0",
        "--no-warn-ignored",
        ...files,
      ]),
    },
  ];
}

function buildReason(failures, attempt) {
  const details = failures
    .map((f) => `## ${f.name}\n${f.output.slice(-MAX_OUTPUT_CHARS)}`)
    .join("\n\n");
  return [
    `Quality gate failed on your uncommitted changes (attempt ${attempt}/${MAX_ATTEMPTS}).`,
    "Fix these before finishing, or explain to the user why they can't be fixed.",
    "",
    details,
  ].join("\n");
}

function readAttempts(file) {
  return existsSync(file) ? Number(readFileSync(file, "utf8")) || 0 : 0;
}

function main() {
  const input = readInput();
  const isNormalStop =
    (input.terminationReason ?? "NO_TOOL_CALL") === "NO_TOOL_CALL";
  const files = changedCodeFiles();
  if (!isNormalStop || files.length === 0) return respond({});
  if (!existsSync(path.join(root, "node_modules"))) return respond({});

  const counter = path.join(
    tmpdir(),
    `bfd-stop-gate-${input.conversationId ?? "default"}`,
  );
  const failures = checks(files).filter((check) => !check.ok);
  const attempt = readAttempts(counter) + 1;

  if (failures.length === 0 || attempt > MAX_ATTEMPTS) {
    rmSync(counter, { force: true });
    return respond({});
  }
  writeFileSync(counter, String(attempt));
  return respond({
    decision: "continue",
    reason: buildReason(failures, attempt),
  });
}

main();
