/**
 * WatermelonDB Data Layer for Insight52 Mobile
 *
 * Provides offline-first data storage with Supabase sync.
 */

// Database and collections
export {
  database,
  collections,
  resetDatabase,
  isDatabaseReady,
  getDatabaseStats,
  Entry,
  Goal,
  Entity,
  WorkoutSession,
  WorkoutRow,
  NutritionLog,
  SyncQueue,
  Attachment,
  TableNames,
  SyncStatus,
} from './database';

export type { CollectionName, SyncStatusType, TableName } from './database';

// Schema
export { schema } from './schema';

// Models
export { SyncableModel, safeParseJson, safeStringifyJson } from './models';

// Sync engine
export { syncEngine, offlineQueue, queueRecordChange, shouldQueueOperation, realtimeSubscriptions } from './sync';
