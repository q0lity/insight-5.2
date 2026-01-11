import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseSessionUser, normalizeEntityKey } from '@/src/supabase/helpers';

export type Person = {
  id: string;
  name: string;
  createdAt: number;
};

const STORAGE_KEY = 'insight5.mobile.people.v1';

async function listPeopleLocal(): Promise<Person[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Person[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePeople(people: Person[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  } catch {
    // ignore
  }
}

export async function listPeople(): Promise<Person[]> {
  const session = await getSupabaseSessionUser();
  if (!session) return listPeopleLocal();
  const { supabase, user } = session;
  const { data } = await supabase
    .from('entities')
    .select('id, created_at, display_name')
    .eq('user_id', user.id)
    .eq('type', 'person')
    .order('updated_at', { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.display_name ?? '',
    createdAt: Date.parse(row.created_at),
  }));
}

export async function addPerson(name: string): Promise<Person> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const people = await listPeopleLocal();
    const person: Person = {
      id: `pers_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      createdAt: Date.now(),
    };
    people.push(person);
    await savePeople(people);
    return person;
  }
  const { supabase, user } = session;
  const key = normalizeEntityKey(name);
  const { data, error } = await supabase
    .from('entities')
    .upsert(
      {
        user_id: user.id,
        type: 'person',
        key,
        display_name: name.trim(),
      },
      { onConflict: 'user_id,type,key' }
    )
    .select('id, created_at, display_name')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save person.');
  }
  return {
    id: data.id,
    name: data.display_name ?? name.trim(),
    createdAt: Date.parse(data.created_at),
  };
}

export async function deletePerson(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const people = await listPeopleLocal();
    const next = people.filter((p) => p.id !== id);
    await savePeople(next);
    return;
  }
  const { supabase } = session;
  await supabase.from('entities').delete().eq('id', id);
}
