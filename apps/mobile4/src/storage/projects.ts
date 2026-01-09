import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseSessionUser } from '@/src/supabase/helpers';

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  status: 'active' | 'archived';
};

const STORAGE_KEY = 'insight5.mobile.projects.v1';

async function listProjectsLocal(): Promise<Project[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveProjects(projects: Project[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
}

export async function listProjects(): Promise<Project[]> {
  const session = await getSupabaseSessionUser();
  if (!session) return listProjectsLocal();
  const { supabase, user } = session;
  const { data } = await supabase
    .from('projects')
    .select('id, created_at, title, status')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.title ?? '',
    createdAt: Date.parse(row.created_at),
    status: row.status === 'archived' ? 'archived' : 'active',
  }));
}

export async function addProject(name: string): Promise<Project> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const projects = await listProjectsLocal();
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      createdAt: Date.now(),
      status: 'active',
    };
    projects.push(project);
    await saveProjects(projects);
    return project;
  }
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: name.trim(),
    })
    .select('id, created_at, title, status')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save project.');
  }
  return {
    id: data.id,
    name: data.title ?? name.trim(),
    createdAt: Date.parse(data.created_at),
    status: data.status === 'archived' ? 'archived' : 'active',
  };
}

export async function deleteProject(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const projects = await listProjectsLocal();
    const next = projects.filter((p) => p.id !== id);
    await saveProjects(next);
    return;
  }
  const { supabase } = session;
  await supabase.from('projects').update({ status: 'archived' }).eq('id', id);
}
