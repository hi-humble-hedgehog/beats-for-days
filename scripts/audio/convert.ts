import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

interface ConversionJob {
  inputPath: string;
  outputPath: string;
}

/**
 * Finds all WAV files in a directory that need conversion to M4A.
 */
export function findConversionJobs(
  sourceDir: string,
  targetDir: string,
): ConversionJob[] {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const wavFiles = entries.filter(
    (e) => e.isFile() && e.name.toLowerCase().endsWith(".wav"),
  );

  return wavFiles.map((e) => {
    const baseName = path.parse(e.name).name;
    return {
      inputPath: path.join(sourceDir, e.name),
      outputPath: path.join(targetDir, `${baseName}.m4a`),
    };
  });
}

/**
 * Runs ffmpeg to convert a WAV audio file to an AAC m4a audio file.
 */
export function convertWavToM4a(
  inputPath: string,
  outputPath: string,
  bitrate = "192k",
): void {
  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-c:a",
      "aac",
      "-b:a",
      bitrate,
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { stdio: "pipe" },
  );
}

/**
 * Converts WAV files in sourceDir into M4A assets in public/audio/.
 */
export function convertStarterPackAudio(options?: {
  starterPackDir?: string;
  outputBaseDir?: string;
  bitrate?: string;
}): { converted: string[] } {
  const starterPackDir = options?.starterPackDir ?? path.resolve("raw-audio");
  const outputBaseDir = options?.outputBaseDir ?? path.resolve("public/audio");
  const bitrate = options?.bitrate ?? "192k";

  const trackJobs = findConversionJobs(
    path.join(starterPackDir, "tracks"),
    path.join(outputBaseDir, "tracks"),
  );

  const transitionJobs = findConversionJobs(
    path.join(starterPackDir, "transitions"),
    path.join(outputBaseDir, "transitions"),
  );

  const allJobs = [...trackJobs, ...transitionJobs];
  const converted: string[] = [];

  for (const job of allJobs) {
    convertWavToM4a(job.inputPath, job.outputPath, bitrate);
    converted.push(job.outputPath);
  }

  return { converted };
}

function runCli(): void {
  console.log("Converting starter pack WAV files to AAC (.m4a)...");
  const { converted } = convertStarterPackAudio();
  console.log(`Converted ${converted.length} files to public/audio/:`);
  for (const file of converted) {
    const stats = fs.statSync(file);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  ✓ ${path.basename(file)} (${sizeMb} MB)`);
  }
}

if (process.argv[1]?.endsWith("convert.ts")) {
  runCli();
}
