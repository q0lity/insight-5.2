import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { InboxCapture } from '../../storage/inbox'
import { Icon } from '../../ui/icons'
import { toggleChecklistLine } from '../../ui/checklist'
import { MarkdownView } from '../../ui/markdown'
import { extractInlineTokenStrings } from '../../markdown/schema'

function firstLine(text: string) {
  return (text.split(/\r?\n/)[0] ?? '').trim() || 'Untitled'
}

function splitBlocks(text: string) {
  const trimmed = text.trimEnd()
  if (!trimmed) return ['']
  return trimmed.split(/\n{2,}/)
}

function joinBlocks(blocks: string[]) {
  return blocks.map((b) => b.trimEnd()).join('\n\n').trimEnd()
}

function timestampBullet(at = new Date()) {
  const hh = String(at.getHours()).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')
  return `- [${hh}:${mm}] `
}

function extractTags(text: string) {
  return extractInlineTokenStrings(text)
}

export function NotesView(props: {
  captures: InboxCapture[]
  selectedCaptureId: string | null
  onSelectCapture: (id: string) => void
  onOpenCapture: () => void
  onUpdateCapture: (id: string, rawText: string) => void
}) {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'list' | 'explorer'>('explorer')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const lastSaved = useRef<string>('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = activeTag
      ? props.captures.filter((c) => extractTags(c.rawText).includes(activeTag))
      : props.captures
    const searched = needle ? base.filter((c) => c.rawText.toLowerCase().includes(needle)) : base
    const sorted = [...searched].sort((a, b) => {
      if (sort === 'title') return firstLine(a.rawText).localeCompare(firstLine(b.rawText))
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return b.createdAt - a.createdAt
    })
    return sorted.slice(0, 250)
  }, [activeTag, props.captures, q, sort])

  const selected = useMemo(
    () => props.captures.find((c) => c.id === props.selectedCaptureId) ?? null,
    [props.captures, props.selectedCaptureId],
  )

  useEffect(() => {
    setDraft(selected?.rawText ?? '')
    lastSaved.current = selected?.rawText ?? ''
  }, [selected?.id])

  useEffect(() => {
    if (!selected) return
    if (draft === lastSaved.current) return
    const handle = window.setTimeout(() => {
      if (!selected) return
      lastSaved.current = draft
      props.onUpdateCapture(selected.id, draft)
    }, 500)
    return () => window.clearTimeout(handle)
  }, [draft, props, selected])

  const blocks = useMemo(() => splitBlocks(draft), [draft])
  const allTags = useMemo(
    () => Array.from(new Set(props.captures.flatMap((c) => extractTags(c.rawText)))).slice(0, 20),
    [props.captures],
  )

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Notes</h1>
            <p className="text-sm text-[#86868B] font-semibold">Every capture is a seed for reflection.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white/50 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#86868B]">
              <span>Sort</span>
              <select
                className="bg-transparent text-[#1C1C1E] font-bold outline-none"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="recent">Recent</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="flex p-1 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm">
              <button 
                className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'explorer' ? 'bg-white shadow-md text-[#1C1C1E]' : 'text-[#86868B]'}`}
                onClick={() => setMode('explorer')}
              >
                Explorer
              </button>
              <button 
                className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'list' ? 'bg-white shadow-md text-[#1C1C1E]' : 'text-[#86868B]'}`}
                onClick={() => setMode('list')}
              >
                List
              </button>
            </div>
            <button 
              onClick={props.onOpenCapture}
              className="h-12 px-6 bg-[#D95D39] text-white rounded-2xl font-bold shadow-lg shadow-[#D95D39]/20 hover:scale-105 active:scale-95 transition-all"
            >
              + New Note
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex-1 max-w-md relative">
            <input 
              className="w-full h-11 bg-white/50 border border-black/5 rounded-2xl px-10 text-sm font-medium focus:bg-white focus:shadow-md transition-all outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your library..."
            />
            <div className="absolute left-3.5 top-3.5 opacity-30">
                <Icon name="tag" size={16} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTag === null ? 'bg-[#1C1C1E] text-white shadow-md' : 'bg-white border border-black/5 text-[#86868B]'}`}
              onClick={() => setActiveTag(null)}
            >
              All
            </button>
            {allTags.map((t) => (
              <button 
                key={t} 
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTag === t ? 'bg-[#D95D39] text-white shadow-md' : 'bg-white border border-black/5 text-[#86868B]'}`}
                onClick={() => setActiveTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-10 pb-32 max-w-7xl mx-auto w-full">
        {mode === 'explorer' ? (
          <div className="notesExplorerLayout">
            <div className="notesMasonryPane custom-scrollbar">
              {filtered.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">No notes found</div>}
              <div className="notesMasonry">
                <AnimatePresence mode="popLayout">
                  {filtered.map((c) => {
                    const tags = extractTags(c.rawText)
                    return (
                      <motion.button
                        key={c.id}
                        layout
                        onClick={() => props.onSelectCapture(c.id)}
                        className={`notesCard ${props.selectedCaptureId === c.id ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <div className="notesCardHeader">
                          <h3>{firstLine(c.rawText)}</h3>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p>{c.rawText.split('\n').slice(1).join('\n')}</p>
                        <div className="notesCardTags">
                          {tags.slice(0, 6).map((tag) => (
                            <span key={`${c.id}_${tag}`}>{tag}</span>
                          ))}
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="notesDetailPane pageHero">
              {!selected ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                    <Icon name="file" size={64} />
                    <p className="font-bold uppercase tracking-[0.2em] text-sm">Select a note to begin</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-10 py-8 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">{firstLine(selected.rawText)}</h2>
                      <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">{new Date(selected.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="px-4 py-2 bg-[#F2F0ED] rounded-xl text-xs font-bold hover:bg-[#E5E5EA] transition-all"
                        onClick={() => setDraft((prev) => joinBlocks([...splitBlocks(prev), timestampBullet()]))}
                      >
                        + Time
                      </button>
                      <button 
                        className="px-4 py-2 bg-[#F2F0ED] rounded-xl text-xs font-bold hover:bg-[#E5E5EA] transition-all"
                        onClick={() => setDraft((prev) => joinBlocks([...splitBlocks(prev), '']))}
                      >
                        + Block
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12">
                    <div className="space-y-6">
                      {blocks.map((block, idx) => (
                        <div key={idx} className="group relative">
                          <div className="absolute -left-8 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-[10px]" onClick={() => {/* move up */}}>↑</button>
                             <button className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-[10px]" onClick={() => {/* move down */}}>↓</button>
                          </div>
                          <textarea
                            className="w-full bg-transparent border-none outline-none resize-none text-lg leading-relaxed font-medium placeholder:opacity-20"
                            value={block}
                            onChange={(e) => {
                              const next = [...blocks]
                              next[idx] = e.target.value
                              setDraft(joinBlocks(next))
                            }}
                            placeholder="Type something..."
                            style={{ height: 'auto', minHeight: '1.5em' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = target.scrollHeight + 'px'
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pt-10 border-t border-black/5">
                        <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] block mb-6">Preview</span>
                        <div className="prose prose-slate max-w-none">
                            <MarkdownView
                              markdown={draft}
                              onToggleChecklist={(lineIndex) => setDraft((prev) => toggleChecklistLine(prev, lineIndex))}
                            />
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="notesListGrid">
            {filtered.map((c) => (
              <motion.button
                key={c.id}
                onClick={() => props.onSelectCapture(c.id)}
                className="notesListCard"
                whileHover={{ y: -4 }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold">{firstLine(c.rawText)}</h3>
                  <span className="text-[10px] font-bold text-[#86868B]">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-[#86868B] leading-relaxed line-clamp-4">{c.rawText.split('\n').slice(1).join('\n')}</p>
                <div className="notesCardTags">
                  {extractTags(c.rawText)
                    .slice(0, 6)
                    .map((tag) => (
                      <span key={`${c.id}_${tag}`}>{tag}</span>
                    ))}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
