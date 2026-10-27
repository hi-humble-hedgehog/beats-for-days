import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BeatPage from "./page";
import { BeatDeck } from "./BeatDeck";
import { AppChrome } from "@/components/layout/AppChrome";

const mockUseParams = vi.fn();
const mockUsePathname = vi.fn();
const mockTogglePlay = vi.fn();
const mockAdvanceTrack = vi.fn();
const mockSkip = vi.fn();
const mockCommitBeat = vi.fn();
const mockHydrateBeat = vi.fn();
const mockNotFound = vi.fn();
const mockFetchBeatViewById = vi.fn();

let mockPlayerState = {
  current: null as { id: string; name: string; durationMs?: number } | null,
  activePathname: undefined as string | undefined,
  notFoundBeatId: null as string | null,
  isPlaying: false,
  secondsRemaining: 30,
  positionSec: 0,
  muted: false,
  togglePlay: mockTogglePlay,
  advanceTrack: mockAdvanceTrack,
  skip: mockSkip,
  commitBeat: mockCommitBeat,
  hydrateBeat: mockHydrateBeat,
  previous: vi.fn(),
  seek: vi.fn(),
  toggleMute: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/tracks", () => ({
  fetchBeatViewById: (id: string) => mockFetchBeatViewById(id),
}));

vi.mock("@/components/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => mockPlayerState,
}));

vi.mock("@/components/audio/useStartPlayback", () => ({
  useStartPlayback: () => vi.fn(),
}));

describe("BeatPage (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/beat/0001");
  });

  it("calls notFound() when fetchBeatViewById returns null", async () => {
    mockFetchBeatViewById.mockResolvedValue(null);

    await expect(
      BeatPage({ params: Promise.resolve({ slug: "missing-beat" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockFetchBeatViewById).toHaveBeenCalledWith("missing-beat");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("renders BeatDeck with the server-fetched initialBeat when fetchBeatViewById resolves a beat", async () => {
    const serverBeat = {
      id: "0001",
      name: "Brooklyn Sunset",
      audioUrl: "http://storage/1.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    };
    mockFetchBeatViewById.mockResolvedValue(serverBeat);
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = serverBeat;

    const ui = await BeatPage({ params: Promise.resolve({ slug: "0001" }) });
    render(<AppChrome>{ui}</AppChrome>);

    expect(mockFetchBeatViewById).toHaveBeenCalledWith("0001");
    expect(mockHydrateBeat).toHaveBeenCalledWith(serverBeat);
    expect(mockCommitBeat).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Now playing beat number 01"),
    ).toBeInTheDocument();
  });
});

describe("BeatDeck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState = {
      current: null,
      activePathname: undefined,
      notFoundBeatId: null,
      isPlaying: false,
      secondsRemaining: 30,
      positionSec: 0,
      muted: false,
      togglePlay: mockTogglePlay,
      advanceTrack: mockAdvanceTrack,
      skip: mockSkip,
      commitBeat: mockCommitBeat,
      hydrateBeat: mockHydrateBeat,
      previous: vi.fn(),
      seek: vi.fn(),
      toggleMute: vi.fn(),
    };
  });

  it("renders the poster player for a loading slug", () => {
    mockUseParams.mockReturnValue({ slug: "0002" });
    mockUsePathname.mockReturnValue("/beat/0002");
    render(
      <AppChrome>
        <BeatDeck />
      </AppChrome>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Now playing beat number 02"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("toggles playback and skips from transport controls", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };
    mockPlayerState.isPlaying = true;

    render(
      <AppChrome>
        <BeatDeck />
      </AppChrome>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mockTogglePlay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Next beat" }));
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });

  it("uses activePathname from player state when usePathname stays stale", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockUsePathname.mockReturnValue("/beat/0001");
    mockPlayerState.activePathname = "/beat/0002";
    mockPlayerState.current = { id: "0002", name: "Jazz Flute" };

    render(
      <AppChrome>
        <BeatDeck />
      </AppChrome>,
    );
    expect(
      screen.getByLabelText("Now playing beat number 02"),
    ).toBeInTheDocument();
  });

  it("renders 404 NotFound state when notFoundBeatId matches the route slug", () => {
    mockUseParams.mockReturnValue({ slug: "9999" });
    mockUsePathname.mockReturnValue("/beat/9999");
    mockPlayerState.notFoundBeatId = "9999";

    render(
      <AppChrome>
        <BeatDeck />
      </AppChrome>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /404 — Beat Not Found/i }),
    ).toBeInTheDocument();
  });
});
