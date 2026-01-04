import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { Icon } from '../../ui/icons'

function normalizeTag(t: string) {
  const x = t.trim()
  if (!x) return null
  return x.startsWith('#') ? x : `#${x}`
}

export function TagsView(props: {
  events: CalendarEvent[]
  tasks: Task[]
  onSelectEvent: (id: string) => void
  onSelectTask: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string | null>(null)

  const tags = useMemo(() => {
    const by = new Map<string, { tag: string; count: number; lastAt: number }>()
    for (const e of props.events) {
      const t = (e.tags ?? []).map(normalizeTag).filter(Boolean) as string[]
      for (const tag of t) {
        const k = tag.toLowerCase()
        const row = by.get(k) ?? { tag, count: 0, lastAt: 0 }
        row.count += 1
        row.lastAt = Math.max(row.lastAt, e.startAt)
        by.set(k, row)
      }
    }
    for (const t of props.tasks) {
      const tagsList = (t.tags ?? []).map(normalizeTag).filter(Boolean) as string[]
      for (const tag of tagsList) {
        const k = tag.toLowerCase()
        const row = by.get(k) ?? { tag, count: 0, lastAt: 0 }
        row.count += 1
        row.lastAt = Math.max(row.lastAt, t.updatedAt)
        by.set(k, row)
      }
    }
    const list = Array.from(by.values()).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    const needle = q.trim().toLowerCase()
    return needle ? list.filter((t) => t.tag.toLowerCase().includes(needle)) : list
  }, [props.events, props.tasks, q])

  const activeEvents = useMemo(() => {
    if (!active) return []
    const k = active.toLowerCase()
    return props.events
      .filter((e) => (e.tags ?? []).some((t) => normalizeTag(t)?.toLowerCase() === k))
      .sort((a, b) => b.startAt - a.startAt)
      .slice(0, 60)
  }, [active, props.events])

  const activeTasks = useMemo(() => {
    if (!active) return []
    const k = active.toLowerCase()
    return props.tasks
      .filter((t) => (t.tags ?? []).some((x) => normalizeTag(x)?.toLowerCase() === k))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 60)
  }, [active, props.tasks])

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Tags</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">The semantic threads of your life.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-[var(--panel)]/50 backdrop-blur border border-white/20 rounded-full shadow-sm flex items-center gap-2">
                <Icon name="tag" size={14} className="text-[var(--accent)]" />
                <span className="text-xs font-bold">{tags.length} Active Tags</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex-1 max-w-md relative">
            <input 
              className="w-full h-11 bg-[var(--panel)]/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-[var(--panel)] focus:shadow-md transition-all outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tags..."
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
            {tags.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No tags yet</div>}
            <AnimatePresence mode="popLayout">
              {tags.map((t) => (
                <motion.button
                  key={t.tag}
                  layout
                  onClick={() => setActive(t.tag)}
                  className={`text-left p-4 rounded-[28px] border-2 transition-all flex flex-col gap-2 group ${active === t.tag ? 'bg-[var(--panel)] border-[#D95D39]/30 shadow-xl' : 'bg-[var(--panel)]/40 border-transparent hover:bg-[var(--panel)]/60 hover:border-black/5'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold transition-colors ${active === t.tag ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{t.tag}</h3>
                    <span className="text-[10px] font-bold text-[var(--muted)] opacity-60">{t.lastAt ? new Date(t.lastAt).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--panel)] rounded-lg">
                        <Icon name="check" size={10} className="text-[var(--accent)]" />
                        <span className="text-[10px] font-bold text-[var(--text)]">{t.count} items</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex-1 pageHero overflow-hidden flex flex-col">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                  <Icon name="tag" size={64} />
                  <p className="font-bold uppercase tracking-[0.2em] text-sm">Select a tag to filter</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-10 py-8 border-b border-black/5 flex items-center justify-between bg-[var(--panel)]/50 backdrop-blur-sm">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight">{active}</h2>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Tag Matches</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
                  {activeTasks.map((t) => (
                    <button key={t.id} className="block w-full max-w-[33%] min-h-[96px] text-left p-6 bg-[var(--panel)] rounded-2xl border border-transparent hover:border-[#D95D39]/20 hover:bg-[var(--panel)] hover:shadow-lg transition-all group" onClick={() => props.onSelectTask(t.id)}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{t.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--panel)] rounded-md shadow-sm uppercase tracking-tighter">{t.status}</span>
                      </div>
                      <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Task · {new Date(t.updatedAt).toLocaleDateString()}</div>
                    </button>
                  ))}
                  {activeEvents.map((e) => (
                    <button key={e.id} className="block w-full max-w-[33%] min-h-[96px] text-left p-6 bg-[var(--panel)] rounded-2xl border border-transparent hover:border-[#D95D39]/20 hover:bg-[var(--panel)] hover:shadow-lg transition-all group" onClick={() => props.onSelectEvent(e.id)}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{e.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--panel)] rounded-md shadow-sm uppercase tracking-tighter">{new Date(e.startAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                        {e.kind ?? 'event'} · {(e.category ?? 'Uncategorized')}
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
