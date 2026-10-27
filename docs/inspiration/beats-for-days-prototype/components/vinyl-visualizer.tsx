'use client'

import { useEffect, useRef } from 'react'
import { readCssColor } from '@/lib/audio-bands'
import { visibleSpans, type Geometry } from '@/lib/poster-geometry'

const PIN_RADIUS = 8

type Span = [number, number]

function intersect(a: Span[], b: Span[]): Span[] {
  const out: Span[] = []
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const lo = Math.max(a0, b0)
      const hi = Math.min(a1, b1)
      if (hi - lo > 1e-6) out.push([lo, hi])
    }
  }
  return out
}

type Props = {
  geometry: Geometry
}

export function VinylVisualizer({ geometry }: Props) {
  const colorsRef = useRef<null | { ink: string; stamp: string; sleeve: string }>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      ctx.clearRect(0, 0, width, height)

      if (!colorsRef.current) {
        colorsRef.current = {
          ink: readCssColor('--vinyl', '#141414'),
          stamp: readCssColor('--stamp', '#d62718'),
          sleeve: readCssColor('--sleeve', '#eceae4'),
        }
      }
      const { ink, stamp, sleeve } = colorsRef.current
      const cx = geometry.px * dpr
      const cy = geometry.py * dpr
      const start = geometry.start * dpr

      const overlap = Math.max(1, dpr)
      const firstCut = geometry.bands.findIndex((band) => band.cut)
      const accentGutter = firstCut > 0 ? firstCut - 1 : firstCut === 0 ? 0 : -1
      for (let k = 0; k < geometry.rings - 1; k++) {
        const lower = geometry.bands[k]
        const upper = geometry.bands[k + 1]
        ctx.fillStyle = k === accentGutter ? stamp : sleeve
        const rIn = lower.outer * dpr - overlap
        const rOut = upper.inner * dpr + overlap
        for (const [a, b] of intersect(
          visibleSpans(lower.from, lower.to, lower.cut),
          visibleSpans(upper.from, upper.to, upper.cut),
        )) {
          ctx.beginPath()
          ctx.arc(cx, cy, rOut, -a, -b, true)
          ctx.arc(cx, cy, rIn, -b, -a, false)
          ctx.closePath()
          ctx.fill()
        }
      }

      ctx.fillStyle = ink
      for (const band of geometry.bands) {
        const inner = band.inner * dpr
        const outer = band.outer * dpr
        for (const [a, b] of visibleSpans(band.from, band.to, band.cut)) {
          ctx.beginPath()
          ctx.arc(cx, cy, outer, -a, -b, true)
          ctx.arc(cx, cy, inner, -b, -a, false)
          ctx.closePath()
          ctx.fill()
        }
      }

      ctx.fillStyle = stamp
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(start * 0.06, (PIN_RADIUS + 3) * dpr), 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = sleeve
      ctx.beginPath()
      ctx.arc(cx, cy, PIN_RADIUS * dpr, 0, Math.PI * 2)
      ctx.fill()
    }

    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [geometry])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      role="img"
      aria-label="Concentric record grooves with a stationary centre"
    />
  )
}
