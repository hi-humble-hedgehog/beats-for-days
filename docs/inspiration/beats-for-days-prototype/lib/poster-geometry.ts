/*
  Construction after Müller-Brockmann's 1955 Tonhalle "Beethoven" poster
  (as analysed by Kimberly Elam):
  - one pivot point sits on a gutter crossing of the modular grid
  - concentric bands around it whose widths double in fixed CSS pixels:
    8, 16, 32, 64, 128, 256, 512…
  - the first band starts 2 or 3 grid columns out from the pivot, so its
    inner edge lands on a column gutter; every gap stays exactly 2 CSS px
  - bands keep extending outward until the next band would no longer be
    visible anywhere on screen
  - all angles snap to an 11.25° module (360° / 32)

  Angles are measured anticlockwise from the east axis ("sweep space").
  Every band is a solid ring that goes fully round, except where it meets
  one of the two protected areas: the title hitbox (top left) and the
  player hitbox (bottom right). Each band gets its own wedge per area: the
  angular extent of the hitbox inside that band's radii, snapped outward to
  the module and nudged off the horizontal and vertical axes. Bands the
  hitbox never reaches are not cut, so the outer bands close into full
  circles. Wedges are widened by a few modules per band on a rotating phase
  so neighbouring bands never share an edge line.

  The two outermost bands are not widened: their title cut is only the
  module-snapped extent of the hitbox, so they fill as much of the top left
  as possible.

  The reactive spectrum lives inside the first band's inner radius. One gutter
  inside the band, it grows inward toward the pivot. The bars go all the way
  round (two per 11.25° module, a 2px gutter between each) and spin at
  33⅓ rpm; they are masked to the first band's visible angular span, so they
  disappear wherever that band is cut. No bar reaches further than a third of
  the distance from the spectrum's base to the pivot.

  A 2px stamp-red line sits in the gutter between the first band that opens
  up for the title and the band below it.
*/

export const MODULE = Math.PI / 16
export const BAND_GUTTER = 2
const MIN_BANDS = 5
const MAX_BANDS = 16

export function bandWidth(k: number) {
  return 8 * 2 ** k
}
export const FULL_TURN = Math.PI * 2
// Share of the distance from the spectrum base to the pivot that the tallest bar may cover.
export const SPECTRUM_MAX_REACH = 0.33
export const BARS_PER_SLICE = 2

type Rect = { x0: number; y0: number; x1: number; y1: number }
export type Cut = { lo: number; hi: number }
export type Band = { k: number; inner: number; outer: number; from: number; to: number; cut: Cut | null }
export type Slice = { from: number; to: number }
export type Bar = { from: number; to: number }

export type Geometry = {
  w: number
  h: number
  mobile: boolean
  cols: number
  rows: number
  margin: number
  gap: number
  colW: number
  rowH: number
  px: number
  py: number
  start: number
  startCols: number
  numberSize: number
  rings: number
  bands: Band[]
  slices: Slice[]
  bars: Bar[]
  spectrum: { base: number; tip: number }
  titleRects: Rect[]
  uiRects: Rect[]
}

function rand(seed: number, salt: number) {
  let x = Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)
  x ^= x >>> 15
  x = Math.imul(x, 0x2c1b3c6d)
  x ^= x >>> 12
  x = Math.imul(x, 0x297a2d39)
  x ^= x >>> 15
  return (x >>> 0) / 4294967296
}

function isStraight(angle: number) {
  const q = angle / (Math.PI / 2)
  return Math.abs(q - Math.round(q)) < 1e-6
}

// Smallest and largest angle of the hitboxes' parts that lie inside the ring [rIn, rOut].
// `unwrap` lifts angles below the west axis by a full turn, for hitboxes that straddle the east axis.
function angularExtent(rects: Rect[], px: number, py: number, rIn: number, rOut: number, unwrap: boolean) {
  let min = Infinity
  let max = -Infinity
  for (const r of rects) {
    const nx = Math.min(80, Math.max(8, Math.ceil((r.x1 - r.x0) / 4)))
    const ny = Math.min(60, Math.max(8, Math.ceil((r.y1 - r.y0) / 4)))
    for (let i = 0; i <= nx; i++) {
      const x = r.x0 + ((r.x1 - r.x0) * i) / nx
      for (let j = 0; j <= ny; j++) {
        const y = r.y0 + ((r.y1 - r.y0) * j) / ny
        const dx = x - px
        const dy = py - y
        const d = Math.hypot(dx, dy)
        if (d < rIn || d > rOut) continue
        let a = Math.atan2(dy, dx)
        if (a < 0) a += FULL_TURN
        if (unwrap && a < Math.PI) a += FULL_TURN
        if (a < min) min = a
        if (a > max) max = a
      }
    }
  }
  return min === Infinity ? null : { min, max }
}

