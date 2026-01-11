import { getGoalMultiplierSync, getProjectMultiplierSync, getMultipliersCache } from '@/src/storage/multipliers';
import { getStreakMultiplierSync, recordActivity } from './streaks';

export type PointsInput = {
  importance?: number | null;
  difficulty?: number | null;
  durationMinutes?: number | null;
  goal?: string | null;
  project?: string | null;
  goalImportance?: number | null;
  fallbackGoalImportance?: number | null;
  includeStreak?: boolean;
};

type GoalMultiplierInput = {
  goal?: string | null;
  goalImportance?: number | null;
  fallbackImportance?: number | null;
};

export type EventPointsInput = {
  startAt: number;
  endAt?: number | null;
  active?: boolean;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  goal?: string | null;
  project?: string | null;
  frontmatter?: string | null;
  points?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function basePoints(importance: number | null | undefined, difficulty: number | null | undefined) {
  const i = importance ?? 5;
  const d = difficulty ?? 5;
  if (!Number.isFinite(i) || !Number.isFinite(d)) return 0;
  return clamp(i, 1, 10) * clamp(d, 1, 10);
}

export function formatXp(value: number, precision = 3) {
  if (!Number.isFinite(value)) return (0).toFixed(precision);
  return value.toFixed(precision);
}

export function resolveGoalMultiplier({ goal, goalImportance, fallbackImportance }: GoalMultiplierInput) {
  if (!goal) return 1;
  const importance = goalImportance ?? fallbackImportance ?? 0;
  if (!Number.isFinite(importance) || importance <= 0) return 1;
  const clamped = Math.min(Math.max(importance, 0), 10);
  return 1 + clamped / 10;
}

export function pointsForMinutes(base: number, minutes: number, mult = 1, includeStreak = true) {
  if (!Number.isFinite(base) || !Number.isFinite(minutes)) return 0;
  const streakMult = includeStreak ? getStreakMultiplierSync() : 1;
  return base * Math.max(0, minutes) / 60 * (Number.isFinite(mult) ? mult : 1) * streakMult;
}

export function multiplierFor(goal: string | null | undefined, project: string | null | undefined) {
  const state = getMultipliersCache();
  return getGoalMultiplierSync(goal ?? null, state) * getProjectMultiplierSync(project ?? null, state);
}

export function totalMultiplierFor(goal: string | null | undefined, project: string | null | undefined) {
  return multiplierFor(goal, project) * getStreakMultiplierSync();
}

/**
 * Compute XP with Atomic Habits 1% streak multiplier
 * Formula: importance × difficulty × (duration/60) × goalMult × streakMult
 */
export function computeXp({
  importance,
  difficulty,
  durationMinutes,
  goal,
  project,
  includeStreak = true,
}: PointsInput) {
  const safeImportance = Number.isFinite(importance ?? NaN) ? Math.max(0, importance ?? 0) : 0;
  const safeDifficulty = Number.isFinite(difficulty ?? NaN) ? Math.max(0, difficulty ?? 0) : 0;
  const safeDuration = Number.isFinite(durationMinutes ?? NaN) ? Math.max(0, durationMinutes ?? 0) : 0;
  if (!safeImportance || !safeDifficulty || !safeDuration) return 0;
  const base = basePoints(safeImportance, safeDifficulty);
  if (!base) return 0;
  const mult = multiplierFor(goal ?? null, project ?? null);
  return pointsForMinutes(base, safeDuration, mult, includeStreak);
}

export function extractGoalImportance(frontmatter?: string | null) {
  if (!frontmatter) return null;
  try {
    const parsed = JSON.parse(frontmatter) as Record<string, unknown>;
    const raw = parsed.goalImportance ?? parsed.goal_importance ?? parsed.goalImportanceScore;
    const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  } catch {
    return null;
  }
}

export function resolveDurationMinutes({
  startAt,
  endAt,
  active,
  estimateMinutes,
  now,
}: {
  startAt: number;
  endAt?: number | null;
  active?: boolean;
  estimateMinutes?: number | null;
  now?: number;
}) {
  const current = now ?? Date.now();
  if (endAt) return Math.max(0, (endAt - startAt) / 60000);
  if (active) return Math.max(0, (current - startAt) / 60000);
  if (estimateMinutes != null) return Math.max(0, estimateMinutes);
  return 0;
}

export function computeEventXp(event: EventPointsInput, now = Date.now()) {
  const durationMinutes = resolveDurationMinutes({
    startAt: event.startAt,
    endAt: event.endAt,
    active: event.active,
    estimateMinutes: event.estimateMinutes ?? null,
    now,
  });
  const computed = computeXp({
    importance: event.importance ?? null,
    difficulty: event.difficulty ?? null,
    durationMinutes,
    goal: event.goal ?? null,
    project: event.project ?? null,
  });
  // Record activity when calculating XP (extends streak)
  if (computed > 0) {
    recordActivity(); // Fire and forget - extends daily streak
  }
  if (computed > 0) return computed;
  if (typeof event.points === 'number') return event.points;
  return 0;
}

// Re-export streak functions for convenience
export {
  getStreakMultiplierSync,
  getStreakMultiplier,
  getStreakInfo,
  getStreakInfoSync,
  recordActivity,
  checkMilestone,
  daysToNextMilestone,
  getStreakMessage,
  getLevelUpMessage,
} from './streaks';
