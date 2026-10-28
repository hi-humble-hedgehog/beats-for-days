export const STORAGE_KEYS = {
  PLAYED_TRACKS: "beats_played_ids",
  ORDER_HASH: "beats_order_hash",
  BYOK_KEY: "elevenlabs_api_key",
  DEBUG_PANEL: "beats_debug_panel",
} as const;

export const LIMITS = {
  MAX_DEGREE_CAP: 8,
  REPEAT_COOLDOWN_WINDOW: 20,
  DAILY_GENERATION_CAP: 5,
  FREE_INVITES_POOL: 1500,
  CYCLE_TIMER_SECONDS: 5,
} as const;

export const STARTER_BEAT_ID = "01";

export const ROUTES = {
  HOME: "/",
  BEATS: "/beats",
  BEAT: "/beat",
  GENERATE: "/generate",
  ABOUT: "/about",
  TERMS: "/privacy",
  PRIVACY: "/privacy",
  ADMIN: "/admin",
} as const;

export const API_ROUTES = {
  BEATS: "/api/beats",
  BEATS_NEXT: "/api/beats/next",
  WAITLIST: "/api/waitlist",
  ADMIN_TRACKS: "/api/admin/tracks",
} as const;
