import { getStartOfTodayMs } from './calendar'

export type HealthProvider = 'apple-health' | 'health-connect' | 'google-fit'

export type HealthMetricKey =
  | 'steps'
  | 'weight'
  | 'sleep'
  | 'heart_rate'
  | 'workout_minutes'
  | 'calories'
  | 'distance'

export type HealthSeriesPoint = {
  timestamp: number
  value: number
  unit: string
}

export type HealthSeries = {
  metric: HealthMetricKey
  provider: HealthProvider
  points: HealthSeriesPoint[]
}

export type HealthSyncConfig = {
  scope: 'forward-only'
  scopeStartMs: number
}

export type HealthSyncResult = {
  series: HealthSeries[]
  totalPoints: number
  lastSyncAt: number
}

export type HealthSyncClient = {
  listProviders(): Promise<HealthProvider[]>
  sync(provider: HealthProvider, config: HealthSyncConfig): Promise<HealthSyncResult>
}

export function buildForwardOnlyHealthConfig(now: Date = new Date()): HealthSyncConfig {
  return {
    scope: 'forward-only',
    scopeStartMs: getStartOfTodayMs(now),
  }
}
