import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import { pointsForEvent } from '../../scoring/points'
import { Icon } from '../../ui/icons'

function minutesBetween(a: number, b: number) {
  return Math.max(0, Math.round((b - a) / (60 * 1000)))
}

function pointsForEventSafe(e: CalendarEvent) {
  if (e.kind === 'log') return 0
  return pointsForEvent(e)
}

export function PeopleView(props: {
  events: CalendarEvent[]
  onSelectEvent: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string | null>(null)

  const people = useMemo(() => {
    const by = new Map<string, { name: string; minutes: number; points: number; lastAt: number; eventIds: string[] }>()
    for (const e of props.events) {
      if (e.kind === 'log') continue
      const names = (e.people ?? []).map((x) => x.trim()).filter(Boolean)
      if (!names.length) continue
      const mins = minutesBetween(e.startAt, e.endAt)
      const pts = pointsForEventSafe(e)
      for (const name of names) {
        const key = name.toLowerCase()
        const row = by.get(key) ?? { name, minutes: 0, points: 0, lastAt: 0, eventIds: [] }
        row.minutes += mins
        row.points += pts
        row.lastAt = Math.max(row.lastAt, e.startAt)
        row.eventIds.push(e.id)
        by.set(key, row)
      }
    }
    const list = Array.from(by.values()).sort((a, b) => b.points - a.points || b.minutes - a.minutes)
    const needle = q.trim().toLowerCase()
    return needle ? list.filter((p) => p.name.toLowerCase().includes(needle)) : list
  }, [props.events, q])

  const activeEvents = useMemo(() => {
    if (!active) return []
    const key = active.toLowerCase()
    return props.events
      .filter((e) => (e.people ?? []).some((p) => p.toLowerCase() === key))
      .sort((a, b) => b.startAt - a.startAt)
      .slice(0, 80)
  }, [active, props.events])

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">People</h1>
            <p className="text-sm text-[#86868B] font-semibold">Social impact and time allocation.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-white/50 backdrop-blur border border-white/20 rounded-full shadow-sm flex items-center gap-2">
                <Icon name="users" size={14} className="text-[#D95D39]" />
                <span className="text-xs font-bold">{people.length} Connections</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex-1 max-w-md relative">
            <input 
              className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people..."
            />
            <div className="absolute left-3.5 top-3.5 opacity-30">
                <Icon name="tag" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex gap-8 h-full">
          <div className="flex shrink-0 basis-[20%] max-w-[20%] min-w-[220px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {people.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No people yet</div>}
            <AnimatePresence mode="popLayout">
              {people.map((p) => (
                <motion.button
                  key={p.name}
                  layout
                  onClick={() => setActive(p.name)}
                  className={`text-left p-4 rounded-[28px] border-2 transition-all flex flex-col gap-2 group ${active === p.name ? 'bg-white border-[#D95D39]/30 shadow-xl' : 'bg-white/40 border-transparent hover:bg-white/60 hover:border-black/5'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold transition-colors ${active === p.name ? 'text-[#D95D39]' : 'text-[#1C1C1E]'}`}>{p.name}</h3>
                    <span className="text-[10px] font-bold text-[#86868B] opacity-60">{p.lastAt ? new Date(p.lastAt).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F2F0ED] rounded-lg">
                        <Icon name="bolt" size={10} className="text-[#5B5F97]" />
                        <span className="text-[10px] font-bold text-[#1C1C1E]">{p.points.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F2F0ED] rounded-lg">
                        <Icon name="calendar" size={10} className="text-[#488B86]" />
                        <span className="text-[10px] font-bold text-[#1C1C1E]">{Math.round(p.minutes)}m</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex-1 pageHero overflow-hidden flex flex-col">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                  <Icon name="users" size={64} />
                  <p className="font-bold uppercase tracking-[0.2em] text-sm">Select a person to see context</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-10 py-8 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight">{active}</h2>
                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Shared History</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                  {activeEvents.map((e) => (
                    <button key={e.id} className="block w-full max-w-[33%] min-h-[96px] text-left p-6 bg-[#F2F0ED] rounded-2xl border border-transparent hover:border-[#D95D39]/20 hover:bg-white hover:shadow-lg transition-all group" onClick={() => props.onSelectEvent(e.id)}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-[#1C1C1E] group-hover:text-[#D95D39] transition-colors">{e.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-md shadow-sm uppercase tracking-tighter">{new Date(e.startAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
                        {(e.category ?? 'Uncategorized')}{e.subcategory ? ` · ${e.subcategory}` : ''} · {pointsForEventSafe(e).toFixed(1)} pts
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
