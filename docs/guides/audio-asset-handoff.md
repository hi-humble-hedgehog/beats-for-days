# Audio Asset Hand-off Guide

This guide explains how to prepare, export, and package the 36 launch tracks and 288 transition assets for Beats for Days.

---

## 1. Overview & Objective

Beats for Days is an infinite generative boom bap web player. The web engine plays seamless loops and transitions between tracks without silence or clicks.

To launch the web player, we need:

- **36 unique tracks** (looping beats).
- **288 transition bridges** (8 outgoing transitions and 8 incoming transitions per track).
- **1 metadata file (`catalog.json`)** defining loop points, BPM, and transition timing in milliseconds.
- **1 zip archive** containing all audio files and `catalog.json`.

---

## 2. Zip Package Structure

Name your final archive `beats-launch-pack.zip`. When unzipped, it must look exactly like this:

```text
beats-launch-pack/
├── catalog.json
├── tracks/
│   ├── track-01.wav
│   ├── track-02.wav
│   └── ... (36 .wav files in total)
└── transitions/
    ├── track-01-to-track-02.wav
    ├── track-01-to-track-05.wav
    └── ... (288 .wav files in total)
```

> [!IMPORTANT]
> Do not add nested folders, extra files, or hidden OS files (`.DS_Store`, `Thumbs.db`) inside the archive.

---

## 3. Audio Export Specs

Export all files directly from your DAW (Ableton, Logic Pro, FL Studio, Reaper, etc.) using these settings:

| Setting         | Requirement                 | Notes                                  |
| --------------- | --------------------------- | -------------------------------------- |
| **Format**      | WAV (PCM)                   | Uncompressed audio                     |
| **Bit Depth**   | 16-bit or 24-bit            | 16-bit 44.1 kHz is standard            |
| **Sample Rate** | 44,100 Hz or 48,000 Hz      | Keep all files at the same sample rate |
| **Channels**    | Stereo                      | 2 channels                             |
| **Mastering**   | Peak normalize to -0.5 dBFS | Avoid digital clipping                 |

### File Naming Rules

- Use lowercase letters, numbers, and hyphens only (`kebab-case`).
- Never use spaces, underscores, capitals, or special characters.
- **Track files:** `<track-id>.wav` (e.g. `track-01.wav` or `track-soul-rhodes.wav`).
- **Transition files:** `<from-track-id>-to-<to-track-id>.wav` (e.g. `track-01-to-track-02.wav`).

---

## 4. Understanding the Timing Parameters

The Web Audio player uses exact millisecond timestamps to schedule seamless playback.

```text
Track Timeline:
0 ms ───────────────────► loopStartMs ──────────────────────────────► loopEndMs (Wraps to loopStartMs)
[      Intro section      ] [              Loop section              ]
```

### Track Parameters

- **`durationMs`**: The full duration of the WAV file in milliseconds.
- **`loopStartMs`**: The millisecond where the intro ends and the repeatable groove begins.
- **`loopEndMs`**: The millisecond where the loop wraps back to `loopStartMs`.
- **`loopDurationMs`**: Calculated value: `loopEndMs - loopStartMs`.

### Transition Splice Parameters

Transitions bridge from Track A to Track B:

- **`handleMs`**: Safety overlap before Track A exits. Always set to `250`.
- **`crossfadeMs`**: Crossfade curve length. Always set to `100`.
- **`glueMs`**: The exact length of the transition bridge WAV file in milliseconds.
- **`landMs`**: The offset where Track B starts playing. Use `0` unless Track B drops mid-bar.

> [!TIP]
> **DAW to Milliseconds Formula:**
> If your DAW displays time in seconds: `milliseconds = seconds * 1000`.
> For example: `42.500 seconds = 42500 ms`.

---

## 5. Transition Graph Rules

Every track must have transitions connecting to other tracks.

1. **8 Outgoing Transitions:** Each track connects to 8 different tracks.
2. **8 Incoming Transitions:** Each track receives transitions from 8 different tracks.
3. **No Self-Loops:** A track cannot transition to itself (e.g. `track-01-to-track-01` is invalid).
4. **Total Transitions:** Exactly $36 \times 8 = 288$ transitions.

