import type { CalendarEvent, Task } from '../db/insight-db'
import { buildPatternContext, getAutoApplyPatterns, getSuggestions, type PatternContext } from './context'
import { recordAccept, recordReject } from './patterns'
import { SUGGEST_THRESHOLD, AUTO_APPLY_THRESHOLD } from './confidence'

export type EnrichmentResult<T> = {
  // The enriched item with auto-applied patterns
  enriched: T
  // Suggestions that weren't auto-applied (need user confirmation)
  suggestions: Array<{
    field: 'category' | 'subcategory' | 'skills' | 'goal'
    value: string | string[]
    confidence: number
    source: string
    patternId?: string
  }>
  // What was auto-applied (for user awareness)
  autoApplied: Array<{
    field: string
    value: string | string[]
    confidence: number
  }>
  // The pattern context used for enrichment
  context: PatternContext
}

/**
 * Enrich a parsed event with learned patterns.
 * High confidence patterns are auto-applied, medium confidence become suggestions.
 */
export async function enrichEvent(
  event: Partial<CalendarEvent>,
  inputText: string
): Promise<EnrichmentResult<Partial<CalendarEvent>>> {
  const context = await buildPatternContext(inputText)
  const autoApply = getAutoApplyPatterns(context)
  const suggestions = getSuggestions(context)

  const enriched = { ...event }
  const autoApplied: EnrichmentResult<Partial<CalendarEvent>>['autoApplied'] = []

  // Auto-apply category if not already set and we have high confidence
  if (!enriched.category && autoApply.category) {
    enriched.category = autoApply.category
    autoApplied.push({
      field: 'category',
      value: autoApply.category,
      confidence: context.suggestedCategories.find(sc => sc.category === autoApply.category)?.confidence ?? AUTO_APPLY_THRESHOLD,
    })

    // Also apply subcategory if available
    if (autoApply.subcategory) {
      enriched.subcategory = autoApply.subcategory
      autoApplied.push({
        field: 'subcategory',
        value: autoApply.subcategory,
        confidence: context.suggestedCategories.find(sc => sc.subcategory === autoApply.subcategory)?.confidence ?? AUTO_APPLY_THRESHOLD,
      })
    }
  }

  // Auto-apply skills if not already set and we have high confidence
  if ((!enriched.skills || enriched.skills.length === 0) && autoApply.skills && autoApply.skills.length > 0) {
    enriched.skills = autoApply.skills
    autoApplied.push({
      field: 'skills',
      value: autoApply.skills,
      confidence: context.suggestedSkills.find(ss => ss.skills.some(s => autoApply.skills?.includes(s)))?.confidence ?? AUTO_APPLY_THRESHOLD,
    })
  }

  // Auto-apply goal if not already set and we have high confidence
  if (!enriched.goal && autoApply.goal) {
    enriched.goal = autoApply.goal
    autoApplied.push({
      field: 'goal',
      value: autoApply.goal,
      confidence: context.suggestedGoals.find(sg => sg.goal === autoApply.goal)?.confidence ?? AUTO_APPLY_THRESHOLD,
    })
  }

  // Apply location fills from learned patterns
  if (!enriched.location && context.locationFills.length > 0) {
    const topLocation = context.locationFills[0]
    if (topLocation.confidence >= AUTO_APPLY_THRESHOLD) {
      // If location pattern has category info, apply it
      if (!enriched.category && topLocation.category) {
        enriched.category = topLocation.category
        autoApplied.push({
          field: 'category',
          value: topLocation.category,
          confidence: topLocation.confidence,
        })
      }
      if (!enriched.subcategory && topLocation.subcategory) {
        enriched.subcategory = topLocation.subcategory
        autoApplied.push({
          field: 'subcategory',
          value: topLocation.subcategory,
          confidence: topLocation.confidence,
        })
      }
      if ((!enriched.skills || enriched.skills.length === 0) && topLocation.skills && topLocation.skills.length > 0) {
        enriched.skills = topLocation.skills
        autoApplied.push({
          field: 'skills',
          value: topLocation.skills,
          confidence: topLocation.confidence,
        })
      }
    }
  }

  // Apply person context patterns
  if (context.personContexts.length > 0 && !enriched.category) {
    const topPerson = context.personContexts[0]
    if (topPerson.confidence >= AUTO_APPLY_THRESHOLD) {
      enriched.category = topPerson.category
      autoApplied.push({
        field: 'category',
        value: topPerson.category,
        confidence: topPerson.confidence,
      })
      if (topPerson.subcategory) {
        enriched.subcategory = topPerson.subcategory
        autoApplied.push({
          field: 'subcategory',
          value: topPerson.subcategory,
          confidence: topPerson.confidence,
        })
      }
    }
  }

  return {
    enriched,
    suggestions,
    autoApplied,
    context,
  }
}

