'use client'

import { useEffect, useState } from 'react'
import { useBeatPlayer } from '@/hooks/use-beat-player'
import { usePosterGeometry } from '@/hooks/use-poster-geometry'
import { formatBeatNumber } from '@/lib/audio-bands'
import { cn } from '@/lib/utils'
import { GridOverlay } from './grid-overlay'
import { SpectrumBars } from './spectrum-bars'
import { TransportControls } from './transport-controls'
import { VinylVisualizer } from './vinyl-visualizer'

export function BeatPlayer() {
  const player = useBeatPlayer()
  const [mainRef, geometry] = usePosterGeometry<HTMLElement>(player.current)
  const [showGrid, setShowGrid] = useState(false)
  const number = formatBeatNumber(player.current)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return
      setShowGrid((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const beatNumber = geometry && (
    <p
      key={number}
      className="w-full animate-in fade-in slide-in-from-bottom-6 text-right duration-500 font-bold leading-[0.78] tracking-[-0.07em] tabular-nums"
      style={{ fontSize: geometry.numberSize }}
      aria-label={`Now playing beat number ${number}`}
    >
      <span className="text-primary">#</span>
      {number}
    </p>
  )

  return (
    <main ref={mainRef} className="relative h-dvh min-h-150 overflow-hidden">
      <audio {...player.audioProps} />

      {geometry && (
        <>
          <SpectrumBars geometry={geometry} />
          <VinylVisualizer geometry={geometry} />

          <header className="absolute z-20 flex flex-col gap-3" style={{ left: geometry.margin, top: geometry.margin }}>
            <h1 className="text-3xl font-bold leading-[0.85] tracking-tighter md:text-5xl">
              Beats
              <br />
              for Days
            </h1>
            <p className="hidden text-sm font-medium leading-snug md:block">
              Infinite instrumental series
              <br />
              <span className="text-muted-foreground">Unreleased. Unnamed. Unending.</span>
            </p>
          </header>

          <section
            className="absolute z-20 flex flex-col justify-end gap-2 md:gap-4"
            style={{
              left: geometry.px + geometry.gap / 2,
              top: geometry.py + geometry.gap / 2,
              right: geometry.margin,
              bottom: geometry.margin,
            }}
            aria-label="Player"
          >
            <div
              className={cn('flex w-full justify-end', !geometry.mobile && 'max-w-sm')}
              style={{ paddingTop: 12 }}
            >
              {beatNumber}
              <p className="sr-only" aria-live="polite">
                {player.isPlaying ? 'On air' : 'Paused'}
              </p>
            </div>

            <div className={cn('w-full', !geometry.mobile && 'max-w-sm')}>
              <TransportControls
                isPlaying={player.isPlaying}
                currentTime={player.currentTime}
                duration={player.duration}
                muted={player.muted}
                showGrid={showGrid}
                onToggle={player.toggle}
                onNext={player.next}
                onPrevious={player.previous}
                onSeek={player.seek}
                onToggleMute={player.toggleMute}
                onToggleGrid={() => setShowGrid((v) => !v)}
              />
            </div>
          </section>

          {showGrid && <GridOverlay geometry={geometry} />}
        </>
      )}
    </main>
  )
}
