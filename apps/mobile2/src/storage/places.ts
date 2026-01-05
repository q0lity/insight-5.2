import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseSessionUser, normalizeEntityKey } from '@/src/supabase/helpers';

export type Place = {
  id: string;
  name: string;
  createdAt: number;
};

const STORAGE_KEY = 'insight5.mobile.places.v1';

async function listPlacesLocal(): Promise<Place[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Place[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePlaces(places: Place[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // ignore
  }
}

export async function listPlaces(): Promise<Place[]> {
  const session = await getSupabaseSessionUser();
  if (!session) return listPlacesLocal();
  const { supabase, user } = session;
  const { data } = await supabase
    .from('entities')
    .select('id, created_at, display_name')
    .eq('user_id', user.id)
    .eq('type', 'place')
    .order('updated_at', { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.display_name ?? '',
    createdAt: Date.parse(row.created_at),
  }));
}

export async function addPlace(name: string): Promise<Place> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const places = await listPlacesLocal();
    const place: Place = {
      id: `plac_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      createdAt: Date.now(),
    };
    places.push(place);
    await savePlaces(places);
    return place;
  }
  const { supabase, user } = session;
  const key = normalizeEntityKey(name);
  const { data, error } = await supabase
    .from('entities')
    .upsert(
      {
        user_id: user.id,
        type: 'place',
        key,
        display_name: name.trim(),
      },
      { onConflict: 'user_id,type,key' }
    )
    .select('id, created_at, display_name')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save place.');
  }
  return {
    id: data.id,
    name: data.display_name ?? name.trim(),
    createdAt: Date.parse(data.created_at),
  };
}

export async function deletePlace(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const places = await listPlacesLocal();
    const next = places.filter((p) => p.id !== id);
    await savePlaces(next);
    return;
  }
  const { supabase } = session;
  await supabase.from('entities').delete().eq('id', id);
}
