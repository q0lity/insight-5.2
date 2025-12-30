import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '../storage/calendar'

type HabitDefLike = { id: string }

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function parseHabitTrackerKey(key: string | null | undefined) {
  if (!key?.startsWith('habit:')) return null
  const raw = key.slice('habit:'.length)
  if (!raw) return null
  const [id, suffix] = raw.split(':')
  if (!id) return null
  return { id, polarity: suffix === 'neg' ? 'negative' : 'positive' }
}

export function buildHabitHeatmap(defs: HabitDefLike[], events: CalendarEvent[], days = 365) {
  const byId = new Map<string, number[]>()
  for (const d of defs) byId.set(d.id, Array.from({ length: days }).map(() => 0))
  const today = startOfDayMs(Date.now())
  const start = today - (days - 1) * 24 * 60 * 60 * 1000

  for (const e of events) {
    if (e.kind !== 'log') continue
    const parsed = parseHabitTrackerKey(e.trackerKey)
    if (!parsed) continue
    const arr = byId.get(parsed.id)
    if (!arr) continue
    const day = startOfDayMs(e.startAt)
    const idx = Math.floor((day - start) / (24 * 60 * 60 * 1000))
    if (idx < 0 || idx >= days) continue
    const delta = parsed.polarity === 'negative' ? -1 : 1
    arr[idx] = (arr[idx] ?? 0) + delta
  }
  return byId
}

export function HabitHeatmap(props: {
  values: number[]
  startDate: Date
  showLabels?: boolean
  maxAbs?: number
  stretch?: boolean
}) {
  const totalDays = props.values.length
  const start = new Date(props.startDate)
  start.setHours(0, 0, 0, 0)
  const dayMs = 24 * 60 * 60 * 1000
  const startDow = (start.getDay() + 6) % 7 // monday=0
  const totalCells = startDow + totalDays
  const weeks = Math.ceil(totalCells / 7)
  const maxAbs = props.maxAbs ?? Math.max(1, ...props.values.map((v) => Math.abs(v)))
  const defaultCell = props.showLabels ? 10 : 6
  const minCell = props.showLabels ? 6 : 4
  const [cell, setCell] = useState(defaultCell)
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const gridRef = useRef<HTMLDivElement | null>(null)
  const labelWidth = props.showLabels ? 28 : 0

  useEffect(() => {
    if (!props.stretch) {
      setCell(defaultCell)
      return
    }
    const node = gridRef.current
    if (!node) return
    const update = () => {
      const width = node.clientWidth
      if (!width) return
      const gap = 2
      const next = Math.max(minCell, Math.floor((width - (weeks - 1) * gap) / weeks))
      setCell((prev) => (prev === next ? prev : next))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [defaultCell, minCell, props.stretch, weeks])

  function colorFor(value: number) {
    if (value === 0) return '#F2F0ED'
    const t = Math.max(0, Math.min(1, Math.abs(value) / maxAbs))
    if (value > 0) {
      return t < 0.3 ? '#ECFDF5' : t < 0.7 ? '#34D399' : '#3D8856'
    }
    return t < 0.3 ? '#FEF2F2' : t < 0.7 ? '#F87171' : '#CF423C'
  }

  const monthLabels = useMemo(() => {
    const labels: string[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w += 1) {
      const idx = w * 7 - startDow
      if (idx < 0 || idx >= totalDays) {
        labels.push('')
        continue
      }
      const d = new Date(start.getTime() + idx * dayMs)
      const m = d.getMonth()
      if (m !== lastMonth) {
        labels.push(d.toLocaleDateString(undefined, { month: 'short' }))
        lastMonth = m
      } else {
        labels.push('')
      }
    }
    return labels
  }, [dayMs, startDow, start, totalDays, weeks])

  return (
    <div className="flex flex-col gap-2">
      {props.showLabels ? (
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
          <div style={{ width: labelWidth }} />
          <div className="flex-1">
            <div className="flex items-center gap-[2px]">
              {monthLabels.map((label, w) => (
                <div key={w} style={{ width: cell }} className="text-center">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex gap-3">
        {props.showLabels ? (
          <div style={{ width: labelWidth }} className="flex flex-col gap-[3px] text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
            {dayLabels.map((d) => (
              <div key={d} style={{ height: cell }} className="leading-none">
                {d}
              </div>
            ))}
          </div>
        ) : null}
        <div ref={gridRef} className="flex-1 overflow-hidden">
          <div className="flex gap-[2px]">
            {Array.from({ length: weeks }).map((_, w) => (
              <div key={w} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, d) => {
                  const cellIdx = w * 7 + d
                  const dataIdx = cellIdx - startDow
                  if (dataIdx < 0 || dataIdx >= totalDays) {
                    return <div key={cellIdx} style={{ width: cell, height: cell }} />
                  }
                  const v = props.values[dataIdx] ?? 0
                  return (
                    <div
                      key={cellIdx}
                      style={{ width: cell, height: cell, borderRadius: props.showLabels ? 3 : 1, backgroundColor: colorFor(v) }}
                      className="transition-colors duration-500"
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
