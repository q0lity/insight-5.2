import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './icons'
import { parseCaptureWithBlocks, type ParsedBlock } from '../nlp/natural'

interface CapturePreviewProps {
  text: string
  isProcessing?: boolean
  showTrackers?: boolean
  showPeople?: boolean
  showTags?: boolean
  compact?: boolean
}

/**
 * Live preview component that shows parsed blocks from capture text.
 * Splits on horizontal dividers (---) and displays each block with its
 * extracted entities (trackers, people, tags, contexts, locations).
 */
export function CapturePreview({
  text,
  isProcessing = false,
  showTrackers = true,
  showPeople = true,
  showTags = true,
  compact = false,
}: CapturePreviewProps) {
  // Parse text into blocks whenever it changes
  const parseResult = useMemo(() => {
    if (!text.trim()) return null
    return parseCaptureWithBlocks(text)
  }, [text])

  if (!parseResult || parseResult.blocks.length === 0) {
    return null
  }

  const { blocks, tasks, events } = parseResult

  return (
    <div className={`captureOutline ${compact ? 'compact' : ''}`}>
      <div className="captureOutlineHeader">
        <div className="captureOutlineTitle">Live outline</div>
        <div className="captureOutlineMeta">
          <span className="captureOutlineMetaChip">{blocks.length} segment{blocks.length !== 1 ? 's' : ''}</span>
          {events.length > 0 && (
            <span className="captureOutlineMetaChip">{events.length} event{events.length !== 1 ? 's' : ''}</span>
          )}
          {tasks.length > 0 && (
            <span className="captureOutlineMetaChip">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
          )}
          {isProcessing && <span className="captureOutlineMetaChip active">Processing...</span>}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="captureOutlineList">
          {blocks.map((block, index) => (
            <OutlineBlock
              key={block.id}
              block={block}
              index={index}
              showTrackers={showTrackers}
              showPeople={showPeople}
              showTags={showTags}
              compact={compact}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  )
}

interface BlockCardProps {
  block: ParsedBlock
  index: number
  showTrackers?: boolean
  showPeople?: boolean
  showTags?: boolean
  compact?: boolean
}

function OutlineBlock({ block, index, showTrackers, showPeople, showTags, compact }: BlockCardProps) {
  const hasEntities =
    block.trackers.length > 0 ||
    block.people.length > 0 ||
    block.tags.length > 0 ||
    block.contexts.length > 0 ||
    block.locations.length > 0
  const hasEvents = block.events.length > 0
  const hasTasks = block.tasks.length > 0
  const firstSentence = useMemo(() => {
    const trimmed = block.rawText.trim()
    if (!trimmed) return 'Untitled segment'
    const firstLine = trimmed.split('\n')[0] ?? trimmed
    const sentence = firstLine.split(/[.!?]/)[0] ?? firstLine
    return sentence.trim()
  }, [block.rawText])

  const snippet = firstSentence.length > 140 ? `${firstSentence.slice(0, 140)}...` : firstSentence

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="captureOutlineItem"
    >
      <div className="captureOutlineBullet" />
      <div className="captureOutlineContent">
        <div className={`captureOutlineLine ${compact ? 'compact' : ''}`}>
          <span className="captureOutlineIndex">{String(index + 1).padStart(2, '0')}</span>
          <span className="captureOutlineSnippet">{snippet}</span>
        </div>

        {hasEntities && (
          <div className="captureOutlineChips">
            {showTags &&
              block.tags.map((tag, i) => (
                <span key={`tag-${i}`} className="mdChip mdChip-tag">
                  #{tag}
                </span>
              ))}
            {showPeople &&
              block.people.map((person, i) => (
                <span key={`person-${i}`} className="mdChip mdChip-person">
                  @{person}
                </span>
              ))}
            {block.contexts.map((ctx, i) => (
              <span key={`ctx-${i}`} className="mdChip mdChip-ctx">
                *{ctx}
              </span>
            ))}
            {block.locations.map((loc, i) => (
              <span key={`loc-${i}`} className="mdChip mdChip-loc">
                !{loc}
              </span>
            ))}
            {showTrackers &&
              block.trackers.map((tracker, i) => (
                <span key={`tracker-${i}`} className="mdChip mdChip-tracker">
                  #{tracker.key}
                  <span className="captureOutlineTrackerValue">{tracker.value}</span>
                </span>
              ))}
          </div>
        )}

        {hasEvents && (
          <div className="captureOutlineSublist">
            {block.events.slice(0, 3).map((ev, i) => (
              <div key={`event-${i}`} className="captureOutlineSubItem">
                <Icon name="calendar" className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="captureOutlineSubText">{ev.title}</span>
                {ev.explicitTime && (
                  <span className="captureOutlineSubTime">
                    {new Date(ev.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
            {block.events.length > 3 && (
              <div className="captureOutlineSubMore">+{block.events.length - 3} more events</div>
            )}
          </div>
        )}

        {hasTasks && (
          <div className="captureOutlineSublist">
            {block.tasks.slice(0, 3).map((task, i) => (
              <div key={`task-${i}`} className="captureOutlineSubItem">
                <Icon name="check" className="w-3.5 h-3.5 text-emerald-500" />
                <span className="captureOutlineSubText">{task.title}</span>
                {task.status === 'done' && <span className="captureOutlineSubBadge">done</span>}
              </div>
            ))}
            {block.tasks.length > 3 && (
              <div className="captureOutlineSubMore">+{block.tasks.length - 3} more tasks</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Compact inline preview for showing block count and key entities
 */
export function CapturePreviewInline({ text }: { text: string }) {
  const parseResult = useMemo(() => {
    if (!text.trim()) return null
    return parseCaptureWithBlocks(text)
  }, [text])

  if (!parseResult || parseResult.blocks.length === 0) {
    return null
  }

  const allTrackers = parseResult.blocks.flatMap(b => b.trackers)
  const allPeople = [...new Set(parseResult.blocks.flatMap(b => b.people))]
  const allTags = [...new Set(parseResult.blocks.flatMap(b => b.tags))]

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {parseResult.blocks.length > 1 && (
        <span className="px-1.5 py-0.5 bg-[var(--panel2)] text-[var(--muted)] rounded font-bold">
          {parseResult.blocks.length} blocks
        </span>
      )}
      {allTrackers.slice(0, 3).map((t, i) => (
        <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">
          {t.key}: {t.value}
        </span>
      ))}
      {allPeople.slice(0, 2).map((p, i) => (
        <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
          @{p}
        </span>
      ))}
      {allTags.slice(0, 3).map((t, i) => (
        <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">
          #{t}
        </span>
      ))}
    </div>
  )
}
