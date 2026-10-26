import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BeatPage from "./page";
import { BeatDeck } from "./BeatDeck";

const mockUseParams = vi.fn();
const mockUsePathname = vi.fn();
const mockTogglePlay = vi.fn();
const mockAdvanceTrack = vi.fn();
const mockCommitBeat = vi.fn();
const mockHydrateBeat = vi.fn();
const mockNotFound = vi.fn();
const mockFetchBeatViewById = vi.fn();

let mockPlayerState = {
  current: null as { id: string; name: string } | null,
  activePathname: undefined as string | undefined,
  notFoundBeatId: null as string | null,
  isPlaying: false,
  secondsRemaining: 30,
  togglePlay: mockTogglePlay,
  advanceTrack: mockAdvanceTrack,
  commitBeat: mockCommitBeat,
  hydrateBeat: mockHydrateBeat,
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
  useStartPlayback: () => vi.fn(),
}));

describe("BeatPage (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockPlayerState.current = null;

    const ui = await BeatPage({ params: Promise.resolve({ slug: "0001" }) });
    render(ui);

    expect(mockFetchBeatViewById).toHaveBeenCalledWith("0001");
    expect(mockHydrateBeat).toHaveBeenCalledWith(serverBeat);
    expect(mockCommitBeat).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "#Brooklyn Sunset",
    );
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
      togglePlay: mockTogglePlay,
      advanceTrack: mockAdvanceTrack,
      commitBeat: mockCommitBeat,
      hydrateBeat: mockHydrateBeat,
    };
  });

  it("renders loading state with the slug when beat is not yet loaded", () => {
    mockUseParams.mockReturnValue({ slug: "0002" });

    render(<BeatDeck />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Loading Beat 0002...",
    );
    expect(screen.getByText("Track ID: 0002")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "▶ Play Beat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Automatic seamless AI transition queued in 30s/),
    ).toBeInTheDocument();
  });

  it("renders loading state for route slug when player current beat does not match slug", () => {
    mockUseParams.mockReturnValue({ slug: "0002" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };

    render(<BeatDeck />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Loading Beat 0002...",
    );
    expect(screen.getByText("Track ID: 0002")).toBeInTheDocument();
  });

  it("renders fallback dash when slug is missing from params", () => {
    mockUseParams.mockReturnValue(null);

    render(<BeatDeck />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Loading Beat —...",
    );
    expect(screen.getByText("Track ID: —")).toBeInTheDocument();
  });

  it("renders beat information when loaded and handles play/pause and next", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };
    mockPlayerState.isPlaying = true;
    mockPlayerState.secondsRemaining = 15;

    render(<BeatDeck />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Brooklyn Sunset",
    );
    expect(screen.getByText("Track ID: 0001")).toBeInTheDocument();

    const pauseButton = screen.getByRole("button", { name: "⏸ Pause Beat" });
    expect(pauseButton).toBeInTheDocument();
    fireEvent.click(pauseButton);
    expect(mockTogglePlay).toHaveBeenCalledTimes(1);

    const nextButton = screen.getByRole("button", { name: "⏭ Next Beat" });
    fireEvent.click(nextButton);
    expect(mockAdvanceTrack).toHaveBeenCalledTimes(1);

    expect(
      screen.getByText(/Automatic seamless AI transition queued in 15s/),
    ).toBeInTheDocument();
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };

    render(<BeatDeck />);

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).not.toMatch(/focus-visible:outline/);
      expect(button.className).not.toMatch(/focus:ring/);
    }
  });

  it("uses activePathname from player state when usePathname stays stale after history.pushState", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockUsePathname.mockReturnValue("/beat/0001");
    mockPlayerState.activePathname = "/beat/0002";
    mockPlayerState.current = { id: "0002", name: "Jazz Flute" };

    render(<BeatDeck />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "#Jazz Flute",
    );
    expect(screen.getByText("Track ID: 0002")).toBeInTheDocument();
  });

  it("renders 404 NotFound state when notFoundBeatId matches the route slug", () => {
    mockUseParams.mockReturnValue({ slug: "9999" });
    mockUsePathname.mockReturnValue("/beat/9999");
    mockPlayerState.notFoundBeatId = "9999";

    render(<BeatDeck />);

    expect(
      screen.getByRole("heading", { level: 1, name: /404 — Beat Not Found/i }),
    ).toBeInTheDocument();
  });
});
