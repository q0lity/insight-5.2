import {
  buildForwardOnlyConfig,
  type CalendarSyncResult,
  type CalendarSyncClient,
  type CalendarSyncConfig,
} from '@insight/shared'

import { invokeCalendarSync, invokeMicrosoftCalendarSync } from '@/src/supabase/functions'
import { listCalendarConnections, type CalendarProvider } from '@/src/services/calendarConnections'

export function defaultCalendarSyncConfig(now: Date = new Date()): CalendarSyncConfig {
  return buildForwardOnlyConfig(now)
}

export function createCalendarSyncClient(): CalendarSyncClient {
  return {
    async listAccounts() {
      throw new Error('Calendar sync client is not configured.')
    },
    async listCalendars() {
      throw new Error('Calendar sync client is not configured.')
    },
    async sync() {
      throw new Error('Calendar sync client is not configured.')
    },
    async upsertEvent() {
      throw new Error('Calendar sync client is not configured.')
    },
    async deleteEvent() {
      throw new Error('Calendar sync client is not configured.')
    },
  }
}

export type CalendarSyncOutcome = {
  provider: CalendarProvider
  result?: CalendarSyncResult
  error?: string
}

export async function syncConnectedCalendars(): Promise<CalendarSyncOutcome[]> {
  const connections = await listCalendarConnections()
  const providers = new Set(connections.map((connection) => connection.provider))

  if (providers.size === 0) {
    throw new Error('No calendar providers connected. Connect Google or Microsoft in Settings.')
  }

  const config = defaultCalendarSyncConfig()
  const payload = { scopeStartMs: config.scopeStartMs }
  const outcomes: CalendarSyncOutcome[] = []

  if (providers.has('google')) {
    try {
      const result = (await invokeCalendarSync(payload)) as CalendarSyncResult
      outcomes.push({ provider: 'google', result })
    } catch (err) {
      outcomes.push({
        provider: 'google',
        error: err instanceof Error ? err.message : 'Google sync failed.',
      })
    }
  }

  if (providers.has('microsoft')) {
    try {
      const result = (await invokeMicrosoftCalendarSync(payload)) as CalendarSyncResult
      outcomes.push({ provider: 'microsoft', result })
    } catch (err) {
      outcomes.push({
        provider: 'microsoft',
        error: err instanceof Error ? err.message : 'Microsoft sync failed.',
      })
    }
  }

  if (!outcomes.some((outcome) => outcome.result)) {
    const errors = outcomes
      .map((outcome) => `${outcome.provider}: ${outcome.error ?? 'Sync failed.'}`)
      .join(' | ')
    throw new Error(errors)
  }

  return outcomes
}
