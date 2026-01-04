import type { Pattern } from '../db/insight-db'
import { findPatternsBySource, getHighConfidencePatterns } from './patterns'
import { extractKeywords, extractPeople, extractLocations } from './keywords'
import { SUGGEST_THRESHOLD, AUTO_APPLY_THRESHOLD } from './confidence'

export type PatternContext = {
  // Suggestions from learned patterns
  suggestedCategories: Array<{
    keyword: string
    category: string
    subcategory?: string
    confidence: number
  }>
  suggestedSkills: Array<{
    keyword: string
    skills: string[]
    confidence: number
  }>
  suggestedGoals: Array<{
    keyword: string
    goal: string
    confidence: number
  }>
  personContexts: Array<{
    person: string
    category: string
    subcategory?: string
    confidence: number
  }>
  locationFills: Array<{
    location: string
    category: string
    subcategory?: string
    skills?: string[]
    confidence: number
  }>
}

export async function buildPatternContext(inputText: string): Promise<PatternContext> {
  const keywords = extractKeywords(inputText)
  const people = extractPeople(inputText)
  const locations = extractLocations(inputText)

  const context: PatternContext = {
    suggestedCategories: [],
    suggestedSkills: [],
    suggestedGoals: [],
    personContexts: [],
    locationFills: [],
  }

  // Get patterns for each keyword
  for (const keyword of keywords) {
    const patterns = await findPatternsBySource('keyword', keyword)

    for (const pattern of patterns) {
      if (pattern.confidence < SUGGEST_THRESHOLD) continue

      if (pattern.targetType === 'category') {
        // Check if we already have this category for this keyword
        const existing = context.suggestedCategories.find(
          (sc) => sc.keyword === keyword && sc.category === pattern.targetKey
        )
        if (!existing) {
          context.suggestedCategories.push({
            keyword,
            category: pattern.targetKey,
            confidence: pattern.confidence,
          })
        }
      } else if (pattern.targetType === 'subcategory') {
        // Find matching category suggestion and add subcategory
        const cat = context.suggestedCategories.find((sc) => sc.keyword === keyword)
        if (cat && !cat.subcategory) {
          cat.subcategory = pattern.targetKey
        }
      } else if (pattern.targetType === 'skill') {
        // Find or create skill suggestion for this keyword
        let skillSuggestion = context.suggestedSkills.find((ss) => ss.keyword === keyword)
        if (!skillSuggestion) {
          skillSuggestion = { keyword, skills: [], confidence: pattern.confidence }
          context.suggestedSkills.push(skillSuggestion)
        }
        if (!skillSuggestion.skills.includes(pattern.targetKey)) {
          skillSuggestion.skills.push(pattern.targetKey)
          // Update confidence to max
          skillSuggestion.confidence = Math.max(skillSuggestion.confidence, pattern.confidence)
        }
      } else if (pattern.targetType === 'goal') {
        context.suggestedGoals.push({
          keyword,
          goal: pattern.targetKey,
          confidence: pattern.confidence,
        })
      }
    }
  }

  // Get patterns for each person
  for (const person of people) {
    const patterns = await findPatternsBySource('person', person)

    for (const pattern of patterns) {
      if (pattern.confidence < SUGGEST_THRESHOLD) continue

      if (pattern.targetType === 'category') {
        context.personContexts.push({
          person,
          category: pattern.targetKey,
          confidence: pattern.confidence,
        })
      } else if (pattern.targetType === 'subcategory') {
        // Find matching person context and add subcategory
        const pc = context.personContexts.find((pc) => pc.person === person)
        if (pc && !pc.subcategory) {
          pc.subcategory = pattern.targetKey
        }
      }
    }
  }

  // Get patterns for each location
  for (const location of locations) {
    const patterns = await findPatternsBySource('location', location)

    let locationFill = context.locationFills.find((lf) => lf.location === location)

    for (const pattern of patterns) {
      if (pattern.confidence < SUGGEST_THRESHOLD) continue

      if (!locationFill) {
        locationFill = {
          location,
          category: '',
          confidence: pattern.confidence,
        }
        context.locationFills.push(locationFill)
      }

      if (pattern.targetType === 'category') {
        locationFill.category = pattern.targetKey
        locationFill.confidence = Math.max(locationFill.confidence, pattern.confidence)
      } else if (pattern.targetType === 'subcategory') {
        locationFill.subcategory = pattern.targetKey
      } else if (pattern.targetType === 'skill') {
        if (!locationFill.skills) locationFill.skills = []
        if (!locationFill.skills.includes(pattern.targetKey)) {
          locationFill.skills.push(pattern.targetKey)
        }
      }
    }
  }

  // Sort by confidence
  context.suggestedCategories.sort((a, b) => b.confidence - a.confidence)
  context.suggestedSkills.sort((a, b) => b.confidence - a.confidence)
  context.suggestedGoals.sort((a, b) => b.confidence - a.confidence)
  context.personContexts.sort((a, b) => b.confidence - a.confidence)
  context.locationFills.sort((a, b) => b.confidence - a.confidence)

  return context
}

