import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSeedEnv } from "./env";

describe("loadSeedEnv", () => {
  const fixtureDir = path.resolve("test/fixtures/env-test");

  beforeEach(() => {
    delete process.env.TEST_SEED_ENV_VAR_LOCAL;
    delete process.env.TEST_SEED_ENV_VAR_BASE;
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
  });

  afterEach(() => {
    delete process.env.TEST_SEED_ENV_VAR_LOCAL;
    delete process.env.TEST_SEED_ENV_VAR_BASE;
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it("loads environment variables from .env.local in the specified directory", () => {
    fs.writeFileSync(
      path.join(fixtureDir, ".env.local"),
      "TEST_SEED_ENV_VAR_LOCAL=from_local\n",
    );

    loadSeedEnv(fixtureDir);

    expect(process.env.TEST_SEED_ENV_VAR_LOCAL).toBe("from_local");
  });

  it("falls back to .env if .env.local does not define the variable", () => {
    fs.writeFileSync(
      path.join(fixtureDir, ".env"),
      "TEST_SEED_ENV_VAR_BASE=from_base\n",
    );

    loadSeedEnv(fixtureDir);

    expect(process.env.TEST_SEED_ENV_VAR_BASE).toBe("from_base");
  });

  it("does not throw when no env files exist", () => {
    expect(() => loadSeedEnv(fixtureDir)).not.toThrow();
  });
});
