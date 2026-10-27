'use client'

import { useEffect, useRef } from 'react'
import { readCssColor } from '@/lib/audio-bands'
import { BAND_GUTTER, visibleSpans, type Geometry } from '@/lib/poster-geometry'

const MARKER_GROUP_SIZE = 2
const BAR_RADIAL_THICKNESS = 6

type Props = {
  geometry: Geometry
}

export function SpectrumBars({ geometry }: Props) {
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

      const { bars, spectrum, bands } = geometry
      const firstBand = bands[0]
      if (!firstBand || bars.length === 0) return

      const cx = geometry.px * dpr
      const cy = geometry.py * dpr
      const base = spectrum.base * dpr
      const halfGutter = (BAND_GUTTER / 2) * dpr
      const outer = base - dpr
      const inner = outer - BAR_RADIAL_THICKNESS * dpr
      if (inner <= halfGutter) return

      const edgeInset =
        bars[Math.min(MARKER_GROUP_SIZE - 1, bars.length - 1)].to - bars[0].from
      const tiltOuter = Math.asin(halfGutter / outer)
      const tiltInner = Math.asin(halfGutter / inner)
      ctx.save()
      ctx.beginPath()
      for (const [a, b] of visibleSpans(firstBand.from, firstBand.to, firstBand.cut)) {
        const insetFrom = a + edgeInset
        const insetTo = b - edgeInset
        if (insetTo <= insetFrom) continue
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, base + halfGutter, -insetFrom, -insetTo, true)
        ctx.closePath()
      }
      ctx.clip()

      ctx.fillStyle = readCssColor('--stamp', '#d62718')
      for (let index = 0; index < bars.length; index += MARKER_GROUP_SIZE) {
        const from = bars[index].from
        const to = bars[Math.min(index + MARKER_GROUP_SIZE - 1, bars.length - 1)].to
        ctx.beginPath()
        ctx.arc(cx, cy, outer, -(from + tiltOuter), -(to - tiltOuter), true)
        ctx.arc(cx, cy, inner, -(to - tiltInner), -(from + tiltInner), false)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
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
      aria-label="Resting red markers inside the first band"
    />
  )
}
