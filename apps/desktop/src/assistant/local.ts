import type { InboxCapture } from '../storage/inbox'
import type { CalendarEvent } from '../storage/calendar'
import type { Task } from '../storage/tasks'
import {
  localSearchCaptures as sharedLocalSearchCaptures,
  localSearchEvents as sharedLocalSearchEvents,
  localSearchTasks as sharedLocalSearchTasks,
  localAnswer as sharedLocalAnswer,
  type LocalSearchHit,
  type LocalEventHit,
  type LocalTaskHit,
} from '@insight/shared'

export type { LocalSearchHit, LocalEventHit, LocalTaskHit }

export function localSearchCaptures(query: string, captures: InboxCapture[], limit = 5): LocalSearchHit[] {
  return sharedLocalSearchCaptures(query, captures, limit)
}

export function localSearchEvents(query: string, events: CalendarEvent[], limit = 5): LocalEventHit[] {
  return sharedLocalSearchEvents(query, events, limit)
}

export function localSearchTasks(query: string, tasks: Task[], limit = 5): LocalTaskHit[] {
  return sharedLocalSearchTasks(query, tasks, limit)
}

export function localAnswer(query: string, opts: { captures: InboxCapture[]; events: CalendarEvent[]; tasks: Task[] }) {
  return sharedLocalAnswer(query, opts)
}
