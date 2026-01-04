import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { InboxCapture } from '../../storage/inbox'
import { Icon } from '../../ui/icons'

function firstLine(text: string) {
  return (text.split(/\r?\n/)[0] ?? '').trim().slice(0, 60) || 'Untitled'
}

// Extract #tags
function extractTags(text: string): string[] {
  const matches = text.match(/(^|[\s(])#([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

// Extract @people
function extractPeople(text: string): string[] {
  const matches = text.match(/(^|[\s(])@([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

// Extract !places
function extractPlaces(text: string): string[] {
  const matches = text.match(/(^|[\s(])!([a-zA-Z][\w/-]*)/g) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPreview(text: string) {
  // Get first 80 chars of content after title, cleaned up
  const lines = text.split('\n').slice(1).join(' ').trim()
  return lines.slice(0, 80) + (lines.length > 80 ? '...' : '')
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

export function NotesView(props: {
  captures: InboxCapture[]
  selectedCaptureId: string | null
  onSelectCapture: (id: string) => void
  onOpenCapture: () => void
  onUpdateCapture: (id: string, rawText: string) => void
}) {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'cards' | 'table'>('cards')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [activeTag, setActiveTag] = useState<string | null>(null)

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

  const allTags = useMemo(
    () => Array.from(new Set(props.captures.flatMap((c) => extractTags(c.rawText)))).slice(0, 20),
    [props.captures],
  )

  return (
    <div className="notesViewRoot">
      {/* Header */}
      <header className="notesHeader">
        <div className="notesHeaderTop">
          <div>
            <h1>Notes</h1>
            <p>{props.captures.length} captures</p>
          </div>
          <div className="notesHeaderActions">
            <div className="notesViewToggle">
              <button
                className={mode === 'cards' ? 'active' : ''}
                onClick={() => setMode('cards')}
                title="Card view"
              >
                <Icon name="grid" size={16} />
              </button>
              <button
                className={mode === 'table' ? 'active' : ''}
                onClick={() => setMode('table')}
                title="Table view"
              >
                <Icon name="list" size={16} />
              </button>
            </div>
            <button className="notesNewBtn" onClick={props.onOpenCapture}>
              <Icon name="plus" size={16} />
              New
            </button>
          </div>
        </div>

        {/* Search + Sort row */}
        <div className="notesSearchRow">
          <div className="notesSearchInput">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes..."
            />
          </div>
          <select
            className="notesSortSelect"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="recent">Recent</option>
            <option value="oldest">Oldest</option>
            <option value="title">A-Z</option>
          </select>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="notesTagBar">
            <button
              className={`notesTagChip ${activeTag === null ? 'active' : ''}`}
              onClick={() => setActiveTag(null)}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                className={`notesTagChip ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="notesContent">
        {filtered.length === 0 ? (
          <div className="notesEmpty">
            <Icon name="file" size={32} />
            <span>No notes found</span>
          </div>
        ) : mode === 'cards' ? (
          <div className="notesMasonry">
            <AnimatePresence mode="popLayout">
              {filtered.map((c) => {
                const tags = extractTags(c.rawText)
                const people = extractPeople(c.rawText)
                const places = extractPlaces(c.rawText)
                const preview = getPreview(c.rawText)
                const words = wordCount(c.rawText)
                return (
                  <motion.button
                    key={c.id}
                    layout
                    onClick={() => props.onSelectCapture(c.id)}
                    className={`notesCard ${props.selectedCaptureId === c.id ? 'active' : ''}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="notesCardTitle">
                      <span>{firstLine(c.rawText)}</span>
                      <span className="notesCardDate">{formatDate(c.createdAt)}</span>
                    </div>
                    {preview && <p className="notesCardPreview">{preview}</p>}
                    <div className="notesCardMeta">
                      {places.length > 0 && (
                        <span className="notesCardPlace">
                          <Icon name="pin" size={10} />
                          {places[0]}
                        </span>
                      )}
                      {people.length > 0 && (
                        <span className="notesCardPerson">
                          <Icon name="users" size={10} />
                          {people.slice(0, 2).join(', ')}
                        </span>
                      )}
                      <span className="notesCardWords">{words}w</span>
                    </div>
                    {tags.length > 0 && (
                      <div className="notesCardTags">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={`${c.id}_${tag}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="notesTable">
            <div className="notesTableHeader">
              <div className="notesTableCell title">Title</div>
              <div className="notesTableCell date">Date</div>
              <div className="notesTableCell tags">Tags</div>
              <div className="notesTableCell preview">Preview</div>
            </div>
            <div className="notesTableBody">
              {filtered.map((c) => {
                const tags = extractTags(c.rawText)
                const preview = getPreview(c.rawText)
                return (
                  <button
                    key={c.id}
                    onClick={() => props.onSelectCapture(c.id)}
                    className={`notesTableRow ${props.selectedCaptureId === c.id ? 'active' : ''}`}
                  >
                    <div className="notesTableCell title">{firstLine(c.rawText)}</div>
                    <div className="notesTableCell date">{formatDate(c.createdAt)}</div>
                    <div className="notesTableCell tags">
                      {tags.slice(0, 3).map((tag) => (
                        <span key={`${c.id}_${tag}`} className="notesTableTag">{tag}</span>
                      ))}
                    </div>
                    <div className="notesTableCell preview">{preview || '—'}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
