// Core types for Insight Mobile

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  title: string;
  facets: EntryFacet[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type EntryFacet = 'event' | 'task' | 'habit' | 'tracker' | 'note';

export interface TrackerLog {
  id: string;
  trackerId: string;
  value: number;
  timestamp: string;
  entryId?: string;
}

export interface Goal {
  id: string;
  title: string;
  importance: number; // 1-10
  tags?: string[];
  userId: string;
}

export interface Project {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  goalId?: string;
  userId: string;
}
