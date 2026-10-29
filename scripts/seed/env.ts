import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Loads environment variables from local env files into process.env for CLI commands.
 * Prioritizes .env.local over .env without overriding already defined environment variables.
 */
export function loadSeedEnv(rootDir = process.cwd()): void {
  if (typeof process.loadEnvFile !== "function") return;

  for (const file of [".env.local", ".env"]) {
    const fullPath = path.resolve(rootDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        process.loadEnvFile(fullPath);
      } catch (err) {
        console.warn(
          `Warning: failed to parse ${file}: ${(err as Error).message}`,
        );
      }
    }
  }
}
