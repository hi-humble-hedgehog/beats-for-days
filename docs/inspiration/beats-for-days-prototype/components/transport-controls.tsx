'use client'

import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import { formatTime } from '@/lib/audio-bands'
import { cn } from '@/lib/utils'

type Props = {
  isPlaying: boolean
  currentTime: number
  duration: number
  muted: boolean
  showGrid: boolean
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (t: number) => void
  onToggleMute: () => void
  onToggleGrid: () => void
}

const squareButton =
  'flex size-11 shrink-0 items-center justify-center border-2 border-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'

export function TransportControls({
  isPlaying,
  currentTime,
  duration,
  muted,
  showGrid,
  onToggle,
  onNext,
  onPrevious,
  onSeek,
  onToggleMute,
  onToggleGrid,
}: Props) {
  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col gap-2 border-t-2 border-foreground pt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous beat"
          className={`${squareButton} hover:bg-foreground hover:text-background`}
        >
          <SkipBack className="size-5 fill-current" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`${squareButton} border-primary bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground hover:text-background`}
        >
          {isPlaying ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="size-5 fill-current" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next beat"
          className={`${squareButton} hover:bg-foreground hover:text-background`}
        >
          <SkipForward className="size-5 fill-current" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={muted}
          className={`${squareButton} hover:bg-foreground hover:text-background ${muted ? 'border-primary text-primary' : ''}`}
        >
          {muted ? (
            <VolumeX className="size-5" aria-hidden />
          ) : (
            <Volume2 className="size-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleGrid}
          aria-pressed={showGrid}
          aria-keyshortcuts="G"
          className="ml-auto flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-primary focus-visible:outline-2"
        >
          <span
            className={cn(
              'grid size-4 grid-cols-2 gap-px border border-current',
              showGrid && 'bg-primary text-primary',
            )}
            aria-hidden
          />
          Grid
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 text-sm font-medium tabular-nums">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="swiss-range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
        <span className="w-10 text-right text-sm font-medium tabular-nums text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>

      <nav
        aria-label="Information"
        className="flex items-center gap-3 border-t border-foreground/30 pt-2 text-sm font-bold uppercase tracking-wider"
      >
        <Link href="/about" className="transition-colors hover:text-primary focus-visible:outline-2">
          About
        </Link>
        <span className="text-primary" aria-hidden="true">
          /
        </span>
        <Link href="/terms" className="transition-colors hover:text-primary focus-visible:outline-2">
          Terms
        </Link>
      </nav>
    </div>
  )
}
