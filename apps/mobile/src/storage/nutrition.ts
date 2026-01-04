import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FoodItem, MealEntry, MealType } from '@/src/lib/health';
import { fromIso, getSupabaseSessionUser } from '@/src/supabase/helpers';

const STORAGE_KEY = 'insight5.mobile.meals.v1';

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

async function upsertMealToSupabase(entry: MealEntry, session: SupabaseSession) {
  const { supabase, user } = session;
  const resolvedEntryId = await resolveEntryId(entry.sourceCaptureId ?? null, session);
  if (!resolvedEntryId) return;
  const payload = {
    user_id: user.id,
    entry_id: resolvedEntryId,
    calories: entry.totalCalories ?? null,
    protein_g: entry.macros?.protein ?? null,
    carbs_g: entry.macros?.carbs ?? null,
    fat_g: entry.macros?.fat ?? null,
    // Extended micronutrients
    fiber_g: entry.macros?.fiber ?? null,
    saturated_fat_g: entry.macros?.saturatedFat ?? null,
    trans_fat_g: entry.macros?.transFat ?? null,
    sugar_g: entry.macros?.sugar ?? null,
    sodium_mg: entry.macros?.sodium ?? null,
    potassium_mg: entry.macros?.potassium ?? null,
    cholesterol_mg: entry.macros?.cholesterol ?? null,
    estimation_model: entry.estimationModel ?? null,
    confidence: null,
    source: 'estimate',
    metadata: {
      legacyId: entry.id,
      title: entry.title,
      type: entry.type,
      items: entry.items ?? [],
      location: entry.location ?? null,
      notes: entry.notes ?? null,
    },
  };

  await supabase.from('nutrition_logs').upsert(payload, { onConflict: 'entry_id' });
}

async function deleteMealFromSupabase(entry: MealEntry, session: SupabaseSession) {
  const { supabase } = session;
  const resolvedEntryId = await resolveEntryId(entry.sourceCaptureId ?? null, session);
  if (!resolvedEntryId) return;
  await supabase.from('nutrition_logs').delete().eq('entry_id', resolvedEntryId);
}

function normalizeMealType(value: string | null | undefined): MealType {
  if (value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack' || value === 'drink') {
    return value;
  }
  return 'snack';
}

function normalizeFoodItems(value: unknown): FoodItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item.id === 'string') as FoodItem[];
}

async function listMealsFromSupabase(session: SupabaseSession): Promise<MealEntry[]> {
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select(
      'id, entry_id, created_at, updated_at, calories, protein_g, carbs_g, fat_g, fiber_g, saturated_fat_g, trans_fat_g, sugar_g, sodium_mg, potassium_mg, cholesterol_mg, estimation_model, metadata, entries ( id, title, created_at, updated_at, start_at, frontmatter )'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => {
    const entry = Array.isArray(row.entries) ? row.entries[0] : row.entries;
    const meta = (row.metadata ?? {}) as Record<string, any>;
    const eatenAt = fromIso(entry?.start_at) ?? fromIso(entry?.created_at) ?? Date.now();
    const createdAt = fromIso(row.created_at) ?? eatenAt;
    const updatedAt = fromIso(row.updated_at) ?? createdAt;
    const items = normalizeFoodItems(meta.items);
    const type = normalizeMealType(meta.type ?? entry?.frontmatter?.mealType);
    const title = typeof meta.title === 'string' ? meta.title : entry?.title ?? 'Meal';

    return {
      id: typeof meta.legacyId === 'string' ? meta.legacyId : row.id,
      title,
      type,
      items,
      totalCalories: Number(row.calories ?? 0),
      macros: {
        protein: Number(row.protein_g ?? 0),
        carbs: Number(row.carbs_g ?? 0),
        fat: Number(row.fat_g ?? 0),
        fiber: row.fiber_g != null ? Number(row.fiber_g) : undefined,
        saturatedFat: row.saturated_fat_g != null ? Number(row.saturated_fat_g) : undefined,
        transFat: row.trans_fat_g != null ? Number(row.trans_fat_g) : undefined,
        sugar: row.sugar_g != null ? Number(row.sugar_g) : undefined,
        sodium: row.sodium_mg != null ? Number(row.sodium_mg) : undefined,
        potassium: row.potassium_mg != null ? Number(row.potassium_mg) : undefined,
        cholesterol: row.cholesterol_mg != null ? Number(row.cholesterol_mg) : undefined,
      },
      location: typeof meta.location === 'string' ? meta.location : null,
      notes: typeof meta.notes === 'string' ? meta.notes : undefined,
      eatenAt,
      createdAt,
      updatedAt,
      sourceCaptureId: entry?.id ?? null,
      estimationModel: typeof row.estimation_model === 'string' ? row.estimation_model : undefined,
    };
  });
}

async function loadMealsLocal(): Promise<MealEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MealEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
}

async function saveMealsLocal(entries: MealEntry[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export async function listMeals(): Promise<MealEntry[]> {
  const session = await getSupabaseSessionUser();
  if (session) {
    const remote = await listMealsFromSupabase(session);
    if (remote.length) return remote.sort((a, b) => (b.eatenAt ?? 0) - (a.eatenAt ?? 0));
  }
  const meals = await loadMealsLocal();
  return meals.sort((a, b) => (b.eatenAt ?? 0) - (a.eatenAt ?? 0));
}

export async function saveMeal(entry: MealEntry): Promise<MealEntry> {
  const existing = await loadMealsLocal();
  const next = [entry, ...existing];
  await saveMealsLocal(next);
  const session = await getSupabaseSessionUser();
  if (session) {
    await upsertMealToSupabase(entry, session);
  }
  return entry;
}

export async function deleteMeal(id: string) {
  const existing = await loadMealsLocal();
  const target = existing.find((entry) => entry.id === id) ?? null;
  const next = existing.filter((entry) => entry.id !== id);
  if (next.length === existing.length) return false;
  await saveMealsLocal(next);
  const session = await getSupabaseSessionUser();
  if (session && target) {
    await deleteMealFromSupabase(target, session);
  }
  return true;
}

export async function syncLocalMealsToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const meals = await loadMealsLocal();
  for (const entry of meals) {
    await upsertMealToSupabase(entry, session);
  }
}
