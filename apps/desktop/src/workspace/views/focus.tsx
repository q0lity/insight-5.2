import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/icons'
import { basePoints, multiplierFor, pointsForMinutes } from '../../scoring/points'
import { useAnimatedNumber } from '../../ui/useAnimatedNumber'
import { eventAccent, hexToRgba } from '../../ui/event-visual'
import {
  type CalendarEvent,
  getActiveEvent,
  getActiveParentEvent,
  getChildEvents,
  getEventHierarchy,
  getEventDurationMinutes,
  startSubEvent,
  stopEvent,
  stopAllActiveEvents,
  upsertEvent,
} from '../../storage/calendar'
import {
  type Task,
  getTasksForEvent,
  getActiveTaskForEvent,
  createTaskInEvent,
  startTask,
  completeTask,
  pauseTask,
  getEventTaskStats,
} from '../../storage/tasks'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface FocusViewProps {
  onOpenCapture?: (attachEventId: string) => void
  onSelectEvent?: (id: string) => void
}

export function FocusView({ onOpenCapture, onSelectEvent }: FocusViewProps) {
  const [parentEvent, setParentEvent] = useState<CalendarEvent | null>(null)
  const [subEvents, setSubEvents] = useState<CalendarEvent[]>([])
  const [activeSubEvent, setActiveSubEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [showSubEventForm, setShowSubEventForm] = useState(false)
  const [newSubEventTitle, setNewSubEventTitle] = useState('')

  // Task state
  const [eventTasks, setEventTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [taskStats, setTaskStats] = useState<{ total: number; done: number; percentComplete: number } | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [taskStartTimes, setTaskStartTimes] = useState<Map<string, number>>(new Map())

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      const parent = await getActiveParentEvent()
      setParentEvent(parent)

      if (parent) {
        const children = await getChildEvents(parent.id)
        setSubEvents(children)
        setActiveSubEvent(children.find((c) => c.active) ?? null)

        // Load tasks for the parent event
        const tasks = await getTasksForEvent(parent.id)
        setEventTasks(tasks)
        setActiveTask(tasks.find((t) => t.status === 'in_progress') ?? null)
        const stats = await getEventTaskStats(parent.id)
        setTaskStats(stats)
      } else {
        setSubEvents([])
        setActiveSubEvent(null)
        setEventTasks([])
        setActiveTask(null)
        setTaskStats(null)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load and polling
  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 5000)
    return () => clearInterval(interval)
  }, [refreshData])

  // Timer tick for live duration
  useEffect(() => {
    if (!parentEvent?.active) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [parentEvent?.active])

  // Handle starting a sub-event
  const handleStartSubEvent = useCallback(async () => {
    if (!parentEvent || !newSubEventTitle.trim()) return
    try {
      await startSubEvent({
        parentEventId: parentEvent.id,
        title: newSubEventTitle.trim(),
      })
      setNewSubEventTitle('')
      setShowSubEventForm(false)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sub-event')
    }
  }, [parentEvent, newSubEventTitle, refreshData])

  // Handle stopping the active sub-event
  const handleStopSubEvent = useCallback(async () => {
    if (!activeSubEvent) return
    try {
      await stopEvent(activeSubEvent.id)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop sub-event')
    }
  }, [activeSubEvent, refreshData])

  // Handle stopping the parent event (and all sub-events)
  const handleStopParent = useCallback(async () => {
    if (!parentEvent) return
    try {
      // Stop active sub-event first
      if (activeSubEvent) {
        await stopEvent(activeSubEvent.id)
      }
      await stopEvent(parentEvent.id)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop event')
    }
  }, [parentEvent, activeSubEvent, refreshData])

  // Handle creating a new task
  const handleCreateTask = useCallback(async () => {
    if (!parentEvent || !newTaskTitle.trim()) return
    try {
      await createTaskInEvent({
        eventId: parentEvent.id,
        title: newTaskTitle.trim(),
      })
      setNewTaskTitle('')
      setShowTaskForm(false)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }, [parentEvent, newTaskTitle, refreshData])

  // Handle starting a task
  const handleStartTask = useCallback(async (taskId: string) => {
    try {
      await startTask(taskId)
      // Track the start time for this task
      setTaskStartTimes((prev) => new Map(prev).set(taskId, Date.now()))
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task')
    }
  }, [refreshData])

  // Handle completing a task
  const handleCompleteTask = useCallback(async (taskId: string) => {
    try {
      await completeTask(taskId)
      setTaskStartTimes((prev) => {
        const next = new Map(prev)
        next.delete(taskId)
        return next
      })
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task')
    }
  }, [refreshData])

  // Handle pausing a task
  const handlePauseTask = useCallback(async (taskId: string) => {
    try {
      await pauseTask(taskId)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause task')
    }
  }, [refreshData])

  // Calculate task duration (if active)
  const getTaskDuration = useCallback((taskId: string) => {
    const startTime = taskStartTimes.get(taskId)
    if (!startTime) return 0
    return Math.round((Date.now() - startTime) / (60 * 1000))
  }, [taskStartTimes, tick])

  // Calculate durations
  const parentDuration = useMemo(() => {
    if (!parentEvent) return 0
    return getEventDurationMinutes(parentEvent)
  }, [parentEvent, tick])

  const subEventDuration = useMemo(() => {
    if (!activeSubEvent) return 0
    return getEventDurationMinutes(activeSubEvent)
  }, [activeSubEvent, tick])

  const accent = parentEvent ? eventAccent(parentEvent) : { color: 'var(--accent)', icon: 'calendar' as const }
  const parentPoints = useMemo(() => {
    if (!parentEvent) return 0
    const base = basePoints(parentEvent.importance, parentEvent.difficulty)
    if (base <= 0) return 0
    const mult = multiplierFor(parentEvent.goal ?? null, parentEvent.project ?? null)
    return pointsForMinutes(base, parentDuration, mult)
  }, [parentEvent, parentDuration])
  const animatedPoints = useAnimatedNumber(parentPoints, { durationMs: 600 })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg)]">
        <div className="text-[var(--muted)] font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  // No active event
  if (!parentEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--bg)] text-center p-8">
        <div className="w-24 h-24 rounded-full bg-[var(--border)] flex items-center justify-center mb-6">
          <Icon name="coffee" className="w-12 h-12 text-[var(--muted)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">No Active Event</h2>
        <p className="text-[var(--muted)] max-w-md">
          Start an event from the timeline or planner to see it here.
          You can track sub-activities and add notes in real-time.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] font-['Figtree']">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Active Session
          </span>
          <span className="text-xs font-bold text-[var(--muted)]">
            Started {formatTime(parentEvent.startAt)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Parent Event Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--glass2)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden"
        >
          {/* Parent Header */}
          <div
            className="p-6 border-b border-[var(--border)]"
            style={{ backgroundColor: hexToRgba(accent.color, 0.05) }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: hexToRgba(accent.color, 0.15), color: accent.color }}
              >
                <Icon name={accent.icon} size={28} />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--text)] truncate">{parentEvent.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Icon name="clock" size={14} />
                    {formatDuration(parentDuration)}
                  </span>
                  {parentEvent.category && (
                    <span className="flex items-center gap-1">
                      <Icon name="folder" size={14} />
                      {parentEvent.category}
                      {parentEvent.subcategory && ` / ${parentEvent.subcategory}`}
                    </span>
                  )}
                  {parentEvent.goal && (
                    <span className="flex items-center gap-1">
                      <Icon name="target" size={14} />
                      {parentEvent.goal}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer Display */}
              <div className="text-right">
                <div className="text-4xl font-bold text-[var(--text)] tabular-nums">
                  {formatDuration(parentDuration)}
                </div>
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs font-bold text-green-500 mt-1"
                >
                  ACTIVE
                </motion.div>
                <div className="text-xs font-bold text-[var(--accent)] mt-2 tabular-nums">
                  +{animatedPoints.toFixed(3)} XP
                </div>
              </div>
            </div>

            {/* Tags */}
            {parentEvent.tags && parentEvent.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {parentEvent.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-[var(--glass2)] rounded-full text-xs font-bold"
                    style={{ color: accent.color }}
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Parent Actions */}
          <div className="p-4 flex items-center gap-3">
            <button
              onClick={() => onOpenCapture?.(parentEvent.id)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--glass2)] rounded-xl text-sm font-bold text-[var(--text)] hover:bg-[var(--glass3)] transition-colors"
            >
              <Icon name="mic" size={16} />
              Add Note
            </button>
            <button
              onClick={() => setShowSubEventForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-500/20 transition-colors"
            >
              <Icon name="plus" size={16} />
              Start Sub-Activity
            </button>
            <div className="flex-1" />
            <button
              onClick={handleStopParent}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Icon name="square" size={16} />
              Stop Session
            </button>
          </div>
        </motion.div>

        {/* Sub-Event Form */}
        <AnimatePresence>
          {showSubEventForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[var(--glass2)] rounded-2xl border border-blue-200 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <h3 className="text-sm font-bold text-[var(--text)] mb-3">Start Sub-Activity</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSubEventTitle}
                    onChange={(e) => setNewSubEventTitle(e.target.value)}
                    placeholder="What are you working on?"
                    className="flex-1 px-4 py-2 bg-[var(--glass2)] rounded-xl text-sm font-medium placeholder-[var(--muted)] outline-none focus:ring-2 focus:ring-blue-300"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStartSubEvent()
                      if (e.key === 'Escape') setShowSubEventForm(false)
                    }}
                  />
                  <button
                    onClick={handleStartSubEvent}
                    disabled={!newSubEventTitle.trim()}
                    className="px-4 py-2 bg-blue-500/150 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setShowSubEventForm(false)}
                    className="px-4 py-2 bg-[var(--glass2)] text-[var(--muted)] rounded-xl text-sm font-bold hover:bg-[var(--glass3)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Sub-Event */}
        <AnimatePresence>
          {activeSubEvent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--glass2)] rounded-2xl border-2 border-blue-300 shadow-lg overflow-hidden"
            >
              <div className="p-5" style={{ backgroundColor: hexToRgba('#3B82F6', 0.05) }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                    Current Sub-Activity
                  </span>
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-blue-500/150"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center">
                    <Icon name="play" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--text)]">{activeSubEvent.title}</h3>
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      Started {formatTime(activeSubEvent.startAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 tabular-nums">
                      {formatDuration(subEventDuration)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => onOpenCapture?.(activeSubEvent.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--glass2)] rounded-lg text-xs font-bold text-[var(--text)] hover:bg-[var(--glass2)] transition-colors"
                  >
                    <Icon name="mic" size={14} />
                    Note
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleStopSubEvent}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/150 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                  >
                    <Icon name="check" size={14} />
                    Complete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sub-Event History */}
        {subEvents.filter((e) => !e.active).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Session Timeline
            </h3>
            {subEvents
              .filter((e) => !e.active)
              .sort((a, b) => b.startAt - a.startAt)
              .map((sub) => (
                <motion.button
                  key={sub.id}
                  onClick={() => onSelectEvent?.(sub.id)}
                  whileHover={{ x: 4 }}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--glass2)] rounded-xl border border-[var(--border)] text-left hover:shadow-sm transition-shadow"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--glass2)] text-[var(--muted)] flex items-center justify-center">
                    <Icon name="check" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text)] truncate">{sub.title}</p>
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      {formatTime(sub.startAt)} – {formatTime(sub.endAt)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--muted)]">
                    {formatDuration(getEventDurationMinutes(sub))}
                  </span>
                </motion.button>
              ))}
          </div>
        )}

        {/* Tasks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Tasks {taskStats && `(${taskStats.done}/${taskStats.total})`}
            </h3>
            <button
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700"
            >
              <Icon name="plus" size={14} />
              Add Task
            </button>
          </div>

          {/* Task Progress Bar */}
          {taskStats && taskStats.total > 0 && (
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskStats.percentComplete}%` }}
                className="h-full bg-green-500/150 rounded-full"
              />
            </div>
          )}

          {/* Task Form */}
          <AnimatePresence>
            {showTaskForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--glass2)] rounded-xl border border-green-200 p-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="flex-1 px-3 py-1.5 bg-[var(--glass2)] rounded-lg text-sm font-medium placeholder-[var(--muted)] outline-none focus:ring-2 focus:ring-green-300"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTask()
                      if (e.key === 'Escape') setShowTaskForm(false)
                    }}
                  />
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-3 py-1.5 bg-green-500/150 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowTaskForm(false)}
                    className="px-3 py-1.5 bg-[var(--glass2)] text-[var(--muted)] rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Task */}
          <AnimatePresence>
            {activeTask && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--glass2)] rounded-xl border-2 border-green-300 p-4"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-8 h-8 rounded-lg bg-green-500/150/20 text-green-600 flex items-center justify-center"
                  >
                    <Icon name="play" size={16} />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-[var(--text)]">{activeTask.title}</p>
                    <p className="text-xs font-semibold text-green-600">
                      Working on this • {formatDuration(getTaskDuration(activeTask.id))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePauseTask(activeTask.id)}
                      className="px-3 py-1.5 bg-[var(--glass2)] text-[var(--muted)] rounded-lg text-xs font-bold hover:bg-[var(--glass3)]"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => handleCompleteTask(activeTask.id)}
                      className="px-3 py-1.5 bg-green-500/150 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task List */}
          {eventTasks.filter((t) => t.status !== 'in_progress').length > 0 && (
            <div className="space-y-2">
              {eventTasks
                .filter((t) => t.status !== 'in_progress')
                .sort((a, b) => {
                  // Sort: todo first, then done
                  if (a.status === 'todo' && b.status === 'done') return -1
                  if (a.status === 'done' && b.status === 'todo') return 1
                  return a.createdAt - b.createdAt
                })
                .map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      task.status === 'done'
                        ? 'bg-[var(--glass2)] border-[var(--border)]'
                        : 'bg-[var(--glass2)] border-[var(--border)] hover:border-green-200'
                    }`}
                  >
                    <button
                      onClick={() => task.status === 'done' ? null : handleCompleteTask(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        task.status === 'done'
                          ? 'bg-green-500/150 border-green-500 text-white'
                          : 'border-[var(--border)] hover:border-green-400'
                      }`}
                    >
                      {task.status === 'done' && <Icon name="check" size={12} />}
                    </button>
                    <span
                      className={`flex-1 font-medium ${
                        task.status === 'done' ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.status === 'todo' && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="px-2 py-1 text-xs font-bold text-green-600 hover:bg-green-500/15 rounded-lg"
                      >
                        Start
                      </button>
                    )}
                    {task.estimateMinutes && task.status !== 'done' && (
                      <span className="text-xs font-bold text-[var(--muted)]">
                        ~{task.estimateMinutes}m
                      </span>
                    )}
                  </motion.div>
                ))}
            </div>
          )}

          {/* Empty state */}
          {eventTasks.length === 0 && !showTaskForm && (
            <div className="text-center py-6 text-sm text-[var(--muted)]">
              No tasks yet. Add one to track your progress.
            </div>
          )}
        </div>

        {/* Notes Preview */}
        {parentEvent.notes && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Session Notes
            </h3>
            <div className="bg-[var(--glass2)] rounded-xl border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap line-clamp-6">
                {parentEvent.notes}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
