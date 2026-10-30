export function formatBeatNumber(n: number) {
  return String(n % 100).padStart(2, '0')
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Log-spaced frequency bands, normalised 0..1. */
export function sampleBands(data: Uint8Array, out: Float32Array) {
  const count = out.length
  const minBin = 2
  const maxBin = Math.floor(data.length * 0.55)
  const ratio = maxBin / minBin
  for (let i = 0; i < count; i++) {
    const start = Math.floor(minBin * Math.pow(ratio, i / count))
    const end = Math.max(start + 1, Math.floor(minBin * Math.pow(ratio, (i + 1) / count)))
    let sum = 0
    for (let b = start; b < end; b++) sum += data[b]
    out[i] = sum / (end - start) / 255
  }
}

/** A deterministic resting shape per beat number, so every paused frame is still a poster. */
export function idleBand(i: number, count: number, seed: number, t: number) {
  const x = i / count
  const a = 0.5 + 0.5 * Math.sin(x * 9 + seed * 0.37)
  const b = 0.5 + 0.5 * Math.sin(x * 3.1 + seed * 0.011)
  const breathe = 0.92 + 0.08 * Math.sin(t * 0.0012 + i * 0.3)
  return (0.12 + 0.55 * a * b) * (1 - x * 0.45) * breathe
}

export function readCssColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
