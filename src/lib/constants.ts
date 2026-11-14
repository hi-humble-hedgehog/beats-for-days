export const STORAGE_KEYS = {
  PLAYED_TRACKS: "beats_played_ids",
  INITIAL_BEAT: "beats_initial_beat",
  DEBUG_PANEL: "beats_debug_panel",
} as const;

export const LIMITS = {
  MAX_DEGREE_CAP: 8,
  REPEAT_COOLDOWN_WINDOW: 20,
} as const;

export const STARTER_BEAT_ID = "01";

export const ROUTES = {
  HOME: "/",
  BEAT: "/beat",
  ABOUT: "/about",
  PRIVACY: "/privacy",
  ADMIN: "/admin",
} as const;

export const API_ROUTES = {
  BEATS: "/api/beats",
  BEATS_NEXT: "/api/beats/next",
  ADMIN_TRACKS: "/api/admin/tracks",
} as const;
