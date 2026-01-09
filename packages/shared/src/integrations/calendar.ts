export type CalendarProvider = 'google' | 'microsoft' | 'apple' | 'android'
export type CalendarSyncDirection = 'two-way'
export type CalendarSyncScope = 'future-only'
export type CalendarConflictStrategy = 'last-write-wins'

export type CalendarAccount = {
  id: string
  provider: CalendarProvider
  displayName: string
  email?: string | null
}

export type CalendarListItem = {
  id: string
  name: string
  primary?: boolean
  color?: string | null
  timeZone?: string | null
}

export type CalendarEventInput = {
  id?: string
  title: string
  startAt: number
  endAt: number
  allDay: boolean
  notes?: string
  location?: string | null
  attendees?: string[]
  sourceCalendarId?: string
}

export type CalendarSyncConfig = {
  direction: CalendarSyncDirection
  scope: CalendarSyncScope
  scopeStartMs: number
  conflictStrategy: CalendarConflictStrategy
}

export type CalendarSyncResult = {
  pulled: number
  pushed: number
  conflicts: number
  lastSyncAt: number
}

export type CalendarSyncClient = {
  listAccounts(): Promise<CalendarAccount[]>
  listCalendars(accountId: string): Promise<CalendarListItem[]>
  sync(accountId: string, calendarId: string, config: CalendarSyncConfig): Promise<CalendarSyncResult>
  upsertEvent(accountId: string, calendarId: string, payload: CalendarEventInput): Promise<{ id: string }>
  deleteEvent(accountId: string, calendarId: string, eventId: string): Promise<void>
}

export function getStartOfTodayMs(now: Date = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start.getTime()
}

export function buildForwardOnlyConfig(now: Date = new Date()): CalendarSyncConfig {
  return {
    direction: 'two-way',
    scope: 'future-only',
    scopeStartMs: getStartOfTodayMs(now),
    conflictStrategy: 'last-write-wins',
  }
}
