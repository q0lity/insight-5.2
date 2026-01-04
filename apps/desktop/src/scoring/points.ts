import type { CalendarEvent } from '../storage/calendar'
import type { Task } from '../storage/tasks'
import { getGoalMultiplier, getProjectMultiplier, loadMultipliers } from '../storage/multipliers'
import { getStreakMultiplier, recordActivity } from './streaks'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function basePoints(importance: number | null | undefined, difficulty: number | null | undefined) {
  const i = importance ?? 5
  const d = difficulty ?? 5
  if (!Number.isFinite(i) || !Number.isFinite(d)) return 0
  return clamp(i, 1, 10) * clamp(d, 1, 10)
}

/**
 * Calculate points for time spent
 * Includes streak multiplier (Atomic Habits 1% daily compound)
 */
export function pointsForMinutes(base: number, minutes: number, mult = 1, includeStreak = true) {
  if (!Number.isFinite(base) || !Number.isFinite(minutes)) return 0
  const streakMult = includeStreak ? getStreakMultiplier() : 1
  return base * Math.max(0, minutes) / 60 * (Number.isFinite(mult) ? mult : 1) * streakMult
}

export function multiplierFor(goal: string | null | undefined, project: string | null | undefined) {
  const state = loadMultipliers()
  return getGoalMultiplier(goal, state) * getProjectMultiplier(project, state)
}

/**
 * Get the total multiplier including streak bonus
 */
export function totalMultiplierFor(goal: string | null | undefined, project: string | null | undefined) {
  return multiplierFor(goal, project) * getStreakMultiplier()
}

export function pointsForEvent(ev: CalendarEvent) {
  const base = basePoints(ev.importance, ev.difficulty)
  if (base <= 0) return 0
  const mins = Math.max(0, Math.round((ev.endAt - ev.startAt) / (60 * 1000)))
  const mult = multiplierFor(ev.goal ?? null, ev.project ?? null)
  // Record activity when calculating points (extends streak)
  recordActivity()
  return pointsForMinutes(base, mins, mult)
}

export function pointsForTask(task: Task) {
  const base = basePoints(task.importance, task.difficulty)
  if (base <= 0) return 0
  const mins = Math.max(0, task.estimateMinutes ?? 30)
  const mult = multiplierFor(task.goal ?? null, task.project ?? null)
  // Record activity when calculating points (extends streak)
  recordActivity()
  return pointsForMinutes(base, mins, mult)
}

// Re-export streak functions for convenience
export { getStreakMultiplier, getStreakInfo, recordActivity } from './streaks'