export function formatPatternHints(context: PatternContext): string {
  const lines: string[] = []

  // Category hints
  if (context.suggestedCategories.length > 0) {
    lines.push('User typically categorizes:')
    for (const sc of context.suggestedCategories.slice(0, 5)) {
      const subcat = sc.subcategory ? `/${sc.subcategory}` : ''
      lines.push(`  - "${sc.keyword}" → ${sc.category}${subcat}`)
    }
  }

  // Skill hints
  if (context.suggestedSkills.length > 0) {
    lines.push('User typically associates skills:')
    for (const ss of context.suggestedSkills.slice(0, 5)) {
      lines.push(`  - "${ss.keyword}" → skills: [${ss.skills.join(', ')}]`)
    }
  }

  // Person hints
  if (context.personContexts.length > 0) {
    lines.push('User typically does with people:')
    for (const pc of context.personContexts.slice(0, 3)) {
      const subcat = pc.subcategory ? `/${pc.subcategory}` : ''
      lines.push(`  - @${pc.person} → ${pc.category}${subcat}`)
    }
  }

  // Location hints
  if (context.locationFills.length > 0) {
    lines.push('User typically does at locations:')
    for (const lf of context.locationFills.slice(0, 3)) {
      const parts = [lf.category]
      if (lf.subcategory) parts[0] += `/${lf.subcategory}`
      if (lf.skills && lf.skills.length > 0) {
        parts.push(`skills: [${lf.skills.join(', ')}]`)
      }
      lines.push(`  - !${lf.location} → ${parts.join(', ')}`)
    }
  }

  return lines.join('\n')
}

export function getAutoApplyPatterns(context: PatternContext): {
  category?: string
  subcategory?: string
  skills?: string[]
  goal?: string
} {
  const result: {
    category?: string
    subcategory?: string
    skills?: string[]
    goal?: string
  } = {}

  // Find highest confidence category that meets auto-apply threshold
  const autoCategory = context.suggestedCategories.find(
    (sc) => sc.confidence >= AUTO_APPLY_THRESHOLD
  )
  if (autoCategory) {
    result.category = autoCategory.category
    if (autoCategory.subcategory) {
      result.subcategory = autoCategory.subcategory
    }
  }

  // Find highest confidence skills that meet auto-apply threshold
  const autoSkills = context.suggestedSkills.find(
    (ss) => ss.confidence >= AUTO_APPLY_THRESHOLD
  )
  if (autoSkills) {
    result.skills = autoSkills.skills
  }

  // Find highest confidence goal that meets auto-apply threshold
  const autoGoal = context.suggestedGoals.find(
    (sg) => sg.confidence >= AUTO_APPLY_THRESHOLD
  )
  if (autoGoal) {
    result.goal = autoGoal.goal
  }

  return result
}

export function getSuggestions(context: PatternContext): Array<{
  field: 'category' | 'subcategory' | 'skills' | 'goal'
  value: string | string[]
  confidence: number
  source: string
}> {
  const suggestions: Array<{
    field: 'category' | 'subcategory' | 'skills' | 'goal'
    value: string | string[]
    confidence: number
    source: string
  }> = []

  // Category suggestions (not auto-applied)
  for (const sc of context.suggestedCategories) {
    if (sc.confidence >= SUGGEST_THRESHOLD && sc.confidence < AUTO_APPLY_THRESHOLD) {
      suggestions.push({
        field: 'category',
        value: sc.category,
        confidence: sc.confidence,
        source: `Learned from "${sc.keyword}"`,
      })
      if (sc.subcategory) {
        suggestions.push({
          field: 'subcategory',
          value: sc.subcategory,
          confidence: sc.confidence,
          source: `Learned from "${sc.keyword}"`,
        })
      }
    }
  }

  // Skill suggestions
  for (const ss of context.suggestedSkills) {
    if (ss.confidence >= SUGGEST_THRESHOLD && ss.confidence < AUTO_APPLY_THRESHOLD) {
      suggestions.push({
        field: 'skills',
        value: ss.skills,
        confidence: ss.confidence,
        source: `Learned from "${ss.keyword}"`,
      })
    }
  }

  // Goal suggestions
  for (const sg of context.suggestedGoals) {
    if (sg.confidence >= SUGGEST_THRESHOLD && sg.confidence < AUTO_APPLY_THRESHOLD) {
      suggestions.push({
        field: 'goal',
        value: sg.goal,
        confidence: sg.confidence,
        source: `Learned from "${sg.keyword}"`,
      })
    }
  }

  return suggestions
}
