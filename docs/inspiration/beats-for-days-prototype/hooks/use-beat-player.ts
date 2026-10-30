'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PRESSED: Record<number, string> = {
  1: '/beats/0001.wav',
  629: '/beats/0629.wav',
  1502: '/beats/1502.wav',
}
const POOL = Object.values(PRESSED)
const DEFAULT_VOLUME = 0.8

// Prototype: any number beyond the three pressings borrows one of them.
const srcFor = (n: number) => PRESSED[n] ?? POOL[n % POOL.length]

function randomBeatNumber(exclude: number) {
  let n = exclude
  while (n === exclude) n = Math.floor(Math.random() * 99) + 1
  return n
}

export function useBeatPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const shouldPlayRef = useRef(false)

  const [queue, setQueue] = useState({ history: [629, 1502, 1], index: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)

  const current = queue.history[queue.index]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const src = srcFor(current)
    if (!audio.src.endsWith(src)) {
      audio.src = src
      audio.load()
    } else {
      audio.currentTime = 0
    }
    setCurrentTime(0)
    if (shouldPlayRef.current) audio.play().catch(() => {})
  }, [current])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : DEFAULT_VOLUME
  }, [muted])

  const play = useCallback(() => {
    shouldPlayRef.current = true
    audioRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    shouldPlayRef.current = false
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) play()
    else pause()
  }, [play, pause])

  const next = useCallback(() => {
    setQueue((q) =>
      q.index < q.history.length - 1
        ? { ...q, index: q.index + 1 }
        : {
            history: [...q.history, randomBeatNumber(q.history[q.history.length - 1])],
            index: q.index + 1,
          },
    )
  }, [])

  const previous = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setQueue((q) => (q.index > 0 ? { ...q, index: q.index - 1 } : q))
    if (audio && queue.index === 0) audio.currentTime = 0
  }, [queue.index])

  const seek = useCallback((t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') return
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.code === 'ArrowRight') next()
      else if (e.code === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, next, previous])

  const audioProps = {
    ref: audioRef,
    preload: 'auto' as const,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setCurrentTime(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setDuration(e.currentTarget.duration),
    onEnded: next,
  }

  return {
    audioProps,
    current,
    src: srcFor(current),
    pressing: queue.index + 1,
    isPlaying,
    currentTime,
    duration,
    muted,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    toggleMute: () => setMuted((m) => !m),
  }
}
