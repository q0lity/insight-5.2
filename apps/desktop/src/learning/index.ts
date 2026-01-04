// Adaptive Learning System
// Learns from user behavior to improve parsing accuracy over time

// Pattern storage and CRUD
export {
  listPatterns,
  getPattern,
  findPattern,
  findPatternsBySource,
  findOrCreatePattern,
  upsertPattern,
  deletePattern,
  deletePatternsBySource,
  incrementOccurrence,
  recordAccept,
  recordReject,
  getHighConfidencePatterns,
  pruneStalePatterns,
  type PatternInput,
} from './patterns'

// Confidence scoring
export {
  BASE_CONFIDENCE,
  ACCEPT_BOOST,
  REJECT_PENALTY,
  TIME_DECAY_DAYS,
  SUGGEST_THRESHOLD,
  AUTO_APPLY_THRESHOLD,
  calculateConfidence,
  getConfidenceLevel,
  shouldAutoApply,
  shouldSuggest,
  shouldIgnore,
  confidenceAfterAccept,
  confidenceAfterReject,
  formatConfidencePercent,
  confidenceColor,
  type ConfidenceLevel,
} from './confidence'

// Keyword extraction
export {
  extractKeywords,
  extractPeople,
  extractLocations,
  extractTags,
  matchKeywordsToPatterns,
} from './keywords'

// Pattern collection from user actions
export {
  recordEventPatterns,
  recordTaskPatterns,
  recordPatternsFromText,
} from './collector'

// Context building for LLM prompts
export {
  buildPatternContext,
  formatPatternHints,
  getAutoApplyPatterns,
  getSuggestions,
  type PatternContext,
} from './context'

// Post-parse enrichment
export {
  enrichEvent,
  enrichTask,
  acceptSuggestion,
  rejectSuggestion,
  hasLearnedPatterns,
  previewEnrichment,
  type EnrichmentResult,
} from './enricher'