/**
 * Enrich a parsed task with learned patterns.
 */
export async function enrichTask(
  task: Partial<Task>,
  inputText: string
): Promise<EnrichmentResult<Partial<Task>>> {
  const context = await buildPatternContext(inputText)
  const autoApply = getAutoApplyPatterns(context)
  const suggestions = getSuggestions(context)

  const enriched = { ...task }
  const autoApplied: EnrichmentResult<Partial<Task>>['autoApplied'] = []

  // Auto-apply category if not already set and we have high confidence
  if (!enriched.category && autoApply.category) {
    enriched.category = autoApply.category
    autoApplied.push({
      field: 'category',
      value: autoApply.category,
      confidence: context.suggestedCategories.find(sc => sc.category === autoApply.category)?.confidence ?? AUTO_APPLY_THRESHOLD,
    })

    if (autoApply.subcategory) {
      enriched.subcategory = autoApply.subcategory
      autoApplied.push({
        field: 'subcategory',
        value: autoApply.subcategory,
        confidence: context.suggestedCategories.find(sc => sc.subcategory === autoApply.subcategory)?.confidence ?? AUTO_APPLY_THRESHOLD,
      })
    }
  }

  // Auto-apply goal if not already set and we have high confidence
  if (!enriched.goal && autoApply.goal) {
    enriched.goal = autoApply.goal
    autoApplied.push({
      field: 'goal',
      value: autoApply.goal,
      confidence: context.suggestedGoals.find(sg => sg.goal === autoApply.goal)?.confidence ?? AUTO_APPLY_THRESHOLD,
    })
  }

  return {
    enriched,
    suggestions,
    autoApplied,
    context,
  }
}

/**
 * Record user acceptance of a suggestion.
 * Call this when the user accepts a suggested value.
 */
export async function acceptSuggestion(patternId: string): Promise<void> {
  await recordAccept(patternId)
}

/**
 * Record user rejection of a suggestion.
 * Call this when the user dismisses or rejects a suggested value.
 */
export async function rejectSuggestion(patternId: string): Promise<void> {
  await recordReject(patternId)
}

/**
 * Quick helper to check if any patterns exist for the input text.
 * Useful for determining if enrichment would be beneficial.
 */
export async function hasLearnedPatterns(inputText: string): Promise<boolean> {
  const context = await buildPatternContext(inputText)
  return (
    context.suggestedCategories.length > 0 ||
    context.suggestedSkills.length > 0 ||
    context.suggestedGoals.length > 0 ||
    context.personContexts.length > 0 ||
    context.locationFills.length > 0
  )
}

/**
 * Get a summary of what would be auto-applied and suggested for input text.
 * Useful for debugging or showing the user what the system has learned.
 */
export async function previewEnrichment(inputText: string): Promise<{
  wouldAutoApply: {
    category?: string
    subcategory?: string
    skills?: string[]
    goal?: string
  }
  wouldSuggest: Array<{
    field: string
    value: string | string[]
    confidence: number
    source: string
  }>
}> {
  const context = await buildPatternContext(inputText)
  const autoApply = getAutoApplyPatterns(context)
  const suggestions = getSuggestions(context)

  return {
    wouldAutoApply: autoApply,
    wouldSuggest: suggestions,
  }
}
