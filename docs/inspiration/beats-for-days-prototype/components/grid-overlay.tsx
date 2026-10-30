import { BAND_GUTTER, FULL_TURN, MODULE, bandWidth, gutterMid, type Geometry } from '@/lib/poster-geometry'

const RAYS = Array.from({ length: 32 }, (_, i) => i)

export function GridOverlay({ geometry: g }: { geometry: Geometry }) {
  const { w, h, px, py, margin, gap, colW, rowH, bands, rings } = g
  const far = Math.hypot(w, h)
  const at = (r: number, phi: number) => ({ x: px + r * Math.cos(phi), y: py - r * Math.sin(phi) })
  const firstCut = bands.find((b) => b.cut)
  const label = (k: number) => String(bandWidth(k))
  const widths = bands.map((b) => label(b.k)).join('·')

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40 size-full text-primary"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      {Array.from({ length: g.cols }, (_, i) => (
        <rect
          key={`c${i}`}
          x={margin + i * (colW + gap)}
          y={margin}
          width={colW}
          height={h - 2 * margin}
          fill="currentColor"
          fillOpacity={0.06}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: g.rows - 1 }, (_, i) => {
        const y = margin + (i + 1) * (rowH + gap) - gap / 2
        return (
          <line key={`r${i}`} x1={margin} x2={w - margin} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.45} strokeDasharray="3 4" />
        )
      })}

      {RAYS.map((i) => (
        <line
          key={`ray${i}`}
          x1={px}
          y1={py}
          x2={px + Math.cos(i * MODULE) * far}
          y2={py + Math.sin(i * MODULE) * far}
          stroke="currentColor"
          strokeOpacity={i % 8 === 0 ? 1 : 0.55}
          strokeWidth={i % 8 === 0 ? 1.5 : 0.75}
        />
      ))}

      {bands.map((b) => {
        const s0 = at(b.inner, b.from)
        const s1 = at(b.outer, b.from)
        const e0 = at(b.inner, b.to)
        const e1 = at(b.outer, b.to)
        return (
          <g key={`ring${b.k}`}>
            <circle cx={px} cy={py} r={b.inner} fill="none" stroke="currentColor" strokeWidth={1} />
            <circle cx={px} cy={py} r={b.outer} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeDasharray="2 4" />
            {b.to - b.from < FULL_TURN - 1e-6 && (
              <>
                <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} stroke="currentColor" strokeWidth={3} />
                <line x1={e0.x} y1={e0.y} x2={e1.x} y2={e1.y} stroke="currentColor" strokeWidth={3} />
              </>
            )}
            <text x={px + b.inner + 4} y={py + 14} fill="currentColor" fontSize={11} fontWeight={700}>
              {label(b.k)}
            </text>
          </g>
        )
      })}

      <rect x={margin} y={margin} width={w - 2 * margin} height={h - 2 * margin} fill="none" stroke="currentColor" />

      {bands.map((b) => {
        if (!b.cut) return null
        const a = at(b.inner, b.cut.lo)
        const bb = at(b.outer, b.cut.lo)
        const c = at(b.outer, b.cut.hi)
        const d = at(b.inner, b.cut.hi)
        return (
          <path
            key={`cut${b.k}`}
            d={`M ${a.x} ${a.y} L ${bb.x} ${bb.y} A ${b.outer} ${b.outer} 0 0 0 ${c.x} ${c.y} L ${d.x} ${d.y} A ${b.inner} ${b.inner} 0 0 1 ${a.x} ${a.y} Z`}
            fill="currentColor"
            fillOpacity={0.1}
            stroke="currentColor"
            strokeWidth={2}
          />
        )
      })}
      {firstCut?.cut && (
        <text x={at(firstCut.inner, firstCut.cut.lo).x + 8} y={at(firstCut.inner, firstCut.cut.lo).y - 8} fill="currentColor" fontSize={11} fontWeight={700}>
          {`TITLE CUT — ${Math.round((firstCut.cut.hi - firstCut.cut.lo) / MODULE)} × 11.25°`}
        </text>
      )}

      {g.titleRects.map((r, i) => (
        <rect key={`t${i}`} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="none" stroke="currentColor" strokeDasharray="4 3" />
      ))}
      {g.uiRects.map((r, i) => (
        <rect key={`u${i}`} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="currentColor" fillOpacity={0.05} stroke="currentColor" strokeDasharray="4 3" />
      ))}

      <circle cx={px} cy={py} r={g.spectrum.base} fill="none" stroke="currentColor" strokeDasharray="2 4" />
      <circle cx={px} cy={py} r={g.spectrum.tip} fill="none" stroke="currentColor" strokeDasharray="2 4" />
      {g.slices.length > 0 && (
        <text
          x={at(g.spectrum.base, g.slices[0].from).x + 6}
          y={at(g.spectrum.base, g.slices[0].from).y - 6}
          fill="currentColor"
          fontSize={11}
          fontWeight={700}
        >
          SPECTRUM — 2 BARS PER MODULE · 33⅓ RPM
        </text>
      )}

      <text x={px + 8} y={py - gutterMid(rings - 2, g.start) - 8} fill="currentColor" fontSize={11} fontWeight={700}>
        11.25° module
      </text>

      <g transform={`translate(${margin} ${h - margin / 2 + 4})`}>
        <text fill="currentColor" fontSize={11} fontWeight={700} letterSpacing={1.5}>
          {`GRID ${g.cols} × ${g.rows} — START +${g.startCols} COL — BAND WIDTHS ${widths}px — GUTTER ${BAND_GUTTER}px — 11.25° — AFTER MÜLLER-BROCKMANN, TONHALLE 1955`}
        </text>
      </g>
    </svg>
  )
}
