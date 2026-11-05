import {
  mottleAlphaMatrix,
  PAPER_TILE,
  poreAlphaMatrix,
  PRINTED_INK_FILTER_ID,
  resolvePrintedInkParams,
  type PrintedInkParams,
} from "@/lib/theme/printed-ink";

// The tile is grayscale (R == G == B): feeding it straight into both
// displacement channels would only warp along the 45° diagonal. Instead we
// take its horizontal / vertical slopes (Sobel, centred at 0.5) and pack them
// into R and G, so glyph edges slide along the paper relief in 2D.
// (A second, phase-shifted <feImage> is not an option: Chrome clips negative
// offsets to the filter region, leaving transparent holes in the tiling.)
const SOBEL_X = "-1 0 1 -2 0 2 -1 0 1";
const SOBEL_Y = "-1 -2 -1 0 0 0 1 2 1";
const TO_RED = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1";
const TO_GREEN = "0 0 0 0 0  1 0 0 0 0  0 0 0 0 0  0 0 0 0 1";

interface PrintedInkFilterProps {
  params?: Partial<PrintedInkParams>;
}

interface StageProps {
  p: PrintedInkParams;
}

/** 1. Edge bleed: high-frequency micro displacement. In: SourceGraphic. */
function EdgeBleed({ p }: StageProps) {
  return (
    <>
      <feTurbulence
        type="fractalNoise"
        baseFrequency={p.edgeBleedFrequency}
        numOctaves={3}
        seed={1}
        result="edgeNoise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="edgeNoise"
        scale={p.edgeBleedScale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="bled"
      />
    </>
  );
}

function Slope({ kernel, result }: { kernel: string; result: string }) {
  return (
    <feConvolveMatrix
      in="relief"
      order={3}
      kernelMatrix={kernel}
      divisor={1}
      bias={0.5}
      preserveAlpha="true"
      result={result}
    />
  );
}

/** 2. Surface warp: displace along the paper tile's relief. In: bled. */
function SurfaceWarp({ p }: StageProps) {
  return (
    <>
      <feImage
        href={PAPER_TILE.href}
        x="0"
        y="0"
        width={PAPER_TILE.size}
        height={PAPER_TILE.size}
        preserveAspectRatio="none"
        result="tile"
      />
      <feTile in="tile" result="paper" />
      {/* Smooth the fibres into relief so glyphs bend rather than jitter. */}
      <feGaussianBlur in="paper" stdDeviation={2} result="relief" />
      <Slope kernel={SOBEL_X} result="slopeX" />
      <Slope kernel={SOBEL_Y} result="slopeY" />
      <feColorMatrix in="slopeX" values={TO_RED} result="warpX" />
      <feColorMatrix in="slopeY" values={TO_GREEN} result="warpY" />
      <feComposite
        in="warpX"
        in2="warpY"
        operator="arithmetic"
        k2={1}
        k3={1}
        result="warpMap"
      />
      <feDisplacementMap
        in="bled"
        in2="warpMap"
        scale={p.surfaceWarpScale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="warped"
      />
    </>
  );
}

/**
 * 3. Ink coverage: sparse pinholes x broad density patches, applied to alpha
 * so the real paper shows through (via multiply). In: warped.
 */
function InkCoverage({ p }: StageProps) {
  return (
    <>
      <feTurbulence
        type="fractalNoise"
        baseFrequency={p.poreFrequency}
        numOctaves={2}
        seed={4}
        result="poreNoise"
      />
      <feColorMatrix
        in="poreNoise"
        values={poreAlphaMatrix(p.poreDensity)}
        result="poreAlpha"
      />
      <feTurbulence
        type="fractalNoise"
        baseFrequency={p.mottleFrequency}
        numOctaves={3}
        seed={9}
        result="mottleNoise"
      />
      <feColorMatrix
        in="mottleNoise"
        values={mottleAlphaMatrix(p.mottleAmount)}
        result="mottleAlpha"
      />
      <feComposite
        in="poreAlpha"
        in2="mottleAlpha"
        operator="arithmetic"
        k1={1}
        result="coverage"
      />
      <feComposite in="warped" in2="coverage" operator="in" />
    </>
  );
}

/**
 * Global, invisible SVG filter definition. Render once in the root layout;
 * apply with the `.printed-ink` class.
 */
export function PrintedInkFilter({ params }: PrintedInkFilterProps) {
  const p = resolvePrintedInkParams(params);
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute overflow-hidden"
    >
      <defs>
        <filter
          id={PRINTED_INK_FILTER_ID}
          x="-3%"
          y="-15%"
          width="106%"
          height="130%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <EdgeBleed p={p} />
          <SurfaceWarp p={p} />
          <InkCoverage p={p} />
        </filter>
      </defs>
    </svg>
  );
}