function snapCut(extent: { min: number; max: number } | null): Cut | null {
  if (!extent) return null
  let lo = Math.floor((extent.min - 1e-3) / MODULE) * MODULE
  let hi = Math.ceil((extent.max + 1e-3) / MODULE) * MODULE
  if (isStraight(lo)) lo -= MODULE
  if (isStraight(hi)) hi += MODULE
  return { lo, hi }
}

function hitboxCut(rects: Rect[], px: number, py: number, rIn: number, rOut: number, unwrap: boolean): Cut | null {
  if (rOut <= rIn) return null
  return snapCut(angularExtent(rects, px, py, rIn, rOut, unwrap))
}

// The player hitbox starts at the pivot's vertical axis, but a band the hitbox only partly reaches
// can see its cut start in the right half. Stop every band at least one module before due south so
// none bleeds into the track label; the stagger then only pulls the stops further round.
function keepLeftOfPivot(cut: Cut | null): Cut | null {
  if (!cut) return null
  return { lo: Math.min(cut.lo, Math.PI * 1.5 - MODULE), hi: cut.hi }
}

// Opens a cut a few modules wider on each side so neighbouring bands never share an edge line.
function staggerCut(cut: Cut | null, loExtra: number, hiExtra: number): Cut | null {
  if (!cut) return null
  let lo = cut.lo - loExtra * MODULE
  let hi = cut.hi + hiExtra * MODULE
  if (isStraight(lo)) lo -= MODULE
  if (isStraight(hi)) hi += MODULE
  return { lo, hi }
}

