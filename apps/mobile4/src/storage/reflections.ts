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
  const now = Date.now()
  return [
    {
      id: 'ref_1',
      createdAt: now - 86400000,
      dateRange: { start: now - 86400000 * 3, end: now - 86400000 },
      title: 'Weekly Synthesis: Focus & Growth',
      summary:
        'Your week was dominated by deep work on the marketing strategy and a renewed focus on personal wellness through daily walks.',
      themes: [
        {
          title: 'Marketing Strategy',
          content:
            'You have been refining the value proposition, specifically focusing on the zero-friction aspect of the capture tool.',
          noteIds: [],
        },
        {
          title: 'Wellness & Energy',
          content: 'Daily morning walks show up as a key driver for clarity and sustained energy.',
          noteIds: [],
        },
      ],
      isArchived: false,
    },
  ]
}
