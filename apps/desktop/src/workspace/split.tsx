import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

export function SplitView(props: {
  left: ReactNode
  right: ReactNode
  storageKey?: string
  minLeftPx?: number
  minRightPx?: number
  defaultRatio?: number
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const key = props.storageKey ?? 'insight5.ui.split.v1'
  const [ratio, setRatio] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(key)
      const fallback = typeof props.defaultRatio === 'number' ? props.defaultRatio : 0.52
      const n = raw ? Number(raw) : fallback
      return Number.isFinite(n) ? Math.max(0.2, Math.min(0.8, n)) : 0.52
    } catch {
      return 0.52
    }
  })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(key, String(ratio))
    } catch {
      // ignore
    }
  }, [key, ratio])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const x = e.clientX - rect.left
      const nextRatio = x / rect.width
      const minLeft = props.minLeftPx ?? 360
      const minRight = props.minRightPx ?? 360
      const minRatio = minLeft / rect.width
      const maxRatio = 1 - minRight / rect.width
      setRatio(Math.max(minRatio, Math.min(maxRatio, nextRatio)))
    }

    function onUp() {
      setDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, props.minLeftPx, props.minRightPx])

  return (
    <div ref={rootRef} className={dragging ? 'wsSplit dragging' : 'wsSplit'}>
      <div className="wsPane" style={{ width: `${ratio * 100}%` }}>
        {props.left}
      </div>
      <div className="wsDivider" onMouseDown={() => setDragging(true)} role="separator" aria-label="Resize panels" />
      <div className="wsPane" style={{ width: `${(1 - ratio) * 100}%` }}>
        {props.right}
      </div>
    </div>
  )
}
