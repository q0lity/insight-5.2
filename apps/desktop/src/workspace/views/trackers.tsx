import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../../storage/calendar'
import { Icon } from '../../ui/icons'
import { MetaEditor } from '../../ui/MetaEditor'
import { TrackerUnitEditor } from '../../ui/TrackerUnitEditor'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { emptySharedMeta, loadTrackerDefs, saveTrackerDefs, type TrackerDef } from '../../storage/ecosystem'

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function parseTrackerValue(title: string) {
  const match = title.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function makeId() {
  return `tracker_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function numberOrNull(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function parsePresetDraft(raw: string) {
  return raw
    .split(/[,\s]+/)
    .map((p) => Number(p))
    .filter((p) => Number.isFinite(p))
}

export function TrackersView(props: {
  events: CalendarEvent[]
  trackerDefs?: TrackerDef[]
  trackerKey?: string | null
  onSelectTracker?: (key: string | null) => void
  onTrackerDefsChange?: (defs: TrackerDef[]) => void
}) {
  const [defs, setDefs] = useState<TrackerDef[]>(() => props.trackerDefs ?? loadTrackerDefs())
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const key = normalizeKey(props.trackerKey)
    return key || null
  })
  const [presetDrafts, setPresetDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const def of defs) next[def.key] = def.unit.presets.join(', ')
    setPresetDrafts(next)
  }, [defs])

  useEffect(() => {
    if (!props.trackerDefs) return
    setDefs(props.trackerDefs)
  }, [props.trackerDefs])

  useEffect(() => {
    if (!props.trackerKey) {
      setActiveKey(null)
      return
    }
    const key = normalizeKey(props.trackerKey)
    if (!key) return
    setActiveKey(key)
  }, [props.trackerKey])

  const trackerStats = useMemo(() => {
    const stats = new Map<string, { lastValue: number | null; lastAt: number | null; avg: number | null }>()
    const accum = new Map<string, number[]>()

    for (const ev of props.events) {
      if (ev.kind !== 'log') continue
      if (!ev.trackerKey) continue
      if (ev.trackerKey.startsWith('habit:')) continue
      const key = normalizeKey(ev.trackerKey)
      if (!key) continue
      const value = parseTrackerValue(ev.title)
      if (value == null) continue
      const list = accum.get(key) ?? []
      list.push(value)
      accum.set(key, list)
      const existing = stats.get(key)
      if (!existing || (ev.startAt ?? 0) > (existing.lastAt ?? 0)) {
        stats.set(key, { lastValue: value, lastAt: ev.startAt ?? null, avg: null })
      }
    }

    for (const [key, values] of accum.entries()) {
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
      const existing = stats.get(key)
      stats.set(key, { lastValue: existing?.lastValue ?? null, lastAt: existing?.lastAt ?? null, avg })
    }

    return stats
  }, [props.events])

  const rows = useMemo(() => {
    return defs
      .filter((def) => def.label.toLowerCase().includes(query.trim().toLowerCase()) || def.key.includes(query.trim().toLowerCase()))
      .map((def) => ({
        ...def,
        stats: trackerStats.get(def.key) ?? { lastValue: null, lastAt: null, avg: null },
      }))
  }, [defs, query, trackerStats])

  function updateDefs(next: TrackerDef[]) {
    setDefs(next)
    saveTrackerDefs(next)
    props.onTrackerDefsChange?.(next)
  }

  function updateDef(key: string, patch: Partial<TrackerDef>) {
    const next = defs.map((def) => (def.key === key ? { ...def, ...patch } : def))
    updateDefs(next)
  }

  const activeDef = activeKey ? defs.find((d) => d.key === activeKey) ?? null : null
  const activeStats = activeKey ? trackerStats.get(activeKey) ?? null : null

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Trackers</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">Edit tracker units, presets, and linked metadata.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-6">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <input
              className="w-full h-11 bg-[var(--glass2)] border border-[var(--border)] rounded-2xl px-10 text-sm font-medium focus:bg-[var(--glass3)] focus:shadow-[0_10px_24px_var(--glowSoft)] transition-all outline-none backdrop-blur"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter trackers..."
            />
            <div className="absolute left-3.5 top-3.5 opacity-30">
              <Icon name="tag" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-[260px] max-w-md w-full">
            <input
              className="flex-1 h-11 bg-[var(--glass2)] border border-[var(--border)] rounded-2xl px-4 text-sm font-medium focus:bg-[var(--glass3)] focus:shadow-[0_10px_24px_var(--glowSoft)] transition-all outline-none backdrop-blur"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="New tracker name..."
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const name = draft.trim()
                if (!name) return
                const key = slugify(name)
                if (!key) return
                const existing = defs.find((d) => d.key === key)
                if (existing) {
                  setActiveKey(existing.key)
                  props.onSelectTracker?.(existing.key)
                } else {
                  const next: TrackerDef = {
                    id: makeId(),
                    key,
                    label: name,
                    createdAt: Date.now(),
                    unit: { label: 'value', min: null, max: null, step: null, presets: [] },
                    meta: emptySharedMeta(),
                  }
                  updateDefs([next, ...defs])
                  setActiveKey(next.key)
                  props.onSelectTracker?.(next.key)
                }
                setDraft('')
              }}
            />
            <button
              className="h-11 px-4 rounded-2xl bg-[var(--glass2)] border border-[var(--border)] text-xs font-bold hover:bg-[var(--glass3)] transition-all"
              onClick={() => {
                const name = draft.trim()
                if (!name) return
                const key = slugify(name)
                if (!key) return
                const existing = defs.find((d) => d.key === key)
                if (existing) {
                  setActiveKey(existing.key)
                  props.onSelectTracker?.(existing.key)
                } else {
                  const next: TrackerDef = {
                    id: makeId(),
                    key,
                    label: name,
                    createdAt: Date.now(),
                    unit: { label: 'value', min: null, max: null, step: null, presets: [] },
                    meta: emptySharedMeta(),
                  }
                  updateDefs([next, ...defs])
                  setActiveKey(next.key)
                  props.onSelectTracker?.(next.key)
                }
                setDraft('')
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-10 h-full">
          <div className="glassCard overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracker</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Presets</TableHead>
                  <TableHead>Last</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
                      No trackers yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.key}
                      data-state={activeKey === row.key ? 'selected' : undefined}
                      className="cursor-pointer"
                      onClick={() => {
                        setActiveKey(row.key)
                        props.onSelectTracker?.(row.key)
                      }}
                    >
                      <TableCell>
                        <input
                          className="w-full bg-transparent text-sm font-semibold"
                          value={row.label}
                          onChange={(e) => updateDef(row.key, { label: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-full bg-transparent text-xs"
                          value={row.unit.label}
                          onChange={(e) => updateDef(row.key, { unit: { ...row.unit, label: e.target.value || 'value' } })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-16 bg-transparent text-xs"
                          value={row.unit.min ?? ''}
                          onChange={(e) => updateDef(row.key, { unit: { ...row.unit, min: numberOrNull(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-16 bg-transparent text-xs"
                          value={row.unit.max ?? ''}
                          onChange={(e) => updateDef(row.key, { unit: { ...row.unit, max: numberOrNull(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-16 bg-transparent text-xs"
                          value={row.unit.step ?? ''}
                          onChange={(e) => updateDef(row.key, { unit: { ...row.unit, step: numberOrNull(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-full bg-transparent text-xs"
                          value={presetDrafts[row.key] ?? ''}
                          onChange={(e) => setPresetDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                          onBlur={(e) => updateDef(row.key, { unit: { ...row.unit, presets: parsePresetDraft(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted)]">
                        {row.stats.lastValue ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <aside className="glassCard h-full overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold">Details</h3>
              <p className="text-xs text-[var(--muted)]">Tune defaults and shared properties.</p>
            </div>

            {!activeDef ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-3">
                <Icon name="droplet" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Select a tracker</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Tracker</div>
                  <div className="text-lg font-bold">{activeDef.label}</div>
                  <div className="text-xs text-[var(--muted)]">Key: {activeDef.key}</div>
                </div>

                <div className="detailGrid">
                  <label>
                    Default value
                    <input
                      className="detailSmall"
                      value={activeDef.defaultValue ?? ''}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        updateDef(activeDef.key, { defaultValue: Number.isFinite(value) ? value : null })
                      }}
                    />
                  </label>
                  <label>
                    Last logged
                    <input
                      className="detailSmall"
                      value={activeStats?.lastAt ? new Date(activeStats.lastAt).toLocaleDateString() : '—'}
                      readOnly
                    />
                  </label>
                </div>

                <TrackerUnitEditor
                  unit={activeDef.unit}
                  onChange={(unit) => updateDef(activeDef.key, { unit })}
                />

                <MetaEditor
                  value={activeDef.meta}
                  onChange={(meta) => updateDef(activeDef.key, { meta })}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
