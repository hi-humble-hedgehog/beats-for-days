import "server-only";
import { z } from "zod";

/**
 * Server-side environment contract. Add every new variable here (and to
 * .env.example) so a misconfigured deployment fails fast with a clear error.
 */
const serverEnvSchema = z.object({
  ELEVENLABS_API_KEY: z.string().trim().min(1, "is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid server environment:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Lazily validated so `next build` doesn't require runtime secrets. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