---

## 6. `catalog.json` Format

Place `catalog.json` at the root of the package.

```json
{
  "version": "1.0",
  "tracks": [
    {
      "id": "track-01",
      "name": "Soul Rhodes & Piano",
      "bpm": 86,
      "key": "G minor",
      "genre": "Soul",
      "leadInstrument": "Rhodes Piano",
      "counterInstrument": "Low-Note Piano",
      "fileName": "track-01.wav",
      "durationMs": 61395,
      "loopStartMs": 8372,
      "loopEndMs": 50233,
      "loopDurationMs": 41861
    }
  ],
  "transitions": [
    {
      "id": "track-01-to-track-02",
      "from": "track-01",
      "to": "track-02",
      "fileName": "track-01-to-track-02.wav",
      "timing": {
        "handleMs": 250,
        "crossfadeMs": 100,
        "glueMs": 7206.7,
        "landMs": 0
      },
      "recipeVersion": "v1"
    }
  ]
}
```

### Track Fields Reference

| Field               | Type   | Required | Description                                        |
| ------------------- | ------ | -------- | -------------------------------------------------- |
| `id`                | string | Yes      | Unique identifier (e.g. `"track-01"`).             |
| `name`              | string | Yes      | Display title (e.g. `"Soul Rhodes & Piano"`).      |
| `bpm`               | number | Yes      | Beats per minute (e.g. `86`).                      |
| `key`               | string | Yes      | Musical key (e.g. `"G minor"`).                    |
| `genre`             | string | Yes      | Primary genre tag (e.g. `"Soul"`).                 |
| `leadInstrument`    | string | No       | Lead sound (e.g. `"Rhodes Piano"`).                |
| `counterInstrument` | string | No       | Secondary instrument (e.g. `"Low-Note Piano"`).    |
| `fileName`          | string | Yes      | Name of file in `tracks/` (e.g. `"track-01.wav"`). |
| `durationMs`        | number | Yes      | Total file length in milliseconds.                 |
| `loopStartMs`       | number | Yes      | Loop start timestamp in milliseconds.              |
| `loopEndMs`         | number | Yes      | Loop end timestamp in milliseconds.                |
| `loopDurationMs`    | number | Yes      | Value of `loopEndMs - loopStartMs`.                |

### Transition Fields Reference

| Field                | Type   | Required | Description                                                         |
| -------------------- | ------ | -------- | ------------------------------------------------------------------- |
| `id`                 | string | Yes      | Unique ID formatted as `"<from>-to-<to>"`.                          |
| `from`               | string | Yes      | Source track ID (must match an `id` in `tracks`).                   |
| `to`                 | string | Yes      | Target track ID (must match an `id` in `tracks`).                   |
| `fileName`           | string | Yes      | Name of file in `transitions/` (e.g. `"track-01-to-track-02.wav"`). |
| `timing.handleMs`    | number | Yes      | Always `250`.                                                       |
| `timing.crossfadeMs` | number | Yes      | Always `100`.                                                       |
| `timing.glueMs`      | number | Yes      | Length of the transition audio file in milliseconds.                |
| `timing.landMs`      | number | Yes      | Always `0`.                                                         |
| `recipeVersion`      | string | No       | Mix or generation tag (e.g. `"v1"`).                                |

---

## 7. Pre-Flight Checklist

Complete this checklist before submitting the package:

- [ ] Folder structure matches section 2.
- [ ] Exactly **36 `.wav` files** in `tracks/`.
- [ ] Exactly **288 `.wav` files** in `transitions/`.
- [ ] Total audio files: **324 `.wav` files**.
- [ ] All audio files are valid stereo WAV files with no digital distortion or silence.
- [ ] Every filename matches its `fileName` entry in `catalog.json`.
- [ ] Every track has exactly **8 outgoing transitions** and **8 incoming transitions**.
- [ ] `catalog.json` contains no duplicate IDs.
- [ ] `catalog.json` passes JSON syntax validation (no trailing commas or unquoted keys).
- [ ] All `durationMs`, `loopStartMs`, `loopEndMs`, and `glueMs` values are positive numbers.
