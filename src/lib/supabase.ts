import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

let supabaseClient: SupabaseClient | undefined;

/**
 * Returns a shared Supabase client for server routes.
 * Disables session storage and token refresh because server requests are stateless.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseClient) {
    const env = getServerEnv();
    supabaseClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return supabaseClient;
}
