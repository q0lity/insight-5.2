import type { CalendarEvent, Task } from '../db/insight-db'
import { findOrCreatePattern, incrementOccurrence, type PatternInput } from './patterns'
import { extractKeywords, extractPeople, extractLocations } from './keywords'

export async function recordEventPatterns(event: CalendarEvent): Promise<void> {
  const patterns: PatternInput[] = []

  // Extract keywords from title
  const keywords = extractKeywords(event.title)

  // Activity → Category patterns
  if (event.category) {
    for (const keyword of keywords) {
      patterns.push({
        type: 'activity_category',
        sourceType: 'keyword',
        sourceKey: keyword,
        targetType: 'category',
        targetKey: event.category,
      })

      // Activity → Subcategory patterns
      if (event.subcategory) {
        patterns.push({
          type: 'activity_category',
          sourceType: 'keyword',
          sourceKey: keyword,
          targetType: 'subcategory',
          targetKey: event.subcategory,
        })
      }
    }
  }

  // Activity → Skill patterns
  if (event.skills && event.skills.length > 0) {
    for (const keyword of keywords) {
      for (const skill of event.skills) {
        patterns.push({
          type: 'activity_skill',
          sourceType: 'keyword',
          sourceKey: keyword,
          targetType: 'skill',
          targetKey: skill,
          targetDisplayName: skill,
        })
      }
    }
  }

  // Goal → Category patterns (goal affinity)
  if (event.goal && event.category) {
    patterns.push({
      type: 'goal_category',
      sourceType: 'goal',
      sourceKey: event.goal,
      targetType: 'category',
      targetKey: event.category,
    })

    if (event.subcategory) {
      patterns.push({
        type: 'goal_category',
        sourceType: 'goal',
        sourceKey: event.goal,
        targetType: 'subcategory',
        targetKey: event.subcategory,
      })
    }
  }

  // Person → Context patterns
  if (event.people && event.people.length > 0 && event.category) {
    for (const person of event.people) {
      patterns.push({
        type: 'person_context',
        sourceType: 'person',
        sourceKey: person,
        targetType: 'category',
        targetKey: event.category,
      })

      if (event.subcategory) {
        patterns.push({
          type: 'person_context',
          sourceType: 'person',
          sourceKey: person,
          targetType: 'subcategory',
          targetKey: event.subcategory,
        })
      }
    }
  }

  // Location → Category patterns
  if (event.location && event.category) {
    patterns.push({
      type: 'location_fill',
      sourceType: 'location',
      sourceKey: event.location,
      targetType: 'category',
      targetKey: event.category,
    })

    if (event.subcategory) {
      patterns.push({
        type: 'location_fill',
        sourceType: 'location',
        sourceKey: event.location,
        targetType: 'subcategory',
        targetKey: event.subcategory,
      })
    }

    // Location → Skills (e.g., gym → weightlifting)
    if (event.skills && event.skills.length > 0) {
      for (const skill of event.skills) {
        patterns.push({
          type: 'location_fill',
          sourceType: 'location',
          sourceKey: event.location,
          targetType: 'skill',
          targetKey: skill,
          targetDisplayName: skill,
        })
      }
    }
  }

  // Process all patterns - find or create, then increment occurrence
  for (const input of patterns) {
    try {
      const pattern = await findOrCreatePattern(input)
      await incrementOccurrence(pattern.id)
    } catch (err) {
      console.warn('[PatternCollector] Failed to record pattern:', input, err)
    }
  }
}

export async function recordTaskPatterns(task: Task): Promise<void> {
  const patterns: PatternInput[] = []

  // Extract keywords from title
  const keywords = extractKeywords(task.title)

  // Activity → Category patterns
  if (task.category) {
    for (const keyword of keywords) {
      patterns.push({
        type: 'activity_category',
        sourceType: 'keyword',
        sourceKey: keyword,
        targetType: 'category',
        targetKey: task.category,
      })

      if (task.subcategory) {
        patterns.push({
          type: 'activity_category',
          sourceType: 'keyword',
          sourceKey: keyword,
          targetType: 'subcategory',
          targetKey: task.subcategory,
        })
      }
    }
  }

  // Goal → Category patterns
  if (task.goal && task.category) {
    patterns.push({
      type: 'goal_category',
      sourceType: 'goal',
      sourceKey: task.goal,
      targetType: 'category',
      targetKey: task.category,
    })
  }

  // Process all patterns
  for (const input of patterns) {
    try {
      const pattern = await findOrCreatePattern(input)
      await incrementOccurrence(pattern.id)
    } catch (err) {
      console.warn('[PatternCollector] Failed to record task pattern:', input, err)
    }
  }
}

export async function recordPatternsFromText(
  text: string,
  data: {
    category?: string | null
    subcategory?: string | null
    skills?: string[]
    goal?: string | null
    people?: string[]
    location?: string | null
  }
): Promise<void> {
  const keywords = extractKeywords(text)
  const people = extractPeople(text)
  const locations = extractLocations(text)

  const patterns: PatternInput[] = []

  // Keyword → Category
  if (data.category) {
    for (const keyword of keywords) {
      patterns.push({
        type: 'activity_category',
        sourceType: 'keyword',
        sourceKey: keyword,
        targetType: 'category',
        targetKey: data.category,
      })
    }
  }

  // Keyword → Skills
  if (data.skills && data.skills.length > 0) {
    for (const keyword of keywords) {
      for (const skill of data.skills) {
        patterns.push({
          type: 'activity_skill',
          sourceType: 'keyword',
          sourceKey: keyword,
          targetType: 'skill',
          targetKey: skill,
        })
      }
    }
  }

  // People → Category (from extracted @mentions or "with X")
  if (data.category && people.length > 0) {
    for (const person of people) {
      patterns.push({
        type: 'person_context',
        sourceType: 'person',
        sourceKey: person,
        targetType: 'category',
        targetKey: data.category,
      })
    }
  }

  // Locations → Category (from extracted !mentions or "at X")
  if (data.category && locations.length > 0) {
    for (const location of locations) {
      patterns.push({
        type: 'location_fill',
        sourceType: 'location',
        sourceKey: location,
        targetType: 'category',
        targetKey: data.category,
      })
    }
  }

  // Process all patterns
  for (const input of patterns) {
    try {
      const pattern = await findOrCreatePattern(input)
      await incrementOccurrence(pattern.id)
    } catch (err) {
      console.warn('[PatternCollector] Failed to record text pattern:', input, err)
    }
  }
}
