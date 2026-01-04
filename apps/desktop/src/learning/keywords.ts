import { normalizePatternKey } from '../db/insight-db'

// Common stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'this', 'that', 'these', 'those', 'here', 'there',
  'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'also', 'now', 'then', 'still', 'even', 'after', 'before',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'um', 'uh', 'like', 'gonna', 'wanna', 'gotta', 'kinda', 'sorta',
  'ok', 'okay', 'yeah', 'yes', 'no', 'nope', 'sure', 'right',
])

// Activity keywords that are meaningful for pattern matching
const ACTIVITY_KEYWORDS = new Set([
  // Fitness
  'gym', 'workout', 'exercise', 'run', 'running', 'jog', 'jogging', 'walk', 'walking',
  'lift', 'lifting', 'weights', 'cardio', 'yoga', 'stretch', 'stretching',
  'swim', 'swimming', 'bike', 'biking', 'cycling', 'hike', 'hiking',
  'crossfit', 'pilates', 'zumba', 'spin', 'boxing', 'martial',
  // Work
  'work', 'working', 'meeting', 'call', 'email', 'coding', 'programming',
  'design', 'writing', 'research', 'planning', 'project', 'presentation',
  'standup', 'scrum', 'sprint', 'deadline', 'review', 'interview',
  // Health
  'doctor', 'dentist', 'therapy', 'therapist', 'clinic', 'hospital', 'checkup',
  'medication', 'medicine', 'prescription', 'appointment',
  // Food
  'breakfast', 'lunch', 'dinner', 'snack', 'meal', 'eat', 'eating', 'cooking',
  'coffee', 'tea', 'drink', 'restaurant', 'cafe', 'takeout',
  // Personal
  'shower', 'sleep', 'nap', 'wake', 'bed', 'rest', 'relax', 'meditate', 'meditation',
  'read', 'reading', 'study', 'studying', 'learn', 'learning', 'practice',
  // Social
  'hangout', 'party', 'date', 'family', 'friends', 'call', 'chat', 'visit',
  // Errands
  'shopping', 'grocery', 'groceries', 'errand', 'errands', 'store', 'bank',
  'laundry', 'cleaning', 'chores', 'commute', 'driving', 'transport',
])

export function extractKeywords(text: string): string[] {
  const normalized = normalizePatternKey(text)
  const words = normalized.split(/\s+/).filter(Boolean)
  const keywords: string[] = []

  // Extract single words (unigrams)
  for (const word of words) {
    // Skip short words and stopwords
    if (word.length < 3) continue
    if (STOPWORDS.has(word)) continue

    // Prioritize activity keywords
    if (ACTIVITY_KEYWORDS.has(word)) {
      keywords.push(word)
    }
  }

  // Extract bigrams (two-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i]
    const w2 = words[i + 1]

    // Skip if either word is a stopword
    if (STOPWORDS.has(w1) || STOPWORDS.has(w2)) continue
    if (w1.length < 2 || w2.length < 2) continue

    const bigram = `${w1} ${w2}`

    // Add meaningful bigrams
    if (isActivityBigram(bigram)) {
      keywords.push(bigram)
    }
  }

  // Deduplicate while preserving order
  return [...new Set(keywords)]
}

function isActivityBigram(bigram: string): boolean {
  // Common activity bigrams
  const activityBigrams = [
    'gym workout', 'workout session', 'morning run', 'evening run',
    'deep work', 'focus time', 'meeting with', 'call with',
    'doctor appointment', 'dentist appointment', 'therapy session',
    'grocery shopping', 'costco run', 'target run',
    'coffee break', 'lunch break', 'power nap',
    'team meeting', 'standup meeting', 'sprint planning',
    'yoga class', 'spin class', 'fitness class',
  ]

  return activityBigrams.some(ab => bigram.includes(ab) || ab.includes(bigram))
}

export function extractPeople(text: string): string[] {
  const people: string[] = []

  // Match @mentions: @name or @"full name"
  const atMentions = text.match(/@"[^"]+"|@[\w]+/g) || []
  for (const mention of atMentions) {
    const name = mention.replace(/^@"?|"$/g, '').trim()
    if (name && name.length > 1) {
      people.push(normalizePatternKey(name))
    }
  }

  // Match "with [Name]" patterns
  const withPattern = text.match(/\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g) || []
  for (const match of withPattern) {
    const name = match.replace(/^with\s+/i, '').trim()
    if (name && name.length > 1 && !STOPWORDS.has(name.toLowerCase())) {
      people.push(normalizePatternKey(name))
    }
  }

  return [...new Set(people)]
}

export function extractLocations(text: string): string[] {
  const locations: string[] = []

  // Match !mentions: !location or !"full location"
  const locationMentions = text.match(/!"[^"]+"|![\w]+/g) || []
  for (const mention of locationMentions) {
    const loc = mention.replace(/^!"?|"$/g, '').trim()
    if (loc && loc.length > 1) {
      locations.push(normalizePatternKey(loc))
    }
  }

  // Match "at [Location]" patterns for known places
  const atPattern = text.match(/\bat\s+(the\s+)?([\w\s]+(?:gym|hospital|clinic|office|store|restaurant|cafe|park|library|school|university|college|church|temple|mosque))/gi) || []
  for (const match of atPattern) {
    const loc = match.replace(/^at\s+(the\s+)?/i, '').trim()
    if (loc && loc.length > 2) {
      locations.push(normalizePatternKey(loc))
    }
  }

  // Match known store names
  const stores = ['costco', 'walmart', 'target', 'whole foods', 'trader joe', 'safeway', 'kroger', 'publix', 'cvs', 'walgreens', 'amazon']
  const lowerText = text.toLowerCase()
  for (const store of stores) {
    if (lowerText.includes(store)) {
      locations.push(store)
    }
  }

  // Match known gyms
  const gyms = ['la fitness', 'planet fitness', '24 hour fitness', 'equinox', 'ymca', 'crossfit', 'orangetheory', 'f45']
  for (const gym of gyms) {
    if (lowerText.includes(gym)) {
      locations.push(gym)
    }
  }

  return [...new Set(locations)]
}

export function extractTags(text: string): string[] {
  const tags: string[] = []

  // Match #tags (but not #tracker(value) syntax)
  const tagMatches = text.match(/#[\w-]+(?!\()/g) || []
  for (const tag of tagMatches) {
    const cleaned = tag.toLowerCase()
    if (cleaned.length > 1) {
      tags.push(cleaned)
    }
  }

  return [...new Set(tags)]
}

export function matchKeywordsToPatterns(
  keywords: string[],
  categoryMap: Map<string, { category: string; subcategory?: string }>
): { category: string; subcategory?: string } | null {
  for (const keyword of keywords) {
    const match = categoryMap.get(keyword)
    if (match) return match
  }
  return null
}
