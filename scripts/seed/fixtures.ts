export interface SeedTrack {
  id: string;
  name: string;
  bpm: number;
  key: string;
  genre: string;
  leadInstrument?: string;
  counterInstrument?: string;
  fileName: string;
  durationMs: number;
  loopStartMs: number;
  loopEndMs: number;
  loopDurationMs: number;
  isActive?: boolean;
  index?: number;
}

export interface SeedTransition {
  id: string;
  from: string;
  to: string;
  fileName: string;
  timing: {
    handleMs: number;
    crossfadeMs: number;
    glueMs: number;
    landMs: number;
  };
  recipeVersion?: string;
}

export const SEED_TRACKS: SeedTrack[] = [
  {
    id: "track-a",
    name: "Soul Rhodes & Piano",
    bpm: 86,
    key: "G minor",
    genre: "Soul",
    leadInstrument: "Rhodes Piano",
    counterInstrument: "Low-Note Piano",
    fileName: "track-a-soul-rhodes.m4a",
    durationMs: 61395,
    loopStartMs: 8372,
    loopEndMs: 50233,
    loopDurationMs: 41861,
  },
  {
    id: "track-b",
    name: "Jazz Flute & Vibraphone",
    bpm: 86,
    key: "C Dorian",
    genre: "Jazz",
    leadInstrument: "Jazz Flute",
    counterInstrument: "Vibraphone",
    fileName: "track-b-jazz-flute.m4a",
    durationMs: 66976,
    loopStartMs: 16743,
    loopEndMs: 55814,
    loopDurationMs: 39071,
  },
  {
    id: "track-c",
    name: "Soul Trumpet & Saxophone",
    bpm: 94,
    key: "G minor",
    genre: "Soul",
    leadInstrument: "Muted Trumpet",
    counterInstrument: "Tenor Saxophone",
    fileName: "track-c-soul-trumpet.m4a",
    durationMs: 51064,
    loopStartMs: 10213,
    loopEndMs: 45958,
    loopDurationMs: 35745,
  },
];

export const SEED_TRANSITIONS: SeedTransition[] = [
  {
    id: "track-a-to-track-b",
    from: "track-a",
    to: "track-b",
    fileName: "track-a-to-track-b.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7206.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-b-to-track-a",
    from: "track-b",
    to: "track-a",
    fileName: "track-b-to-track-a.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7506.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-a-to-track-c",
    from: "track-a",
    to: "track-c",
    fileName: "track-a-to-track-c.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7605.3, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-c-to-track-a",
    from: "track-c",
    to: "track-a",
    fileName: "track-c-to-track-a.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 11002.7, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-b-to-track-c",
    from: "track-b",
    to: "track-c",
    fileName: "track-b-to-track-c.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7508, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
  {
    id: "track-c-to-track-b",
    from: "track-c",
    to: "track-b",
    fileName: "track-c-to-track-b.m4a",
    timing: { handleMs: 250, crossfadeMs: 100, glueMs: 6001.3, landMs: 0 },
    recipeVersion: "v12-intro-c4",
  },
];
