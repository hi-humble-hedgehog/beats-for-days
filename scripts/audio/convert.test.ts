import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  convertStarterPackAudio,
  convertWavToM4a,
  findConversionJobs,
} from "./convert";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

describe("findConversionJobs", () => {
  it("returns an empty list when directory does not exist", () => {
    const jobs = findConversionJobs("/non/existent/dir", "/target");
    expect(jobs).toEqual([]);
  });

  it("finds WAV files and creates output M4A mapping", () => {
    const testDir = path.resolve("test/fixtures/wav-test");
    const targetDir = path.resolve("test/fixtures/m4a-out");

    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "sample1.wav"), "dummy-wav-data");
    fs.writeFileSync(path.join(testDir, "sample2.WAV"), "dummy-wav-data");
    fs.writeFileSync(path.join(testDir, "notes.txt"), "text-file");

    try {
      const jobs = findConversionJobs(testDir, targetDir);
      expect(jobs).toHaveLength(2);
      expect(jobs[0]?.outputPath.endsWith(".m4a")).toBe(true);
      expect(jobs[1]?.outputPath.endsWith(".m4a")).toBe(true);
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("converts WAV files to M4A via ffmpeg in convertStarterPackAudio", () => {
    const rawDir = path.resolve("test/fixtures/raw-starter");
    const outDir = path.resolve("test/fixtures/out-starter");

    fs.mkdirSync(path.join(rawDir, "tracks"), { recursive: true });
    fs.mkdirSync(path.join(rawDir, "transitions"), { recursive: true });
    fs.writeFileSync(path.join(rawDir, "tracks", "track-a.wav"), "wav");
    fs.writeFileSync(path.join(rawDir, "transitions", "a-to-b.wav"), "wav");

    try {
      const result = convertStarterPackAudio({
        starterPackDir: rawDir,
        outputBaseDir: outDir,
        bitrate: "192k",
      });

      expect(result.converted).toEqual([
        path.join(outDir, "tracks", "track-a.m4a"),
        path.join(outDir, "transitions", "a-to-b.m4a"),
      ]);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        "ffmpeg",
        [
          "-y",
          "-i",
          path.join(rawDir, "tracks", "track-a.wav"),
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          path.join(outDir, "tracks", "track-a.m4a"),
        ],
        { stdio: "pipe" },
      );

      // Calling convertWavToM4a again when directory already exists
      convertWavToM4a(
        path.join(rawDir, "tracks", "track-a.wav"),
        path.join(outDir, "tracks", "track-a.m4a"),
      );
      expect(fs.existsSync(path.join(outDir, "tracks"))).toBe(true);
    } finally {
      fs.rmSync(rawDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
