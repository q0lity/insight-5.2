import {
  buildForwardOnlyHealthConfig,
  type HealthSyncClient,
  type HealthSyncConfig,
} from '@insight/shared'

export function defaultHealthSyncConfig(now: Date = new Date()): HealthSyncConfig {
  return buildForwardOnlyHealthConfig(now)
}

export function createHealthSyncClient(): HealthSyncClient {
  return {
    async listProviders() {
      throw new Error('Health sync client is not configured.')
    },
    async sync() {
      throw new Error('Health sync client is not configured.')
    },
  }
}