export function computeGeometry(w: number, h: number, seed: number): Geometry {
  const mobile = w < 768
  const cols = mobile ? 6 : 12
  const rows = mobile ? 10 : 8
  const margin = mobile ? 16 : 32
  const gap = mobile ? 12 : 16
  const colW = (w - 2 * margin - (cols - 1) * gap) / cols
  const rowH = (h - 2 * margin - (rows - 1) * gap) / rows

  const gutterX = (line: number) => margin + line * (colW + gap) - gap / 2
  const gutterY = (line: number) => margin + line * (rowH + gap) - gap / 2

  const px = gutterX(mobile ? 1 : 5)
  const py = gutterY(5)

  const startCols = mobile ? 2 : 2 + Math.floor(rand(seed, 98) * 2)
  const start = startCols * (colW + gap)

  const quadrantW = w - margin - px - gap / 2
  const quadrantH = h - margin - py - gap / 2
  const controlsW = mobile ? quadrantW : Math.min(384, quadrantW)
  const numberSize = Math.max(56, Math.min(controlsW / 1.75, (quadrantH - 170) / 0.85))

  const left = px + gap / 2
  const controlsH = 140
  const numberGap = mobile ? 8 : 16
  const numberTop = h - margin - controlsH - numberGap - numberSize * 0.78
  const uiPad = 10
  const uiRects: Rect[] = [
    { x0: left - uiPad, y0: numberTop - uiPad - 14, x1: left + controlsW + uiPad, y1: numberTop + numberSize * 0.78 + uiPad },
    { x0: left - uiPad, y0: h - margin - controlsH - uiPad, x1: left + controlsW + uiPad, y1: h - margin + uiPad },
  ]

  const pad = 6
  const head = mobile ? { w: 104, h: 52 } : { w: 166, h: 84 }
  const titleRects: Rect[] = [
    { x0: margin - pad, y0: margin - pad, x1: margin + head.w + pad, y1: margin + head.h + pad },
  ]
  if (!mobile) {
    const tagTop = margin + head.h + 12
    titleRects.push({
      x0: margin - pad,
      y0: tagTop - pad,
      x1: margin + 212 + pad,
      y1: tagTop + 39 + pad + gap,
    })
  }

  const titleLoPhase = Math.floor(rand(seed, 70) * 3)
  const titleHiPhase = Math.floor(rand(seed, 71) * 3)
  const bands: Band[] = []
  const uiRaw: (Cut | null)[] = []
  // Each band stops 0-3 slices past the interface, never on the same slice as the band inside it.
  const pickExtra = (k: number, salt: number, prev: number) => {
    const roll = Math.floor(rand(seed, salt + k) * 4)
    return k === 0 ? roll : (prev + 1 + (roll % 3)) % 4
  }
  let prevLoExtra = 0
  let prevHiExtra = 0
  for (let k = 0; k < MAX_BANDS; k++) {
    const inner = bandInner(k, start)
    const outer = bandOuter(k, start)
    const rawUi = keepLeftOfPivot(hitboxCut(uiRects, px, py, inner, outer - 0.6, true))
    uiRaw.push(rawUi)
    prevLoExtra = pickExtra(k, 80, prevLoExtra)
    prevHiExtra = pickExtra(k, 120, prevHiExtra)
    const ui = staggerCut(rawUi, prevLoExtra, prevHiExtra)
    const band: Band = {
      k,
      inner,
      outer,
      from: ui ? ui.hi - FULL_TURN : 0,
      to: ui ? ui.lo : FULL_TURN,
      cut: staggerCut(
        hitboxCut(titleRects, px, py, inner, outer - 0.6, false),
        (titleLoPhase + 2 * k) % 3,
        (titleHiPhase + k) % 3,
      ),
    }
    if (k >= MIN_BANDS && !isVisible(band, w, h, px, py)) break
    bands.push(band)
  }
  const rings = bands.length

  const outerLoPhase = Math.floor(rand(seed, 72) * 2)
  const outerHiPhase = Math.floor(rand(seed, 73) * 2)
  for (const band of bands.slice(-2)) {
    band.cut = hitboxCut(titleRects, px, py, band.inner, band.outer - 0.6, false)
    const ui = staggerCut(uiRaw[band.k], (outerLoPhase + band.k) % 2, (outerHiPhase + band.k) % 2)
    band.from = ui ? ui.hi - FULL_TURN : 0
    band.to = ui ? ui.lo : FULL_TURN
  }

  const first = bands[0]
  const base = start - BAND_GUTTER
  const spectrum = { base, tip: base * (1 - SPECTRUM_MAX_REACH) }
  const slices: Slice[] = []
  const bars: Bar[] = []
  for (const [a, b] of visibleSpans(first.from, first.to, first.cut)) {
    const count = Math.round((b - a) / MODULE)
    for (let i = 0; i < count; i++) {
      const from = a + i * MODULE
      slices.push({ from, to: from + MODULE })
    }
  }
  const barStep = MODULE / BARS_PER_SLICE
  const barCount = Math.round(FULL_TURN / barStep)
  for (let i = 0; i < barCount; i++) bars.push({ from: i * barStep, to: (i + 1) * barStep })

  return {
    w,
    h,
    mobile,
    cols,
    rows,
    margin,
    gap,
    colW,
    rowH,
    px,
    py,
    start,
    startCols,
    numberSize,
    rings,
    bands,
    slices,
    bars,
    spectrum,
    titleRects,
    uiRects,
  }
}

export function visibleSpans(from: number, to: number, cut: Cut | null): [number, number][] {
  if (!cut) return [[from, to]]
  const spans: [number, number][] = []
  if (from < cut.lo) spans.push([from, Math.min(to, cut.lo)])
  if (to > cut.hi) spans.push([Math.max(from, cut.hi), to])
  return spans
}

// Distance from the pivot to the viewport edge along a ray (sweep-space angle).
function rayLength(w: number, h: number, px: number, py: number, angle: number) {
  const dx = Math.cos(angle)
  const dy = -Math.sin(angle)
  const tx = dx > 1e-9 ? (w - px) / dx : dx < -1e-9 ? -px / dx : Infinity
  const ty = dy > 1e-9 ? (h - py) / dy : dy < -1e-9 ? -py / dy : Infinity
  return Math.min(tx, ty)
}

// A band is visible when some ray inside its drawn spans reaches past its inner edge.
function isVisible(band: Band, w: number, h: number, px: number, py: number) {
  const step = MODULE / 8
  for (const [from, to] of visibleSpans(band.from, band.to, band.cut)) {
    for (let a = from; a <= to + 1e-6; a += step) {
      if (rayLength(w, h, px, py, a) > band.inner) return true
    }
  }
  return false
}

export function bandInner(k: number, start: number) {
  let r = start
  for (let j = 0; j < k; j++) r += bandWidth(j) + BAND_GUTTER
  return r
}

export function bandOuter(k: number, start: number) {
  return bandInner(k, start) + bandWidth(k)
}

export function gutterMid(k: number, start: number) {
  return bandOuter(k, start) + BAND_GUTTER / 2
}
