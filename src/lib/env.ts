import "server-only";
import { z } from "zod";

/**
 * Server-side environment contract. Add every new variable here (and to
 * .env.example) so a misconfigured deployment fails fast with a clear error.
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    ALLOW_LIVE_AI_CALLS: z
      .enum(["true", "false"])
      .default("false")
      .transform((val) => val === "true"),
    ELEVENLABS_API_KEY: z
      .string()
      .trim()
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
    SUPABASE_URL: z.string().url().default("http://127.0.0.1:54521"),
    SUPABASE_ANON_KEY: z
      .string()
      .default("sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .default("sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"),
    USE_LOCAL_AUDIO: z.enum(["true", "false"]).optional(),
    // Shows the playback debug panel to visitors who add `?debug=1`. Off by default.
    DEBUG_PANEL: z
      .enum(["true", "false"])
      .default("false")
      .transform((val) => val === "true"),
    AUTO_TRANSITION_RESOLVE_SECONDS: z
      .string()
      .default("30")
      .transform((val, ctx) => {
        const num = Number(val);
        if (!Number.isFinite(num) || num <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "must be a positive number",
          });
          return z.NEVER;
        }
        return num;
      }),
  })
  .transform((env) => {
    const isProd = (env.NODE_ENV ?? process.env.NODE_ENV) === "production";
    const useLocalAudio =
      env.USE_LOCAL_AUDIO !== undefined
        ? env.USE_LOCAL_AUDIO === "true"
        : !isProd;

    return {
      ALLOW_LIVE_AI_CALLS: env.ALLOW_LIVE_AI_CALLS,
      ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      USE_LOCAL_AUDIO: useLocalAudio,
      AUTO_TRANSITION_RESOLVE_SECONDS: env.AUTO_TRANSITION_RESOLVE_SECONDS,
      DEBUG_PANEL: env.DEBUG_PANEL,
    };
  })
  .refine(
    (env) => !env.ALLOW_LIVE_AI_CALLS || Boolean(env.ELEVENLABS_API_KEY),
    {
      message: "is required when ALLOW_LIVE_AI_CALLS=true",
      path: ["ELEVENLABS_API_KEY"],
    },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Checks an object of environment variables against the server schema.
 * Takes `source` as an argument so tests can run without changing `process.env`.
 */
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

/**
 * Validates `process.env` on first call and caches the result.
 * Runs lazily so `next build` succeeds even when runtime secrets are not set.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
