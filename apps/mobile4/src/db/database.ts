/**
 * WatermelonDB Database Setup for Insight52 Mobile
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';

import { schema, TableNames } from './schema';
import {
  Entry,
  Goal,
  Entity,
  WorkoutSession,
  WorkoutRow,
  NutritionLog,
  SyncQueue,
  Attachment,
} from './models';

// Database adapter configuration
const adapter = new SQLiteAdapter({
  schema,
  // Use JSI for better performance on React Native
  jsi: Platform.OS === 'ios',
  // Enable WAL mode for better concurrent access
  onSetUpError: (error) => {
    console.error('[Database] Setup error:', error);
  },
});

// Model classes registry
const modelClasses = [
  Entry,
  Goal,
  Entity,
  WorkoutSession,
  WorkoutRow,
  NutritionLog,
  SyncQueue,
  Attachment,
];

// Create database instance
export const database = new Database({
  adapter,
  modelClasses,
});

// Collection accessors for type-safe queries
export const collections = {
  entries: database.get<Entry>(TableNames.ENTRIES),
  goals: database.get<Goal>(TableNames.GOALS),
  entities: database.get<Entity>(TableNames.ENTITIES),
  workoutSessions: database.get<WorkoutSession>(TableNames.WORKOUT_SESSIONS),
  workoutRows: database.get<WorkoutRow>(TableNames.WORKOUT_ROWS),
  nutritionLogs: database.get<NutritionLog>(TableNames.NUTRITION_LOGS),
  syncQueue: database.get<SyncQueue>(TableNames.SYNC_QUEUE),
  attachments: database.get<Attachment>(TableNames.ATTACHMENTS),
};

// Helper type for collection names
export type CollectionName = keyof typeof collections;

// Reset database (for development/testing)
export async function resetDatabase(): Promise<void> {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}

// Check if database is ready
export async function isDatabaseReady(): Promise<boolean> {
  try {
    // Try a simple query to verify database is working
    await collections.entries.query().fetchCount();
    return true;
  } catch {
    return false;
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<{
  entries: number;
  goals: number;
  entities: number;
  workoutSessions: number;
  nutritionLogs: number;
  pendingSyncs: number;
  attachments: number;
}> {
  const [entries, goals, entities, workoutSessions, nutritionLogs, pendingSyncs, attachments] =
    await Promise.all([
      collections.entries.query().fetchCount(),
      collections.goals.query().fetchCount(),
      collections.entities.query().fetchCount(),
      collections.workoutSessions.query().fetchCount(),
      collections.nutritionLogs.query().fetchCount(),
      collections.syncQueue.query().fetchCount(),
      collections.attachments.query().fetchCount(),
    ]);

  return {
    entries,
    goals,
    entities,
    workoutSessions,
    nutritionLogs,
    pendingSyncs,
    attachments,
  };
}

export { Entry, Goal, Entity, WorkoutSession, WorkoutRow, NutritionLog, SyncQueue, Attachment };
export { TableNames, SyncStatus, type SyncStatusType, type TableName } from './schema';
