# UI Starter Pack: 3 S-Tier Beats & 6 Bidirectional Frankenstein Transitions

This directory is an all-in-one testing package designed for drop-in use in your new custom UI repository. It contains 3 diverse, 5-star (S-Tier) boom bap beats and all 6 bidirectional Frankenstein radio transitions connecting them.

---

## Folder Structure

```
ui-starter-pack/
├── manifest.json              # Full metadata, loop points, BPMs, and transition timing
├── README.md                  # Integration & Web Audio / Tone.js playback guide
├── tracks/
│   ├── track-a-soul-rhodes.wav     # 86 BPM, G minor (Warm Rhodes & Low Piano)
│   ├── track-b-jazz-flute.wav      # 86 BPM, C Dorian (Jazz Flute & Vibraphone)
│   └── track-c-soul-trumpet.wav    # 94 BPM, G minor (Muted Soul Trumpet & Tenor Sax)
└── transitions/
    ├── track-a-to-track-b.wav      # A -> B (86 -> 86 BPM, locked pocket)
    ├── track-b-to-track-a.wav      # B -> A (86 -> 86 BPM, locked pocket)
    ├── track-a-to-track-c.wav      # A -> C (86 -> 94 BPM, tempo shift)
    ├── track-c-to-track-a.wav      # C -> A (94 -> 86 BPM, tempo shift)
    ├── track-b-to-track-c.wav      # B -> C (86 -> 94 BPM, tempo shift)
    └── track-c-to-track-b.wav      # C -> B (94 -> 86 BPM, tempo shift)
```

---

## 1. Track Specifications & Looping Coordinates

When testing seamless looping in Web Audio (`AudioBufferSourceNode`) or Tone.js (`Player`), set the loop boundaries to `loopStartMs / 1000` and `loopEndMs / 1000`:

| Track       | ID        | BPM    | Key      | Lead & Counter                  | Total Duration | Seamless Loop Range                       |
| :---------- | :-------- | :----- | :------- | :------------------------------ | :------------- | :---------------------------------------- |
| **Track A** | `track-a` | **86** | G minor  | Rhodes Piano & Low-Note Piano   | `61.4s`        | **`8.372s` → `50.233s`** (`41.86s` loop)  |
| **Track B** | `track-b` | **86** | C Dorian | Jazz Flute & Vibraphone         | `67.0s`        | **`16.743s` → `55.814s`** (`39.07s` loop) |
| **Track C** | `track-c` | **94** | G minor  | Muted Trumpet & Tenor Saxophone | `51.1s`        | **`10.213s` → `45.958s`** (`35.75s` loop) |

- **Intro Phase**: From `0s` to `loopStartMs / 1000` (plays once on track start).
- **Loop Phase**: Loops continuously between `loopStartMs` and `loopEndMs`.
- **Outro Phase**: Beyond `loopEndMs` (used when fading out or transitioning).

---

## 2. Transition Timing & Playback Engine (v12 Recipe)

All transitions use the **v12 Frankenstein radio transition** inpainting model:

1. The outgoing track plays through its Bridge.
2. The bridge audio file (`transitions/*.wav`) is triggered. It contains:
   - **Pre-handle context**: The outgoing track's bridge tail.
   - **Glue chunk**: A thinned bed where a vintage 1940s/1950s tube-mic radio soundbite speaks ("beats for days").
   - **Incoming intro**: The natural intro of the incoming track.
3. The incoming track starts playing its own audio file right as the bridge ends (`landMs: 0` relative to the incoming track's intro, or seamless splice into the incoming verse).

### Timing Parameters (from `manifest.json`):

| Transition           | Outgoing → Incoming        | Glue Duration (`glueMs`) | Land Offset (`landMs`) |
| :------------------- | :------------------------- | :----------------------- | :--------------------- |
| `track-a-to-track-b` | Soul Rhodes → Jazz Flute   | `7,206.7 ms`             | `0 ms` (intro)         |
| `track-b-to-track-a` | Jazz Flute → Soul Rhodes   | `7,506.7 ms`             | `0 ms` (intro)         |
| `track-a-to-track-c` | Soul Rhodes → Soul Trumpet | `7,605.3 ms`             | `0 ms` (intro)         |
| `track-c-to-track-a` | Soul Trumpet → Soul Rhodes | `11,002.7 ms`            | `0 ms` (intro)         |
| `track-b-to-track-c` | Jazz Flute → Soul Trumpet  | `7,508.0 ms`             | `0 ms` (intro)         |
| `track-c-to-track-b` | Soul Trumpet → Jazz Flute  | `6,001.3 ms`             | `0 ms` (intro)         |

---

## Quick Example: Web Audio Looper Snippet

```typescript
const audioCtx = new AudioContext();

async function playSeamlessLoop(
  trackWavUrl: string,
  loopStartSec: number,
  loopEndSec: number,
) {
  const res = await fetch(trackWavUrl);
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = true;
  source.loopStart = loopStartSec;
  source.loopEnd = loopEndSec;

  source.connect(audioCtx.destination);
  source.start(0);
  return source;
}

// Example: Play Track A
// playSeamlessLoop('./tracks/track-a-soul-rhodes.wav', 8.372, 50.233);
```
