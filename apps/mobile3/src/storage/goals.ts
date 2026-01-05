import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseSessionUser } from '@/src/supabase/helpers';

export type Goal = {
  id: string;
  name: string;
  createdAt: number;
};

const STORAGE_KEY = 'insight5.mobile.goals.v1';

async function listGoalsLocal(): Promise<Goal[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Goal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveGoals(goals: Goal[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}

export async function listGoals(): Promise<Goal[]> {
  const session = await getSupabaseSessionUser();
  if (!session) return listGoalsLocal();
  const { supabase, user } = session;
  const { data } = await supabase
    .from('goals')
    .select('id, created_at, title')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.title ?? '',
    createdAt: Date.parse(row.created_at),
  }));
}

export async function addGoal(name: string): Promise<Goal> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const goals = await listGoalsLocal();
    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      createdAt: Date.now(),
    };
    goals.push(goal);
    await saveGoals(goals);
    return goal;
  }
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: name.trim(),
    })
    .select('id, created_at, title')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save goal.');
  }
  return {
    id: data.id,
    name: data.title ?? name.trim(),
    createdAt: Date.parse(data.created_at),
  };
}

export async function deleteGoal(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const goals = await listGoalsLocal();
    const next = goals.filter((g) => g.id !== id);
    await saveGoals(next);
    return;
  }
  const { supabase } = session;
  await supabase.from('goals').update({ archived: true }).eq('id', id);
}
