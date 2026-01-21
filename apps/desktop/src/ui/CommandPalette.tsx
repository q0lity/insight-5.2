import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, type IconName } from './icons'

type Command = {
  id: string
  label: string
  icon: IconName
  shortcut?: string
  action: () => void
  category: 'navigation' | 'actions' | 'recent'
}

type Props = {
  open: boolean
  onClose: () => void
  onNavigate: (view: string) => void
  onCapture: () => void
  recentItems?: Array<{ id: string; title: string; type: 'task' | 'note' | 'habit' }>
}

export function CommandPalette({ open, onClose, onNavigate, onCapture, recentItems = [] }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const navCommands: Command[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: 'home', shortcut: '⌘D', action: () => onNavigate('dashboard'), category: 'navigation' },
      { id: 'nav-calendar', label: 'Go to Calendar', icon: 'calendar', action: () => onNavigate('calendar'), category: 'navigation' },
      { id: 'nav-tasks', label: 'Go to Tasks', icon: 'check', action: () => onNavigate('tasks'), category: 'navigation' },
      { id: 'nav-notes', label: 'Go to Notes', icon: 'file', action: () => onNavigate('notes'), category: 'navigation' },
      { id: 'nav-habits', label: 'Go to Habits', icon: 'smile', shortcut: '⌘⇧H', action: () => onNavigate('habits'), category: 'navigation' },
      { id: 'nav-goals', label: 'Go to Goals', icon: 'target', action: () => onNavigate('goals'), category: 'navigation' },
      { id: 'nav-projects', label: 'Go to Projects', icon: 'briefcase', action: () => onNavigate('projects'), category: 'navigation' },
      { id: 'nav-ecosystem', label: 'Go to Ecosystem', icon: 'monitor', action: () => onNavigate('ecosystem'), category: 'navigation' },
      { id: 'nav-trackers', label: 'Go to Trackers', icon: 'droplet', action: () => onNavigate('trackers'), category: 'navigation' },
      { id: 'nav-rewards', label: 'Go to Rewards', icon: 'trophy', shortcut: '⌘⇧R', action: () => onNavigate('rewards'), category: 'navigation' },
      { id: 'nav-health', label: 'Go to Health', icon: 'dumbbell', action: () => onNavigate('health'), category: 'navigation' },
      { id: 'nav-assistant', label: 'Go to Chat', icon: 'mic', action: () => onNavigate('assistant'), category: 'navigation' },
      { id: 'nav-timeline', label: 'Go to Timeline', icon: 'bolt', action: () => onNavigate('timeline'), category: 'navigation' },
      { id: 'nav-settings', label: 'Go to Settings', icon: 'gear', action: () => onNavigate('settings'), category: 'navigation' },
    ]

    const actionCommands: Command[] = [
      { id: 'action-capture', label: 'New Capture', icon: 'plus', shortcut: '⌘K', action: onCapture, category: 'actions' },
    ]

    const recentCommands: Command[] = recentItems.slice(0, 5).map((item) => ({
      id: `recent-${item.id}`,
      label: item.title,
      icon: item.type === 'task' ? 'check' : item.type === 'habit' ? 'smile' : 'file',
      action: () => {
        // Could be extended to select the item
        onNavigate(item.type === 'task' ? 'tasks' : item.type === 'habit' ? 'habits' : 'notes')
      },
      category: 'recent' as const,
    }))

    return [...actionCommands, ...navCommands, ...recentCommands]
  }, [onNavigate, onCapture, recentItems])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q))
  }, [commands, query])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = { actions: [], navigation: [], recent: [] }
    for (const cmd of filteredCommands) {
      groups[cmd.category]?.push(cmd)
    }
    return groups
  }, [filteredCommands])

  const flatList = useMemo(() => {
    return [...(groupedCommands.actions || []), ...(groupedCommands.navigation || []), ...(groupedCommands.recent || [])]
  }, [groupedCommands])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const runCommand = useCallback(
    (cmd: Command) => {
      cmd.action()
      onClose()
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatList[selectedIndex]) {
            runCommand(flatList[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatList, selectedIndex, runCommand, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    selectedEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="cmdPaletteOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}>
          <motion.div
            className="cmdPalette"
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}>
            <div className="cmdPaletteInput">
              <Icon name="sparkle" size={16} className="cmdPaletteIcon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <kbd className="cmdPaletteKbd">ESC</kbd>
            </div>
            <div className="cmdPaletteList" ref={listRef}>
              {groupedCommands.actions && groupedCommands.actions.length > 0 && (
                <div className="cmdPaletteGroup">
                  <div className="cmdPaletteGroupLabel">Actions</div>
                  {groupedCommands.actions.map((cmd, i) => {
                    const globalIndex = i
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        className={`cmdPaletteItem${selectedIndex === globalIndex ? ' selected' : ''}`}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}>
                        <Icon name={cmd.icon} size={16} />
                        <span className="cmdPaletteLabel">{cmd.label}</span>
                        {cmd.shortcut && <kbd className="cmdPaletteShortcut">{cmd.shortcut}</kbd>}
                      </button>
                    )
                  })}
                </div>
              )}
              {groupedCommands.navigation && groupedCommands.navigation.length > 0 && (
                <div className="cmdPaletteGroup">
                  <div className="cmdPaletteGroupLabel">Navigation</div>
                  {groupedCommands.navigation.map((cmd, i) => {
                    const globalIndex = (groupedCommands.actions?.length || 0) + i
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        className={`cmdPaletteItem${selectedIndex === globalIndex ? ' selected' : ''}`}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}>
                        <Icon name={cmd.icon} size={16} />
                        <span className="cmdPaletteLabel">{cmd.label}</span>
                        {cmd.shortcut && <kbd className="cmdPaletteShortcut">{cmd.shortcut}</kbd>}
                      </button>
                    )
                  })}
                </div>
              )}
              {groupedCommands.recent && groupedCommands.recent.length > 0 && (
                <div className="cmdPaletteGroup">
                  <div className="cmdPaletteGroupLabel">Recent</div>
                  {groupedCommands.recent.map((cmd, i) => {
                    const globalIndex = (groupedCommands.actions?.length || 0) + (groupedCommands.navigation?.length || 0) + i
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        className={`cmdPaletteItem${selectedIndex === globalIndex ? ' selected' : ''}`}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}>
                        <Icon name={cmd.icon} size={16} />
                        <span className="cmdPaletteLabel">{cmd.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {flatList.length === 0 && <div className="cmdPaletteEmpty">No results found</div>}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
