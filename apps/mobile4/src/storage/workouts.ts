import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Exercise, ExerciseSet, WorkoutEntry, WorkoutType } from '@/src/lib/health';
import { fromIso, getSupabaseSessionUser } from '@/src/supabase/helpers';

const STORAGE_KEY = 'insight5.mobile.workouts.v1';
const CONTEXT_KEY = 'insight5.mobile.workouts.context.v1';

// Smart context tracking for set additions
type WorkoutContext = {
  workoutId: string | null;
  lastExerciseId: string | null;
  lastExerciseName: string | null;
  lastSetDefaults: Partial<ExerciseSet>;
  timestamp: number;
};

const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Get the current workout context (if still valid)
export async function getWorkoutContext(): Promise<WorkoutContext | null> {
  try {
    const raw = await AsyncStorage.getItem(CONTEXT_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as WorkoutContext;
    if (Date.now() - ctx.timestamp > CONTEXT_EXPIRY_MS) {
      await clearWorkoutContext();
      return null;
    }
    return ctx.workoutId ? ctx : null;
  } catch {
    return null;
  }
}

// Update workout context after logging a workout or exercise
export async function updateWorkoutContext(
  workout: WorkoutEntry,
  exercise?: Exercise,
  set?: ExerciseSet
): Promise<void> {
  const lastExercise = exercise ?? workout.exercises?.[workout.exercises.length - 1] ?? null;
  const ctx: WorkoutContext = {
    workoutId: workout.id,
    lastExerciseId: lastExercise?.id ?? null,
    lastExerciseName: lastExercise?.name ?? null,
    lastSetDefaults: set ? { reps: set.reps, weight: set.weight, weightUnit: set.weightUnit } : {},
    timestamp: Date.now(),
  };
  try {
    await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

// Clear the workout context
export async function clearWorkoutContext(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CONTEXT_KEY);
  } catch {
    // ignore
  }
}

// Append a set to the most recent exercise in context
export async function appendSetToRecentExercise(set: ExerciseSet): Promise<boolean> {
  const ctx = await getWorkoutContext();
  if (!ctx?.workoutId || !ctx.lastExerciseId) return false;

  const workouts = await loadWorkoutsLocal();
  const workoutIndex = workouts.findIndex((w) => w.id === ctx.workoutId);
  if (workoutIndex === -1) return false;

  const workout = workouts[workoutIndex];
  const exerciseIndex = workout.exercises.findIndex((ex) => ex.id === ctx.lastExerciseId);
  if (exerciseIndex === -1) return false;

  // Merge set with defaults from last set
  const mergedSet: ExerciseSet = {
    reps: set.reps ?? ctx.lastSetDefaults.reps,
    weight: set.weight ?? ctx.lastSetDefaults.weight,
    weightUnit: set.weightUnit ?? ctx.lastSetDefaults.weightUnit,
    duration: set.duration,
    distance: set.distance,
    rpe: set.rpe,
    restSeconds: set.restSeconds,
  };

  // Add the set
  workout.exercises[exerciseIndex].sets.push(mergedSet);
  await saveWorkout(workout);

  // Update context with new set
  await updateWorkoutContext(workout, workout.exercises[exerciseIndex], mergedSet);

  return true;
}

// Append a set to a specific exercise by name
export async function appendSetToExerciseByName(exerciseName: string, set: ExerciseSet): Promise<boolean> {
  const ctx = await getWorkoutContext();
  if (!ctx?.workoutId) return false;

  const workouts = await loadWorkoutsLocal();
  const workoutIndex = workouts.findIndex((w) => w.id === ctx.workoutId);
  if (workoutIndex === -1) return false;

  const workout = workouts[workoutIndex];
  const normalizedName = exerciseName.toLowerCase().trim();
  const exerciseIndex = workout.exercises.findIndex(
    (ex) => ex.name.toLowerCase().trim() === normalizedName
  );
  if (exerciseIndex === -1) return false;

  // Add the set
  workout.exercises[exerciseIndex].sets.push(set);
  await saveWorkout(workout);

  // Update context
  await updateWorkoutContext(workout, workout.exercises[exerciseIndex], set);

  return true;
}

type SupabaseSession = { supabase: any; user: { id: string } };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveEntryId(entryId: string | null | undefined, session?: SupabaseSession | null) {
  if (!entryId) return null;
  if (isUuid(entryId)) return entryId;
  const resolvedSession = session ?? (await getSupabaseSessionUser());
  if (!resolvedSession) return null;
  const { supabase, user } = resolvedSession;
  const { data } = await supabase
    .from('entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('frontmatter->>legacyId', entryId)
    .maybeSingle();
  return data?.id ?? null;
}

function workoutTypeToTemplate(type: WorkoutType) {
  if (type === 'cardio') return 'cardio';
  if (type === 'mobility' || type === 'recovery') return 'mobility';
  return 'strength';
}

function templateToWorkoutType(template: string | null | undefined): WorkoutType {
  if (template === 'cardio') return 'cardio';
  if (template === 'mobility') return 'mobility';
  return 'strength';
}

function buildExercisesFromRows(rows: any[], fallbackType: WorkoutType): Exercise[] {
  const map = new Map<string, Exercise>();
  for (const row of rows) {
    const name = typeof row.exercise === 'string' && row.exercise.trim() ? row.exercise.trim() : 'Exercise';
    const meta = (row.metadata ?? {}) as Record<string, any>;
    const type = (meta.workoutType as WorkoutType | undefined) ?? fallbackType;
    let exercise = map.get(name);
    if (!exercise) {
      exercise = {
        id: typeof meta.localExerciseId === 'string' ? meta.localExerciseId : `${name}_${Math.random().toString(16).slice(2)}`,
        name,
        type,
        sets: [],
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        muscleGroups: Array.isArray(meta.muscleGroups) ? meta.muscleGroups : undefined,
      };
      map.set(name, exercise);
    }
    const set: ExerciseSet = {};
    if (row.reps != null) set.reps = Number(row.reps);
    if (row.weight != null) set.weight = Number(row.weight);
    if (row.duration_seconds != null) set.duration = Number(row.duration_seconds);
    if (row.distance != null) set.distance = Number(row.distance);
    if (row.rpe != null) set.rpe = Number(row.rpe);
    if (Object.keys(set).length) exercise.sets.push(set);
  }
  return Array.from(map.values());
}

function buildWorkoutRowsPayload(entry: WorkoutEntry, sessionId: string, userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (const exercise of entry.exercises ?? []) {
    const sets = exercise.sets?.length ? exercise.sets : [{} as ExerciseSet];
    sets.forEach((set, idx) => {
      rows.push({
        user_id: userId,
        session_id: sessionId,
        exercise: exercise.name,
        set_index: idx + 1,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        weight_unit: set.weight != null ? 'lb' : null,
        rpe: set.rpe ?? entry.overallRpe ?? null,
        duration_seconds: set.duration ?? null,
        distance: set.distance ?? null,
        distance_unit: set.distanceUnit ?? null,
        notes: exercise.notes ?? null,
        metadata: {
          localWorkoutId: entry.id,
          localExerciseId: exercise.id,
          workoutType: entry.type,
          muscleGroups: exercise.muscleGroups ?? [],
        },
      });
    });
  }
  return rows;
}

async function upsertWorkoutToSupabase(entry: WorkoutEntry, session: SupabaseSession) {
  const { supabase, user } = session;
  const resolvedEntryId = await resolveEntryId(entry.sourceCaptureId ?? null, session);
  if (!resolvedEntryId) return;

  const { data: sessionRow } = await supabase
    .from('workout_sessions')
    .upsert(
      {
        user_id: user.id,
        entry_id: resolvedEntryId,
        template: workoutTypeToTemplate(entry.type),
      },
      { onConflict: 'entry_id' }
    )
    .select('id')
    .single();

  if (!sessionRow?.id) return;

  await supabase.from('workout_rows').delete().eq('session_id', sessionRow.id);
  const rows = buildWorkoutRowsPayload(entry, sessionRow.id, user.id);
  if (rows.length) {
    await supabase.from('workout_rows').insert(rows);
  }
}

async function deleteWorkoutFromSupabase(entry: WorkoutEntry, session: SupabaseSession) {
  const { supabase } = session;
  const resolvedEntryId = await resolveEntryId(entry.sourceCaptureId ?? null, session);
  if (!resolvedEntryId) return;
  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('entry_id', resolvedEntryId)
    .maybeSingle();
  if (!existing?.id) return;
  await supabase.from('workout_rows').delete().eq('session_id', existing.id);
  await supabase.from('workout_sessions').delete().eq('id', existing.id);
}

async function listWorkoutsFromSupabase(session: SupabaseSession): Promise<WorkoutEntry[]> {
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id, entry_id, template, created_at, updated_at, workout_rows ( exercise, set_index, reps, weight, weight_unit, rpe, duration_seconds, distance, distance_unit, notes, metadata ), entries ( id, title, created_at, updated_at, start_at, end_at, duration_minutes, frontmatter )'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => {
    const entry = Array.isArray(row.entries) ? row.entries[0] : row.entries;
    const rows = Array.isArray(row.workout_rows) ? row.workout_rows : [];
    const startAt = fromIso(entry?.start_at) ?? fromIso(entry?.created_at) ?? Date.now();
    const computedDuration = rows.reduce((sum: number, item: any) => sum + (item?.duration_seconds ?? 0), 0);
    const totalDuration =
      typeof entry?.duration_minutes === 'number'
        ? entry.duration_minutes
        : computedDuration
          ? Math.round(computedDuration / 60)
          : undefined;
    const endAt =
      fromIso(entry?.end_at) ??
      (totalDuration != null ? startAt + totalDuration * 60 * 1000 : undefined);
    const fallbackType = templateToWorkoutType(row.template);
    const metaType = rows
      .map((item: any) => item?.metadata?.workoutType)
      .find((value: any) => value && typeof value === 'string');
    const workoutType = (metaType as WorkoutType | undefined) ?? fallbackType;
    const exercises = buildExercisesFromRows(rows, workoutType);
    const rpeValues = rows
      .map((item: any) => (item?.rpe != null ? Number(item.rpe) : null))
      .filter((value: number | null) => value != null) as number[];
    const overallRpe = rpeValues.length ? rpeValues.reduce((sum, v) => sum + v, 0) / rpeValues.length : undefined;

    return {
      id: (entry?.frontmatter?.legacyId as string | undefined) ?? row.id,
      title: entry?.title ?? (workoutType === 'cardio' ? 'Cardio' : 'Workout'),
      type: workoutType,
      exercises,
      startAt,
      endAt,
      totalDuration,
      estimatedCalories: typeof entry?.frontmatter?.estimatedCalories === 'number' ? entry.frontmatter.estimatedCalories : undefined,
      overallRpe,
      notes: typeof entry?.frontmatter?.notes === 'string' ? entry.frontmatter.notes : undefined,
      sourceCaptureId: entry?.id ?? null,
    };
  });
}

