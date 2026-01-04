import { useEffect, useRef, useState } from 'react'

type AnimatedNumberOptions = {
  durationMs?: number
}

export function useAnimatedNumber(target: number, options: AnimatedNumberOptions = {}) {
  const { durationMs = 500 } = options
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const from = valueRef.current
    const to = target
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    if (from === to) {
      setValue(to)
      return
    }

    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (to - from) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return value
}
