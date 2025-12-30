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
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      {/* Summary Bar */}
      <div className="flex items-center gap-4 text-xs font-bold text-[var(--muted)]">
        <span className="px-2 py-0.5 bg-[var(--panel2)] rounded">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''}
        </span>
        {events.length > 0 && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        )}
        {tasks.length > 0 && (
          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        )}
        {isProcessing && (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded animate-pulse">
            Processing...
          </span>
        )}
      </div>

      {/* Block Cards */}
      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            block={block}
            index={index}
            showTrackers={showTrackers}
            showPeople={showPeople}
            showTags={showTags}
            compact={compact}
          />
        ))}
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

function BlockCard({ block, index, showTrackers, showPeople, showTags, compact }: BlockCardProps) {
  const hasEntities = block.trackers.length > 0 || block.people.length > 0 || block.tags.length > 0 || block.contexts.length > 0 || block.locations.length > 0
  const hasEvents = block.events.length > 0
  const hasTasks = block.tasks.length > 0

  // Detect block type based on content
  const blockType = useMemo(() => {
    const text = block.rawText.toLowerCase()
    if (/\b(workout|exercise|gym|lift|run|push[-\s]?up|squat|bench|deadlift)\b/.test(text)) return 'workout'
    if (/\b(ate|eating|breakfast|lunch|dinner|snack|meal|food)\b/.test(text)) return 'meal'
    if (block.trackers.some(t => ['mood', 'energy', 'stress', 'pain', 'anxiety'].includes(t.key))) return 'tracker'
    if (hasTasks && !hasEvents) return 'task'
    if (hasEvents) return 'event'
    return 'note'
  }, [block, hasEvents, hasTasks])

  const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
    workout: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '🏋️' },
    meal: { bg: 'bg-green-50', border: 'border-green-200', icon: '🍽️' },
    tracker: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '📊' },
    task: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '✓' },
    event: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '📅' },
    note: { bg: 'bg-gray-50', border: 'border-gray-200', icon: '📝' },
  }

  const colors = typeColors[blockType] ?? typeColors.note

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`rounded-xl border ${colors.bg} ${colors.border} overflow-hidden`}
    >
      {/* Block Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-inherit bg-white/50">
        <span className="text-sm">{colors.icon}</span>
        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
          Block {index + 1} • {blockType}
        </span>
      </div>

      {/* Block Content */}
      <div className={`p-4 space-y-3 ${compact ? 'p-3 space-y-2' : ''}`}>
        {/* Raw Text Preview */}
        <p className="text-sm text-[var(--text)] line-clamp-3 font-medium">
          {block.rawText.slice(0, 200)}
          {block.rawText.length > 200 ? '...' : ''}
        </p>

        {/* Extracted Entities */}
        {hasEntities && (
          <div className="flex flex-wrap gap-2">
            {/* Trackers */}
            {showTrackers && block.trackers.map((t, i) => (
              <span
                key={`tracker-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold"
              >
                #{t.key}
                <span className="bg-purple-200 px-1 rounded">{t.value}</span>
              </span>
            ))}

            {/* People */}
            {showPeople && block.people.map((p, i) => (
              <span
                key={`person-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold"
              >
                @{p}
              </span>
            ))}

            {/* Tags */}
            {showTags && block.tags.map((t, i) => (
              <span
                key={`tag-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold"
              >
                #{t}
              </span>
            ))}

            {/* Contexts */}
            {block.contexts.map((c, i) => (
              <span
                key={`context-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold"
              >
                *{c}
              </span>
            ))}

            {/* Locations */}
            {block.locations.map((l, i) => (
              <span
                key={`location-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold"
              >
                !{l}
              </span>
            ))}
          </div>
        )}

        {/* Parsed Events */}
        {hasEvents && (
          <div className="space-y-1">
            {block.events.slice(0, 3).map((ev, i) => (
              <div
                key={`event-${i}`}
                className="flex items-center gap-2 text-xs font-medium text-[var(--text)]"
              >
                <Icon name="calendar" className="w-3 h-3 text-amber-500" />
                <span className="truncate">{ev.title}</span>
                {ev.explicitTime && (
                  <span className="text-[var(--muted)] shrink-0">
                    {new Date(ev.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
            {block.events.length > 3 && (
              <span className="text-xs text-[var(--muted)]">
                +{block.events.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Parsed Tasks */}
        {hasTasks && (
          <div className="space-y-1">
            {block.tasks.slice(0, 3).map((task, i) => (
              <div
                key={`task-${i}`}
                className="flex items-center gap-2 text-xs font-medium text-[var(--text)]"
              >
                <Icon name="check" className="w-3 h-3 text-green-500" />
                <span className="truncate">{task.title}</span>
                {task.status === 'done' && (
                  <span className="px-1 bg-green-100 text-green-600 rounded text-[10px]">done</span>
                )}
              </div>
            ))}
            {block.tasks.length > 3 && (
              <span className="text-xs text-[var(--muted)]">
                +{block.tasks.length - 3} more
              </span>
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
