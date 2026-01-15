import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { InboxCapture } from '../../storage/inbox'
import { Icon } from '../../ui/icons'
import { MarkdownView } from '../../ui/markdown'
import { categoriesFromStarter } from '../../taxonomy/starter'
import {
  firstLine,
  extractTags,
  extractPeople,
  extractPlaces,
  extractCategories,
  formatRelativeDate,
  getPreview,
  wordCount,
  uniqueFilters,
} from '@insight/shared'

export function NotesView(props: {
  captures: InboxCapture[]
  selectedCaptureId: string | null
  onSelectCapture: (id: string) => void
  onOpenCapture: () => void
  onUpdateCapture: (id: string, rawText: string) => void
  initialFilterType?: 'all' | 'category' | 'tag' | 'person' | 'place'
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [layout, setLayout] = useState<'cards' | 'list'>('cards')
  const [filterType, setFilterType] = useState<'all' | 'category' | 'tag' | 'person' | 'place'>(props.initialFilterType ?? 'all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const categories = useMemo(() => categoriesFromStarter(), [])

  const allTags = useMemo(
    () => Array.from(new Set(props.captures.flatMap((c) => extractTags(c.rawText)))).slice(0, 50),
    [props.captures],
  )

  const allPeople = useMemo(
    () => Array.from(new Set(props.captures.flatMap((c) => extractPeople(c.rawText)))).slice(0, 50),
    [props.captures],
  )

  const allPlaces = useMemo(
    () => Array.from(new Set(props.captures.flatMap((c) => extractPlaces(c.rawText)))).slice(0, 50),
    [props.captures],
  )

  const allCategories = useMemo(() => {
    const found: string[] = []
    for (const c of props.captures) {
      found.push(...extractCategories(c.rawText, categories))
    }
    return uniqueFilters(found).sort((a, b) => a.localeCompare(b))
  }, [categories, props.captures])

  const currentFilterOptions = useMemo(() => {
    switch (filterType) {
      case 'category':
        return allCategories
      case 'tag':
        return allTags
      case 'person':
        return allPeople
      case 'place':
        return allPlaces
      default:
        return []
    }
  }, [allCategories, allPeople, allPlaces, allTags, filterType])

  const selectedCapture = useMemo(
    () => props.captures.find((c) => c.id === props.selectedCaptureId) ?? null,
    [props.captures, props.selectedCaptureId],
  )

  const [editorText, setEditorText] = useState('')
  const [editorDirty, setEditorDirty] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<'preview' | 'edit'>('preview')

  useEffect(() => {
    setEditorText(selectedCapture?.rawText ?? '')
    setEditorDirty(false)
  }, [selectedCapture?.id])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = props.captures.filter((c) => {
      if (filterType === 'all' || selectedFilters.length === 0) return true
      const filters = selectedFilters
      if (filterType === 'tag') {
        const tags = extractTags(c.rawText)
        return filters.some((f) => tags.includes(f))
      }
      if (filterType === 'person') {
        const people = extractPeople(c.rawText)
        return filters.some((f) => people.includes(f))
      }
      if (filterType === 'place') {
        const places = extractPlaces(c.rawText)
        return filters.some((f) => places.includes(f))
      }
      if (filterType === 'category') {
        const cats = extractCategories(c.rawText, categories)
        return filters.some((f) => cats.includes(f))
      }
      return true
    })
    const searched = needle ? base.filter((c) => c.rawText.toLowerCase().includes(needle)) : base
    const sorted = [...searched].sort((a, b) => {
      if (sort === 'title') return firstLine(a.rawText).localeCompare(firstLine(b.rawText))
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return b.createdAt - a.createdAt
    })
    return sorted.slice(0, 250)
  }, [categories, filterType, props.captures, q, selectedFilters, sort])

  function isFilterActive(type: 'category' | 'tag' | 'person' | 'place', value: string) {
    return filterType === type && selectedFilters.includes(value)
  }

  function toggleFilter(type: 'category' | 'tag' | 'person' | 'place', value: string) {
    setFilterType(type)
    setSelectedFilters((prev) => {
      const base = filterType === type ? prev : []
      return base.includes(value) ? base.filter((item) => item !== value) : [...base, value]
    })
  }

  function commitEditor() {
    if (!selectedCapture) return
    if (editorText === selectedCapture.rawText) {
      setEditorDirty(false)
      return
    }
    void props.onUpdateCapture(selectedCapture.id, editorText)
    setEditorDirty(false)
  }

  const currentRawText = selectedCapture ? editorText : ''
  const selectedTags = selectedCapture ? extractTags(currentRawText) : []
  const selectedPeople = selectedCapture ? extractPeople(currentRawText) : []
  const selectedPlaces = selectedCapture ? extractPlaces(currentRawText) : []
  const selectedCategories = selectedCapture ? extractCategories(currentRawText, categories) : []
  const selectedWords = selectedCapture ? wordCount(currentRawText) : 0
  const selectedTitle = selectedCapture ? firstLine(currentRawText) : ''
  const selectedDate = selectedCapture ? new Date(selectedCapture.createdAt).toLocaleString() : ''

  return (
    <div className="notesViewRoot">
      <header className="notesHeader">
        <div className="notesHeaderTop">
          <div className="notesHeaderTitle">
            <h1>Notes Explorer</h1>
            <p>{props.captures.length} captures</p>
          </div>
          <div className="notesHeaderControls">
            <div className="notesViewToggle" role="tablist" aria-label="Notes layout">
              <button
                type="button"
                className={layout === 'list' ? 'active' : ''}
                onClick={() => setLayout('list')}
                role="tab"
                aria-selected={layout === 'list'}>
                List
              </button>
              <button
                type="button"
                className={layout === 'cards' ? 'active' : ''}
                onClick={() => setLayout('cards')}
                role="tab"
                aria-selected={layout === 'cards'}>
                Cards
              </button>
            </div>
            <div className="notesSearchRow">
              <div className="notesSearchInput">
                <Icon name="search" size={14} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes..." />
              </div>
              <select className="notesSortSelect" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="recent">Recent</option>
                <option value="oldest">Oldest</option>
                <option value="title">A-Z</option>
              </select>
            </div>
            <div className="notesHeaderActions">
              <button className="notesNewBtn" onClick={props.onOpenCapture}>
                <Icon name="plus" size={16} />
                New
              </button>
            </div>
          </div>
        </div>

        <div className="notesFilterRow">
          <div className="notesFilterTabs">
            {(['all', 'category', 'tag', 'person', 'place'] as const).map((ft) => (
              <button
                key={ft}
                className={`notesFilterTab ${filterType === ft ? 'active' : ''}`}
                onClick={() => {
                  setFilterType(ft)
                  setSelectedFilters([])
                }}
              >
                {ft === 'all'
                  ? 'All'
                  : ft === 'category'
                    ? 'Categories'
                    : ft === 'tag'
                      ? 'Tags'
                      : ft === 'person'
                        ? 'People'
                        : 'Places'}
              </button>
            ))}
          </div>
          {filterType !== 'all' && currentFilterOptions.length > 0 && (
            <div className="notesFilterChips">
              {currentFilterOptions.map((opt) => {
                const isSelected = selectedFilters.includes(opt)
                return (
                  <button
                    key={opt}
                    className={`notesFilterChip ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFilters(
                        isSelected ? selectedFilters.filter((f) => f !== opt) : [...selectedFilters, opt],
                      )
                    }}
                  >
                    {opt}
                    {isSelected ? <span className="notesFilterChipRemove">x</span> : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      <div className="notesExplorerBody">
        <div className="notesContent">
          {filtered.length === 0 ? (
            <div className="notesEmpty">
              <Icon name="file" size={32} />
              <span>No notes found</span>
            </div>
          ) : layout === 'list' ? (
            <div className="notesTable">
              <div className="notesTableHeader">
                <div>When</div>
                <div>Title</div>
                <div>Preview</div>
                <div>Tags</div>
              </div>
              <div className="notesTableBody">
                <AnimatePresence mode="popLayout">
                  {filtered.map((c) => {
                    const tags = extractTags(c.rawText)
                    const people = extractPeople(c.rawText)
                    const places = extractPlaces(c.rawText)
                    const preview = getPreview(c.rawText)
                    return (
                      <motion.button
                        key={c.id}
                        layout
                        onClick={() => props.onSelectCapture(c.id)}
                        className={`notesTableRow ${props.selectedCaptureId === c.id ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.12 }}
                      >
                        <div className="notesTableCell time">{formatRelativeDate(c.createdAt)}</div>
                        <div className="notesTableCell title">{firstLine(c.rawText)}</div>
                        <div className="notesTableCell preview">{preview || '—'}</div>
                        <div className="notesTableCell tags">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={`${c.id}_${tag}`} className="notesTableTag">
                              {tag}
                            </span>
                          ))}
                          {people.slice(0, 1).map((person) => (
                            <span key={`${c.id}_${person}`} className="notesTableTag kind">
                              @{person}
                            </span>
                          ))}
                          {places.slice(0, 1).map((place) => (
                            <span key={`${c.id}_${place}`} className="notesTableTag kind">
                              {place}
                            </span>
                          ))}
                          {tags.length === 0 && people.length === 0 && places.length === 0 ? <span className="notesTableTag">—</span> : null}
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
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
                      className={`notesCard notesCardDark ${props.selectedCaptureId === c.id ? 'active' : ''}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="notesCardTitle">
                        <span>{firstLine(c.rawText)}</span>
                        <span className="notesCardDate">{formatRelativeDate(c.createdAt)}</span>
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
          )}
        </div>

        <aside className="notesInspector">
          {selectedCapture ? (
            <>
              <div className="notesInspectorHeader">
                <div>
                  <div className="notesInspectorEyebrow">Selected note</div>
                  <div className="notesInspectorTitle">{selectedTitle}</div>
                  <div className="notesInspectorMeta">
                    {selectedDate} | {selectedWords} words
                  </div>
                </div>
              </div>

              <div className="notesInspectorSection">
                <div className="notesInspectorLabel">Categories</div>
                {selectedCategories.length ? (
                  <div className="notesInspectorChips">
                    {selectedCategories.map((cat) => {
                      const active = isFilterActive('category', cat)
                      return (
                        <button
                          key={cat}
                          className={active ? 'notesInspectorChip active' : 'notesInspectorChip'}
                          onClick={() => toggleFilter('category', cat)}
                        >
                          {cat}
                          {active ? <span className="notesInspectorChipRemove">x</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="notesInspectorEmptyMeta">No categories tagged.</div>
                )}
              </div>

              <div className="notesInspectorSection">
                <div className="notesInspectorLabel">Tags</div>
                {selectedTags.length ? (
                  <div className="notesInspectorChips">
                    {selectedTags.map((tag) => {
                      const active = isFilterActive('tag', tag)
                      return (
                        <button
                          key={tag}
                          className={active ? 'notesInspectorChip active' : 'notesInspectorChip'}
                          onClick={() => toggleFilter('tag', tag)}
                        >
                          {tag}
                          {active ? <span className="notesInspectorChipRemove">x</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="notesInspectorEmptyMeta">No tags found.</div>
                )}
              </div>

              <div className="notesInspectorSection">
                <div className="notesInspectorLabel">People</div>
                {selectedPeople.length ? (
                  <div className="notesInspectorChips">
                    {selectedPeople.map((person) => {
                      const active = isFilterActive('person', person)
                      return (
                        <button
                          key={person}
                          className={active ? 'notesInspectorChip active' : 'notesInspectorChip'}
                          onClick={() => toggleFilter('person', person)}
                        >
                          {person}
                          {active ? <span className="notesInspectorChipRemove">x</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="notesInspectorEmptyMeta">No people tagged.</div>
                )}
              </div>

              <div className="notesInspectorSection">
                <div className="notesInspectorLabel">Places</div>
                {selectedPlaces.length ? (
                  <div className="notesInspectorChips">
                    {selectedPlaces.map((place) => {
                      const active = isFilterActive('place', place)
                      return (
                        <button
                          key={place}
                          className={active ? 'notesInspectorChip active' : 'notesInspectorChip'}
                          onClick={() => toggleFilter('place', place)}
                        >
                          {place}
                          {active ? <span className="notesInspectorChipRemove">x</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="notesInspectorEmptyMeta">No places tagged.</div>
                )}
              </div>

              <div className="notesInspectorSection">
                <div className="notesInspectorDocHeader">
                  <div className="notesInspectorLabel">Note</div>
                  <div className="notesInspectorDocTabs" role="tablist" aria-label="Note mode">
                    <button
                      type="button"
                      className={inspectorMode === 'preview' ? 'notesInspectorDocTab active' : 'notesInspectorDocTab'}
                      onClick={() => setInspectorMode('preview')}
                      role="tab"
                      aria-selected={inspectorMode === 'preview'}>
                      Preview
                    </button>
                    <button
                      type="button"
                      className={inspectorMode === 'edit' ? 'notesInspectorDocTab active' : 'notesInspectorDocTab'}
                      onClick={() => setInspectorMode('edit')}
                      role="tab"
                      aria-selected={inspectorMode === 'edit'}>
                      Edit
                    </button>
                  </div>
                </div>
                {inspectorMode === 'preview' ? (
                  <div className="notesInspectorDoc">
                    {editorText.trim() ? (
                      <MarkdownView markdown={editorText} />
                    ) : (
                      <div className="notesInspectorEmptyMeta">No note content yet.</div>
                    )}
                  </div>
                ) : (
                  <>
                    <textarea
                      className="notesInspectorEditor"
                      value={editorText}
                      onChange={(e) => {
                        setEditorText(e.target.value)
                        setEditorDirty(true)
                      }}
                      onBlur={() => commitEditor()}
                      placeholder="Write markdown notes..."
                    />
                    <div className="notesInspectorActions">
                      <button className="notesInspectorSave" onClick={() => commitEditor()} disabled={!editorDirty}>
                        Save
                      </button>
                      <span className="notesInspectorHint">{editorDirty ? 'Unsaved changes' : 'Saved'}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="notesInspectorEmpty">
              <Icon name="file" size={32} />
              <div>Select a note to inspect details.</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
