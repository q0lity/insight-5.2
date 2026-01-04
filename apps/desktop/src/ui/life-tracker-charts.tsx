import { useRef, useState, useEffect } from 'react'

export type SeriesPoint = { x: number; y: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function mapToPath(points: SeriesPoint[], width: number, height: number, padding: number) {
  if (points.length === 0) return ''
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const xScale = (x: number) => {
    if (maxX === minX) return padding
    return padding + ((x - minX) / (maxX - minX)) * (width - padding * 2)
  }
  const yScale = (y: number) => {
    if (maxY === minY) return height - padding
    const t = (y - minY) / (maxY - minY)
    return height - padding - t * (height - padding * 2)
  }

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
    .join(' ')
}

export function LtEmptyChart(props: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
      <div className="w-12 h-12 rounded-full border-2 border-dashed mb-4 flex items-center justify-center" style={{ borderColor: 'var(--muted)' }}>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>?</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{props.message}</p>
    </div>
  )
}

export function LtLineAreaChart(props: { points: SeriesPoint[]; color?: string }) {
  const width = 560
  const height = 200
  const padding = 32
  const stroke = props.color ?? '#D95D39'

  if (props.points.length < 2) return <LtEmptyChart message="No data yet" />

  const linePath = mapToPath(props.points, width, height, padding)
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img">
      <defs>
        <linearGradient id={`grad-${stroke}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* grid */}
      {Array.from({ length: 3 }).map((_, i) => {
        const y = padding + (i / 2) * (height - padding * 2)
        return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="1" />
      })}

      <path d={areaPath} fill={`url(#grad-${stroke})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'url(#glow)' }} />

      {/* points */}
      {props.points.map((p, i) => {
        const xs = props.points.map((q) => q.x)
        const ys = props.points.map((q) => q.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const x = padding + ((p.x - minX) / (maxX - minX)) * (width - padding * 2)
        const t = (p.y - minY) / (maxY - minY || 1)
        const y = height - padding - t * (height - padding * 2)
        return <circle key={i} cx={x} cy={y} r="5" fill="var(--panel)" stroke={stroke} strokeWidth="3" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
      })}
    </svg>
  )
}

export function LtBarChart(props: { values: number[]; color?: string }) {
  const width = 560
  const height = 200
  const padding = 32
  const stroke = props.color ?? '#D95D39'
  const values = props.values

  if (values.length === 0) return <LtEmptyChart message="No data yet" />

  const max = Math.max(...values, 1)
  const barW = (width - padding * 2) / values.length

  return (
    <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img">
      {/* grid */}
      {Array.from({ length: 3 }).map((_, i) => {
        const y = padding + (i / 2) * (height - padding * 2)
        return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="1" />
      })}

      {values.map((v, i) => {
        const h = ((height - padding * 2) * v) / max
        const x = padding + i * barW + barW * 0.2
        const y = height - padding - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW * 0.6}
            height={h}
            rx="8"
            fill={stroke}
            className="transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{ filter: v === max ? 'drop-shadow(0 4px 12px ' + stroke + '44)' : 'none' }}
          />
        )
      })}
    </svg>
  )
}

export function LtHeatmap(props: {
  valuesByDay: Array<{ dayIndex: number; value: number }>
  maxValue: number
  label?: string
  days?: number
  showLabels?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800) // sensible default

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const totalDays = Math.max(1, props.days ?? props.valuesByDay.length)
  const weeks = Math.ceil(totalDays / 7)
  const days = 7
  const showLabels = props.showLabels ?? true

  // Dynamic cell size based on container width and time range
  const labelWidth = showLabels ? 36 : 0 // day labels width (Mon, Tue, etc.)
  const availableWidth = containerWidth - labelWidth - 8 // some padding
  const maxCellSize = 16
  const minCellSize = 6
  // Calculate cell size to fit all weeks with 4px gaps
  const idealCellWithGap = availableWidth / weeks
  const calculatedSize = Math.floor(idealCellWithGap) - 4 // 4px gap between columns
  const cell = clamp(calculatedSize, minCellSize, maxCellSize)
  const gap = 4
  const max = props.maxValue || 10
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (totalDays - 1))
  const startDow = (start.getDay() + 6) % 7
  const totalCells = startDow + totalDays
  const labelWeeks = Math.ceil(totalCells / 7)

  const map = new Map(props.valuesByDay.map((d) => [d.dayIndex, d.value]))

  // Heatmap intensity levels - uses CSS variables for theme compatibility
  function getOpacity(value: number): number {
    const t = clamp(value / max, 0, 1)
    if (t === 0) return 0
    return t < 0.3 ? 0.25 : t < 0.7 ? 0.55 : 1
  }

  const monthLabels = Array.from({ length: labelWeeks }).map((_, w) => {
    const idx = w * 7 - startDow
    if (idx < 0 || idx >= totalDays) return ''
    const d = new Date(start.getTime() + idx * 24 * 60 * 60 * 1000)
    if (d.getDate() === 1 || w === 0) return d.toLocaleDateString(undefined, { month: 'short' })
    return ''
  })
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div ref={containerRef} className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--muted)' }}>{props.label ?? 'ACTIVITY'}</span>
        <div className="flex gap-1">
          {[0.1, 0.5, 1].map((v) => (
            <div key={v} className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--accent)', opacity: getOpacity(v * max) || 0.1 }} />
          ))}
        </div>
      </div>
      {showLabels ? (
        <div className="flex gap-[4px] text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)', paddingLeft: labelWidth }}>
          {monthLabels.map((label, w) => (
            <div key={w} style={{ width: cell }} className="text-center">
              {label}
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        {showLabels ? (
          <div className="flex flex-col gap-[4px] text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--muted)', width: labelWidth - 8 }}>
            {dayLabels.map((d) => (
              <div key={d} style={{ height: cell }} className="leading-none flex items-center">
                {d}
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-[4px] flex-1 overflow-hidden">
          {Array.from({ length: labelWeeks }).map((_, w) => (
            <div key={w} className="flex flex-col gap-[4px]">
              {Array.from({ length: days }).map((_, d) => {
                const cellIdx = w * 7 + d
                const dataIdx = cellIdx - startDow
                if (dataIdx < 0 || dataIdx >= totalDays) {
                  return <div key={cellIdx} style={{ width: cell, height: cell }} />
                }
                const value = map.get(dataIdx) ?? 0
                const opacity = getOpacity(value)
                return (
                  <div
                    key={cellIdx}
                    style={{
                      width: cell,
                      height: cell,
                      borderRadius: 3,
                      backgroundColor: opacity === 0 ? 'var(--border)' : 'var(--accent)',
                      opacity: opacity === 0 ? 0.5 : opacity,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