async function loadWorkoutsLocal(): Promise<WorkoutEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkoutEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
}

async function saveWorkoutsLocal(entries: WorkoutEntry[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export async function listWorkouts(): Promise<WorkoutEntry[]> {
  const session = await getSupabaseSessionUser();
  if (session) {
    const remote = await listWorkoutsFromSupabase(session);
    if (remote.length) return remote.sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0));
  }
  const workouts = await loadWorkoutsLocal();
  return workouts.sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0));
}

export async function getWorkout(id: string): Promise<WorkoutEntry | null> {
  const workouts = await listWorkouts();
  return workouts.find((entry) => entry.id === id) ?? null;
}

export async function saveWorkout(entry: WorkoutEntry): Promise<WorkoutEntry> {
  const existing = await loadWorkoutsLocal();
  const next = [entry, ...existing];
  await saveWorkoutsLocal(next);
  const session = await getSupabaseSessionUser();
  if (session) {
    await upsertWorkoutToSupabase(entry, session);
  }
  return entry;
}

export async function deleteWorkout(id: string) {
  const existing = await loadWorkoutsLocal();
  const target = existing.find((entry) => entry.id === id) ?? null;
  const next = existing.filter((entry) => entry.id !== id);
  if (next.length === existing.length) return false;
  await saveWorkoutsLocal(next);
  const session = await getSupabaseSessionUser();
  if (session && target) {
    await deleteWorkoutFromSupabase(target, session);
  }
  return true;
}

export async function syncLocalWorkoutsToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const workouts = await loadWorkoutsLocal();
  for (const entry of workouts) {
    await upsertWorkoutToSupabase(entry, session);
  }
}
