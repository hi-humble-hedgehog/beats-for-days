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

function resolveDefaultStarterDir(customDir?: string): string {
  if (customDir) return customDir;
  return fs.existsSync(path.resolve("docs/beats-launch-pack"))
    ? path.resolve("docs/beats-launch-pack")
    : path.resolve("raw-audio");
}

function processJob(
  job: ConversionJob,
  bitrate: string,
  skipExisting: boolean,
): void {
  if (skipExisting && fs.existsSync(job.outputPath)) {
    return;
  }
  convertWavToM4a(job.inputPath, job.outputPath, bitrate);
}

function cleanTargetDir(targetDir: string): void {
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".m4a")) {
        fs.unlinkSync(path.join(targetDir, entry.name));
      }
    }
  }
}

function cleanTargetDirectories(baseDir: string): void {
  cleanTargetDir(path.join(baseDir, "tracks"));
  cleanTargetDir(path.join(baseDir, "transitions"));
}

function executeConversionJobs(
  jobs: ConversionJob[],
  bitrate: string,
  skipExisting: boolean,
  onProgress?: (current: number, total: number, file: string) => void,
): string[] {
  const converted: string[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    processJob(job, bitrate, skipExisting);
    converted.push(job.outputPath);
    if (onProgress) {
      onProgress(i + 1, jobs.length, job.outputPath);
    }
  }
  return converted;
}

/**
 * Converts WAV files in sourceDir into M4A assets in public/audio/.
 */
export function convertStarterPackAudio(options?: {
  starterPackDir?: string;
  outputBaseDir?: string;
  bitrate?: string;
  skipExisting?: boolean;
  clean?: boolean;
  onProgress?: (current: number, total: number, file: string) => void;
}): { converted: string[] } {
  const starterPackDir = resolveDefaultStarterDir(options?.starterPackDir);
  const outputBaseDir = options?.outputBaseDir || path.resolve("public/audio");
  const bitrate = options?.bitrate || "192k";
  const skipExisting = Boolean(options?.skipExisting);

  if (options?.clean) {
    cleanTargetDirectories(outputBaseDir);
  }

  const trackJobs = findConversionJobs(
    path.join(starterPackDir, "tracks"),
    path.join(outputBaseDir, "tracks"),
  );

  const transitionJobs = findConversionJobs(
    path.join(starterPackDir, "transitions"),
    path.join(outputBaseDir, "transitions"),
  );

  const converted = executeConversionJobs(
    [...trackJobs, ...transitionJobs],
    bitrate,
    skipExisting,
    options?.onProgress,
  );

  return { converted };
}

function runCli(): void {
  const cliDir = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const skipExisting = process.argv.includes("--skip-existing");
  const clean = process.argv.includes("--clean");
  const candidate = cliDir
    ? path.resolve(cliDir)
    : fs.existsSync(path.resolve("docs/beats-launch-pack"))
      ? path.resolve("docs/beats-launch-pack")
      : path.resolve("raw-audio");

  console.log(`Converting audio files from ${candidate} to AAC (.m4a)...`);
  const { converted } = convertStarterPackAudio({
    starterPackDir: candidate,
    skipExisting,
    clean,
    onProgress: (current, total, file) => {
      const fileName = path.basename(file);
      process.stdout.write(
        `\r[${current}/${total}] Processing ${fileName.padEnd(45)}`,
      );
    },
  });
  console.log(
    `\nFinished converting ${converted.length} files to public/audio/.`,
  );
}

if (process.argv[1]?.endsWith("convert.ts")) {
  runCli();
}
