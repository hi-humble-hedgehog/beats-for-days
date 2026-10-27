import {
  FULL_TURN,
  MODULE,
  bandWidth,
  gutterMid,
  type Geometry,
} from "@/lib/grid/poster-geometry";

const RAYS = Array.from({ length: 32 }, (_, i) => i);

function pointAt(
  geometry: Geometry,
  radius: number,
  phi: number,
): { x: number; y: number } {
  return {
    x: geometry.px + radius * Math.cos(phi),
    y: geometry.py - radius * Math.sin(phi),
  };
}

function ColumnGuides({ geometry: g }: { geometry: Geometry }) {
  return RAYS.slice(0, g.cols).map((_, i) => (
    <rect
      key={`c${i}`}
      x={g.margin + i * (g.colW + g.gap)}
      y={g.margin}
      width={g.colW}
      height={g.h - 2 * g.margin}
      fill="currentColor"
      fillOpacity={0.06}
      stroke="currentColor"
      strokeOpacity={0.45}
      strokeWidth={1}
    />
  ));
}

function RingGuides({ geometry: g }: { geometry: Geometry }) {
  return g.bands.map((band) => {
    const startInner = pointAt(g, band.inner, band.from);
    const startOuter = pointAt(g, band.outer, band.from);
    const endInner = pointAt(g, band.inner, band.to);
    const endOuter = pointAt(g, band.outer, band.to);
    return (
      <g key={`ring${band.k}`}>
        <circle
          cx={g.px}
          cy={g.py}
          r={band.inner}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        />
        <circle
          cx={g.px}
          cy={g.py}
          r={band.outer}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.5}
          strokeDasharray="2 4"
        />
        {band.to - band.from < FULL_TURN - 1e-6 ? (
          <>
            <line
              x1={startInner.x}
              y1={startInner.y}
              x2={startOuter.x}
              y2={startOuter.y}
              stroke="currentColor"
              strokeWidth={3}
            />
            <line
              x1={endInner.x}
              y1={endInner.y}
              x2={endOuter.x}
              y2={endOuter.y}
              stroke="currentColor"
              strokeWidth={3}
            />
          </>
        ) : null}
        <text
          x={g.px + band.inner + 4}
          y={g.py + 14}
          fill="currentColor"
          fontSize={11}
          fontWeight={700}
        >
          {bandWidth(band.k)}
        </text>
      </g>
    );
  });
}

function HitboxGuides({ geometry: g }: { geometry: Geometry }) {
  return (
    <>
      {g.titleRects.map((rect, i) => (
        <rect
          key={`t${i}`}
          x={rect.x0}
          y={rect.y0}
          width={rect.x1 - rect.x0}
          height={rect.y1 - rect.y0}
          fill="none"
          stroke="currentColor"
          strokeDasharray="4 3"
        />
      ))}
      {g.uiRects.map((rect, i) => (
        <rect
          key={`u${i}`}
          x={rect.x0}
          y={rect.y0}
          width={rect.x1 - rect.x0}
          height={rect.y1 - rect.y0}
          fill="currentColor"
          fillOpacity={0.05}
          stroke="currentColor"
          strokeDasharray="4 3"
        />
      ))}
    </>
  );
}

function OverlayCaption({ geometry: g }: { geometry: Geometry }) {
  const firstCut = g.bands.find((band) => band.cut);
  return (
    <>
      {firstCut?.cut ? (
        <text
          x={pointAt(g, firstCut.inner, firstCut.cut.lo).x + 8}
          y={pointAt(g, firstCut.inner, firstCut.cut.lo).y - 8}
          fill="currentColor"
          fontSize={11}
          fontWeight={700}
        >
          {`TITLE CUT — ${Math.round((firstCut.cut.hi - firstCut.cut.lo) / MODULE)} × 11.25°`}
        </text>
      ) : null}
      <text
        x={g.px + 8}
        y={g.py - gutterMid(Math.max(0, g.rings - 2), g.start) - 8}
        fill="currentColor"
        fontSize={11}
        fontWeight={700}
      >
        11.25° module
      </text>
      <text
        x={g.margin}
        y={g.h - g.margin / 2 + 4}
        fill="currentColor"
        fontSize={11}
        fontWeight={700}
        letterSpacing={1.5}
      >
        AFTER MÜLLER-BROCKMANN, TONHALLE 1955
      </text>
    </>
  );
}

function CutWedges({ geometry: g }: { geometry: Geometry }) {
  return g.bands.map((band) => {
    if (!band.cut) return null;
    const a = pointAt(g, band.inner, band.cut.lo);
    const b = pointAt(g, band.outer, band.cut.lo);
    const c = pointAt(g, band.outer, band.cut.hi);
    const d = pointAt(g, band.inner, band.cut.hi);
    return (
      <path
        key={`cut${band.k}`}
        d={`M ${a.x} ${a.y} L ${b.x} ${b.y} A ${band.outer} ${band.outer} 0 0 0 ${c.x} ${c.y} L ${d.x} ${d.y} A ${band.inner} ${band.inner} 0 0 1 ${a.x} ${a.y} Z`}
        fill="currentColor"
        fillOpacity={0.1}
        stroke="currentColor"
        strokeWidth={2}
      />
    );
  });
}

function ModuleRays({ geometry: g }: { geometry: Geometry }) {
  const far = Math.hypot(g.w, g.h);
  return (
    <>
      {Array.from({ length: g.rows - 1 }, (_, i) => {
        const y = g.margin + (i + 1) * (g.rowH + g.gap) - g.gap / 2;
        return (
          <line
            key={`r${i}`}
            x1={g.margin}
            x2={g.w - g.margin}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeDasharray="3 4"
          />
        );
      })}
      {RAYS.map((i) => (
        <line
          key={`ray${i}`}
          x1={g.px}
          y1={g.py}
          x2={g.px + Math.cos(i * MODULE) * far}
          y2={g.py + Math.sin(i * MODULE) * far}
          stroke="currentColor"
          strokeOpacity={i % 8 === 0 ? 1 : 0.55}
          strokeWidth={i % 8 === 0 ? 1.5 : 0.75}
        />
      ))}
    </>
  );
}

/**
 * Müller-Brockmann construction overlay: 11.25° rays, modules, rings, and cuts.
 */
export function GridOverlay({ geometry: g }: { geometry: Geometry }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40 size-full text-primary"
      viewBox={`0 0 ${g.w} ${g.h}`}
      aria-hidden="true"
    >
      <ColumnGuides geometry={g} />
      <ModuleRays geometry={g} />
      <RingGuides geometry={g} />
      <rect
        x={g.margin}
        y={g.margin}
        width={g.w - 2 * g.margin}
        height={g.h - 2 * g.margin}
        fill="none"
        stroke="currentColor"
      />
      <CutWedges geometry={g} />
      <HitboxGuides geometry={g} />
      <OverlayCaption geometry={g} />
    </svg>
  );
}
