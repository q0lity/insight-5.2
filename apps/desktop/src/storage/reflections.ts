// import { db } from '../db/insight-db'

export type Reflection = {
  id: string
  createdAt: number
  dateRange: { start: number; end: number }
  title: string
  summary: string
  themes: Array<{
    title: string
    content: string
    noteIds: string[]
  }>
  isArchived: boolean
}

export async function listReflections(): Promise<Reflection[]> {
  // Mock reflections for now as the LLM synthesis isn't fully implemented in storage
  const mock: Reflection[] = [
    {
      id: 'ref_1',
      createdAt: Date.now() - 86400000,
      dateRange: { start: Date.now() - 86400000 * 3, end: Date.now() - 86400000 },
      title: 'Weekly Synthesis: Focus & Growth',
      summary: 'Your week was dominated by deep work on the marketing strategy and a renewed focus on personal wellness through daily walks.',
      themes: [
        {
          title: '🎯 Marketing Strategy',
          content: 'You’ve been refining the value proposition, specifically focusing on the "zero-friction" aspect of the capture tool.',
          noteIds: []
        },
        {
          title: '🌿 Wellness & Energy',
          content: 'Daily morning walks are consistently mentioned as a key driver for clarity and sustained energy throughout the day.',
          noteIds: []
        }
      ],
      isArchived: false
    }
  ]
  return mock
}
