'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { computeGeometry } from '@/lib/poster-geometry'

export function usePosterGeometry<T extends HTMLElement>(seed: number) {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setSize((prev) =>
        prev && prev.w === el.clientWidth && prev.h === el.clientHeight
          ? prev
          : { w: el.clientWidth, h: el.clientHeight },
      )
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geometry = useMemo(() => (size ? computeGeometry(size.w, size.h, seed) : null), [size, seed])

  return [ref, geometry] as const
}
