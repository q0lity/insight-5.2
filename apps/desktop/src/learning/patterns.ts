import {
  db,
  makePatternId,
  normalizePatternKey,
  type Pattern,
  type PatternType,
  type PatternSourceType,
  type PatternTargetType,
} from '../db/insight-db'

const BASE_CONFIDENCE = 0.3

export type PatternInput = {
  type: PatternType
  sourceType: PatternSourceType
  sourceKey: string
  targetType: PatternTargetType
  targetKey: string
  targetDisplayName?: string
}

export async function listPatterns(type?: PatternType): Promise<Pattern[]> {
  if (type) {
    return db.patterns.where('type').equals(type).toArray()
  }
  return db.patterns.toArray()
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  return db.patterns.get(id)
}

export async function findPattern(
  type: PatternType,
  sourceKey: string
): Promise<Pattern[]> {
  const key = normalizePatternKey(sourceKey)
  return db.patterns.where('[type+sourceKey]').equals([type, key]).toArray()
}

export async function findPatternsBySource(
  sourceType: PatternSourceType,
  sourceKey: string
): Promise<Pattern[]> {
  const key = normalizePatternKey(sourceKey)
  return db.patterns.where('[sourceType+sourceKey]').equals([sourceType, key]).toArray()
}

export async function findOrCreatePattern(input: PatternInput): Promise<Pattern> {
  const sourceKey = normalizePatternKey(input.sourceKey)
  const targetKey = normalizePatternKey(input.targetKey)

  // Check if pattern already exists
  const existing = await db.patterns
    .where('[type+sourceKey]')
    .equals([input.type, sourceKey])
    .filter((p) => p.targetType === input.targetType && p.targetKey === targetKey)
    .first()

  if (existing) {
    return existing
  }

  // Create new pattern
  const now = Date.now()
  const pattern: Pattern = {
    id: makePatternId(),
    type: input.type,
    sourceType: input.sourceType,
    sourceKey,
    targetType: input.targetType,
    targetKey,
    targetDisplayName: input.targetDisplayName,
    confidence: BASE_CONFIDENCE,
    occurrenceCount: 0,
    acceptCount: 0,
    rejectCount: 0,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  }

  await db.patterns.add(pattern)
  return pattern
}

export async function upsertPattern(pattern: Pattern): Promise<Pattern> {
  const now = Date.now()
  const updated = { ...pattern, updatedAt: now }
  await db.patterns.put(updated)
  return updated
}

export async function deletePattern(id: string): Promise<void> {
  await db.patterns.delete(id)
}

export async function deletePatternsBySource(
  sourceType: PatternSourceType,
  sourceKey: string
): Promise<number> {
  const key = normalizePatternKey(sourceKey)
  return db.patterns.where('[sourceType+sourceKey]').equals([sourceType, key]).delete()
}

export async function incrementOccurrence(id: string): Promise<Pattern | undefined> {
  const pattern = await db.patterns.get(id)
  if (!pattern) return undefined

  const now = Date.now()
  const updated: Pattern = {
    ...pattern,
    occurrenceCount: pattern.occurrenceCount + 1,
    lastSeenAt: now,
    updatedAt: now,
  }

  await db.patterns.put(updated)
  return updated
}

export async function recordAccept(id: string): Promise<Pattern | undefined> {
  const pattern = await db.patterns.get(id)
  if (!pattern) return undefined

  const now = Date.now()
  const updated: Pattern = {
    ...pattern,
    acceptCount: pattern.acceptCount + 1,
    occurrenceCount: pattern.occurrenceCount + 1,
    lastSeenAt: now,
    updatedAt: now,
  }

  // Recalculate confidence
  updated.confidence = calculateConfidenceFromPattern(updated)

  await db.patterns.put(updated)
  return updated
}

export async function recordReject(id: string): Promise<Pattern | undefined> {
  const pattern = await db.patterns.get(id)
  if (!pattern) return undefined

  const now = Date.now()
  const updated: Pattern = {
    ...pattern,
    rejectCount: pattern.rejectCount + 1,
    occurrenceCount: pattern.occurrenceCount + 1,
    lastSeenAt: now,
    updatedAt: now,
  }

  // Recalculate confidence
  updated.confidence = calculateConfidenceFromPattern(updated)

  await db.patterns.put(updated)
  return updated
}

function calculateConfidenceFromPattern(pattern: Pattern): number {
  // Import calculation from confidence.ts to avoid circular dependency
  // This is a simplified inline version
  const ACCEPT_BOOST = 0.15
  const REJECT_PENALTY = 0.2
  const TIME_DECAY_DAYS = 30

  const acceptRatio = pattern.acceptCount / Math.max(1, pattern.occurrenceCount)
  const rejectRatio = pattern.rejectCount / Math.max(1, pattern.occurrenceCount)

  // Time decay
  const daysSinceLastSeen = (Date.now() - pattern.lastSeenAt) / (24 * 60 * 60 * 1000)
  const timeDecay = Math.max(0, 1 - (daysSinceLastSeen / TIME_DECAY_DAYS) * 0.3)

  // Calculate confidence
  let confidence = BASE_CONFIDENCE
  confidence += acceptRatio * ACCEPT_BOOST * Math.min(pattern.acceptCount, 10)
  confidence -= rejectRatio * REJECT_PENALTY * Math.min(pattern.rejectCount, 5)
  confidence *= timeDecay

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence))
}

export async function getHighConfidencePatterns(
  minConfidence: number = 0.5
): Promise<Pattern[]> {
  return db.patterns
    .where('confidence')
    .aboveOrEqual(minConfidence)
    .reverse()
    .sortBy('confidence')
}

export async function pruneStalePatterns(maxAgeDays: number = 90): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  return db.patterns
    .where('updatedAt')
    .below(cutoff)
    .filter((p) => p.confidence < 0.3 && p.occurrenceCount < 3)
    .delete()
}
