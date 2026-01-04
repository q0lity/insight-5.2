import type { Pattern } from '../db/insight-db'

// Confidence constants
export const BASE_CONFIDENCE = 0.3
export const ACCEPT_BOOST = 0.15
export const REJECT_PENALTY = 0.2
export const TIME_DECAY_DAYS = 30
export const MAX_ACCEPT_IMPACT = 10  // Cap the number of accepts that affect score
export const MAX_REJECT_IMPACT = 5   // Cap the number of rejects that affect score

// Thresholds for action
export const SUGGEST_THRESHOLD = 0.5   // >= this: show toast suggestion
export const AUTO_APPLY_THRESHOLD = 0.8 // >= this: auto-apply silently

export type ConfidenceLevel = 'none' | 'suggest' | 'auto'

export function calculateConfidence(pattern: Pattern): number {
  const acceptRatio = pattern.acceptCount / Math.max(1, pattern.occurrenceCount)
  const rejectRatio = pattern.rejectCount / Math.max(1, pattern.occurrenceCount)

  // Time decay: patterns not seen recently lose confidence
  const daysSinceLastSeen = (Date.now() - pattern.lastSeenAt) / (24 * 60 * 60 * 1000)
  const timeDecay = Math.max(0, 1 - (daysSinceLastSeen / TIME_DECAY_DAYS) * 0.3)

  // Calculate final confidence
  let confidence = BASE_CONFIDENCE

  // Boost from accepts (capped)
  const effectiveAccepts = Math.min(pattern.acceptCount, MAX_ACCEPT_IMPACT)
  confidence += acceptRatio * ACCEPT_BOOST * effectiveAccepts

  // Penalty from rejects (capped)
  const effectiveRejects = Math.min(pattern.rejectCount, MAX_REJECT_IMPACT)
  confidence -= rejectRatio * REJECT_PENALTY * effectiveRejects

  // Apply time decay
  confidence *= timeDecay

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence))
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= AUTO_APPLY_THRESHOLD) return 'auto'
  if (confidence >= SUGGEST_THRESHOLD) return 'suggest'
  return 'none'
}

export function shouldAutoApply(confidence: number): boolean {
  return confidence >= AUTO_APPLY_THRESHOLD
}

export function shouldSuggest(confidence: number): boolean {
  return confidence >= SUGGEST_THRESHOLD && confidence < AUTO_APPLY_THRESHOLD
}

export function shouldIgnore(confidence: number): boolean {
  return confidence < SUGGEST_THRESHOLD
}

export function confidenceAfterAccept(pattern: Pattern): number {
  const updated: Pattern = {
    ...pattern,
    acceptCount: pattern.acceptCount + 1,
    occurrenceCount: pattern.occurrenceCount + 1,
    lastSeenAt: Date.now(),
  }
  return calculateConfidence(updated)
}

export function confidenceAfterReject(pattern: Pattern): number {
  const updated: Pattern = {
    ...pattern,
    rejectCount: pattern.rejectCount + 1,
    occurrenceCount: pattern.occurrenceCount + 1,
    lastSeenAt: Date.now(),
  }
  return calculateConfidence(updated)
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function confidenceColor(confidence: number): string {
  if (confidence >= AUTO_APPLY_THRESHOLD) return '#7BAF7B' // Green - auto
  if (confidence >= SUGGEST_THRESHOLD) return '#D4A574'    // Amber - suggest
  return '#8C8B88'                                          // Gray - none
}
