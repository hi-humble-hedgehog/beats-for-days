export const STORAGE_KEYS = {
  PLAYED_TRACKS: "beats_played_ids",
  ORDER_HASH: "beats_order_hash",
  BYOK_KEY: "elevenlabs_api_key",
  DEBUG_PANEL: "beats_debug_panel",
} as const;

export const LIMITS = {
  MAX_DEGREE_CAP: 8,
  DAILY_GENERATION_CAP: 5,
  FREE_INVITES_POOL: 1500,
  CYCLE_TIMER_SECONDS: 5,
} as const;

export const ROUTES = {
  HOME: "/",
  BEATS: "/beats",
  BEAT: "/beat",
  GENERATE: "/generate",
  ABOUT: "/about",
  TERMS: "/privacy",
  PRIVACY: "/privacy",
} as const;

export const API_ROUTES = {
  BEATS: "/api/beats",
  BEATS_NEXT: "/api/beats/next",
  WAITLIST: "/api/waitlist",
} as const;
