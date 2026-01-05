export type PointsInput = {
  importance?: number | null;
  difficulty?: number | null;
  durationMinutes?: number | null;
  goal?: string | null;
  goalImportance?: number | null;
  fallbackGoalImportance?: number | null;
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
  frontmatter?: string | null;
  points?: number | null;
};

export function resolveGoalMultiplier({ goal, goalImportance, fallbackImportance }: GoalMultiplierInput) {
  if (!goal) return 1;
  const importance = goalImportance ?? fallbackImportance ?? 0;
  if (!Number.isFinite(importance) || importance <= 0) return 1;
  const clamped = Math.min(Math.max(importance, 0), 10);
  return 1 + clamped / 10;
}

export function computeXp({
  importance,
  difficulty,
  durationMinutes,
  goal,
  goalImportance,
  fallbackGoalImportance,
}: PointsInput) {
  const safeImportance = Number.isFinite(importance ?? NaN) ? Math.max(0, importance ?? 0) : 0;
  const safeDifficulty = Number.isFinite(difficulty ?? NaN) ? Math.max(0, difficulty ?? 0) : 0;
  const safeDuration = Number.isFinite(durationMinutes ?? NaN) ? Math.max(0, durationMinutes ?? 0) : 0;
  if (!safeImportance || !safeDifficulty || !safeDuration) return 0;
  const multiplier = resolveGoalMultiplier({
    goal,
    goalImportance,
    fallbackImportance: fallbackGoalImportance ?? safeImportance,
  });
  return safeImportance * safeDifficulty * (safeDuration / 60) * multiplier;
}

export function formatXp(value: number, precision = 3) {
  if (!Number.isFinite(value)) return (0).toFixed(precision);
  return value.toFixed(precision);
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
  const goalImportance = extractGoalImportance(event.frontmatter);
  const computed = computeXp({
    importance: event.importance ?? null,
    difficulty: event.difficulty ?? null,
    durationMinutes,
    goal: event.goal ?? null,
    goalImportance,
    fallbackGoalImportance: event.importance ?? null,
  });
  if (computed > 0) return computed;
  if (typeof event.points === 'number') return event.points;
  return 0;
}
