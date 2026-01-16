import * as chrono from 'chrono-node'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type CalendarEventKind = 'event' | 'task' | 'log' | 'episode'

export type ParsedTask = {
  title: string
  status?: TaskStatus
  tags?: string[]
  notes?: string
  estimateMinutes?: number | null
  scheduledAt?: number | null
  dueAt?: number | null
  goal?: string | null
  project?: string | null
  importance?: number | null
  difficulty?: number | null
  scope?: 'inline' | 'global'
}

export type ParsedEvent = {
  title: string
  startAt: number
  endAt: number
  kind?: CalendarEventKind
  tags?: string[]
  notes?: string
  icon?: string | null
  color?: string | null
  estimateMinutes?: number | null
  location?: string | null
  people?: string[]
  skills?: string[]
  character?: string[]
  explicitTime?: boolean
  sourceText?: string
  goal?: string | null
  project?: string | null
  importance?: number | null
  difficulty?: number | null
  parentHint?: string | null
  openEnded?: boolean
}

export type ParseNaturalResult = {
  tasks: ParsedTask[]
  events: ParsedEvent[]
}

export type ParsedBlock = {
  id: string
  blockIndex: number
  rawText: string
  tasks: ParsedTask[]
  events: ParsedEvent[]
  trackers: Array<{ key: string; value: number }>
  people: string[]
  tags: string[]
  contexts: string[]
  locations: string[]
}

export type ParseBlocksResult = {
  blocks: ParsedBlock[]
  tasks: ParsedTask[]
  events: ParsedEvent[]
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function startOfDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDaysMs(dayStartMs: number, days: number) {
  return dayStartMs + days * 24 * 60 * 60 * 1000
}

function snapDownToHalfHour(ms: number) {
  const d = new Date(ms)
  const minutes = d.getHours() * 60 + d.getMinutes()
  const snapped = Math.floor(minutes / 30) * 30
  d.setHours(0, 0, 0, 0)
  return d.getTime() + snapped * 60 * 1000
}

function defaultPastAt(dayStartMs: number, rawText: string, nowMs: number) {
  const todayStart = startOfDayMs(nowMs)
  if (dayStartMs === todayStart) return snapDownToHalfHour(nowMs)
  const t = rawText.toLowerCase()
  if (/\blast night\b/.test(t)) return dayStartMs + 21 * 60 * 60 * 1000
  return dayStartMs + 12 * 60 * 60 * 1000
}

function looksLikePastTense(text: string) {
  const t = text.toLowerCase()
  if (/\b(already|done|finished|completed|just did)\b/.test(t)) return true
  if (/\b(i|we)\s+(did|went|bought|got|ate|was|were|worked|studied|called|texted|emailed|brushed|slept)\b/.test(t)) return true
  if (/\b(went|bought|ate|worked|called|brushed)\b/.test(t)) return true
  return false
}

function looksLikeForgot(text: string) {
  return /\bforgot\b/i.test(text)
}

function detectDayOffset(text: string, nowMs: number) {
  const t = text.toLowerCase()
  if (/\btomorrow\b/.test(t)) return 1
  if (/\byesterday\b/.test(t)) return -1
  const nowHour = new Date(nowMs).getHours()
  if (/\blast night\b/.test(t) && nowHour < 3) return -1
  return 0
}

function parseTimeToken(raw: string, context: string, nowMs: number, forceMer?: 'am' | 'pm' | null, preferredAfterMin?: number | null): number | null {
  const m = raw
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*o'?clock)?$/)
  if (!m) return null
  let hh = Number(m[1])
  const mm = m[2] ? Number(m[2]) : 0
  const mer = (forceMer ?? m[3] ?? null) as any
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null

  const ctx = context.toLowerCase()
  const nowHour = new Date(nowMs).getHours()

  if (mer) {
    if (hh === 12) hh = mer === 'am' ? 0 : 12
    else if (mer === 'pm') hh = hh + 12
    return hh * 60 + mm
  }

  if (preferredAfterMin != null && Number.isFinite(preferredAfterMin)) {
    const candA = hh * 60 + mm
    const candB = (hh % 12 + 12) * 60 + mm
    const candidates = [candA, candB]
    const after = candidates.filter((c) => c >= preferredAfterMin)
    if (after.length) {
      after.sort((a, b) => a - b)
      return after[0]!
    }
  }

  // No AM/PM: infer.
  const eveningHints = /\b(dinner|tonight|night|pm)\b/.test(ctx)
  const morningHints = /\b(breakfast|morning|am)\b/.test(ctx)
  if (eveningHints && hh >= 1 && hh <= 11) return (hh + 12) * 60 + mm
  if (morningHints && hh === 12) return 0 * 60 + mm
  if (morningHints && hh >= 1 && hh <= 11) return hh * 60 + mm

  // Default: choose a sane time relative to now (prefer next occurrence within 18h).
  const candA = hh * 60 + mm
  const candB = (hh % 12 + 12) * 60 + mm // assume PM
  const nowMin = nowHour * 60 + new Date(nowMs).getMinutes()
  const deltaA = candA >= nowMin ? candA - nowMin : candA + 24 * 60 - nowMin
  const deltaB = candB >= nowMin ? candB - nowMin : candB + 24 * 60 - nowMin
  return deltaB < deltaA ? candB : candA
}

function parseTimeRange(
  text: string,
  nowMs: number,
  preferredAfterMin?: number | null,
): { startMin: number; endMin: number; consumed: string } | null {
  const t = text
    .toLowerCase()
    .replace(/\b(\d{1,2})\s*,\s*(to|until|till)\b/g, '$1 to')
    .replace(/\b(\d{1,2})\s+(\d{1,2}:\d{2})\b/g, '$2')

  const relMin = t.match(/\bin\s+(\d{1,3})\s*(m|min|mins|minute|minutes)\b/)
  if (relMin?.[1]) {
    const delta = clamp(Number(relMin[1]), 1, 12 * 60)
    const now = new Date(nowMs)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const startMin = nowMin + delta
    const dur = parseDurationMinutes(t) ?? 30
    return { startMin, endMin: startMin + dur, consumed: relMin[0] }
  }

  const relHr = t.match(/\bin\s+(\d{1,2})(?:\.(\d))?\s*(h|hr|hrs|hour|hours)\b/)
  if (relHr?.[1]) {
    const whole = Number(relHr[1])
    const tenth = relHr[2] ? Number(relHr[2]) / 10 : 0
    const delta = clamp(Math.round((whole + tenth) * 60), 1, 12 * 60)
    const now = new Date(nowMs)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const startMin = nowMin + delta
    const dur = parseDurationMinutes(t) ?? 60
    return { startMin, endMin: startMin + dur, consumed: relHr[0] }
  }

  const range = t.match(
    /\b(?:from\s+|at\s+|@)?\s*(\d{1,2}(?::\d{2})?(?:\s*o'?clock)?\s*(?:am|pm)?)\s*(?:-|\u2013|\u2014|\s+(?:to|until|till)\s+)\s*(\d{1,2}(?::\d{2})?(?:\s*o'?clock)?\s*(?:am|pm)?)\b/,
  )
  if (range?.[1] && range?.[2]) {
    const startHasMer = /\b(am|pm)\b/.test(range[1])
    const endHasMer = /\b(am|pm)\b/.test(range[2])
    const endMer = range[2].includes('am') ? 'am' : range[2].includes('pm') ? 'pm' : null

    const startHour = Number(range[1].match(/^\s*(\d{1,2})/)?.[1] ?? NaN)
    const endHour = Number(range[2].match(/^\s*(\d{1,2})/)?.[1] ?? NaN)
    const workLike = /\b(work|shift|clinic|patients|inpatient|rounds)\b/.test(t)
    const inferShift =
      workLike && Number.isFinite(startHour) && Number.isFinite(endHour) && startHour > endHour && !startHasMer && !endHasMer
    const startForceMer =
      (!startHasMer && endHasMer && endMer === 'pm' && workLike && Number.isFinite(startHour) && Number.isFinite(endHour) && startHour > endHour) || inferShift
        ? 'am'
        : null
    const endForceMer = inferShift ? 'pm' : null

    const startMin = parseTimeToken(range[1], t, nowMs, startForceMer as any, preferredAfterMin ?? null)
    const endMinRaw = parseTimeToken(range[2], t, nowMs, endForceMer as any, startMin ?? preferredAfterMin ?? null)
    if (startMin == null || endMinRaw == null) return null
    let endMin = endMinRaw
    // If end looks like earlier, assume it continues after start.
    if (endMin < startMin) endMin = endMin + 12 * 60
    if (endMin < startMin) endMin = endMin + 12 * 60
    return { startMin, endMin, consumed: range[0] }
  }

  const single = t.match(/\b(?:at|@)\s*(\d{1,2}(?::\d{2})?(?:\s*o'?clock)?\s*(?:am|pm)?)\b/)
  if (single?.[1]) {
    const startMin = parseTimeToken(single[1], t, nowMs, null, preferredAfterMin ?? null)
    if (startMin == null) return null
    return { startMin, endMin: startMin, consumed: single[0] }
  }
  return null
}

function parseDurationMinutes(text: string): number | null {
  const t = text.toLowerCase()
  const m = t.match(/\bfor\s+(\d{1,3})\s*(m|min|mins|minute|minutes)\b/)
  if (m?.[1]) return clamp(Number(m[1]), 1, 24 * 60)
  if (/\bfor\s+an?\s+hour\b/.test(t) || /\bfor\s+1\s+hour\b/.test(t)) return 60
  if (/\bfor\s+(?:a|an)\s+half\s+hour\b/.test(t) || /\bfor\s+half\s+an?\s+hour\b/.test(t)) return 30
  const h = t.match(/\bfor\s+(\d{1,2})(?:\.(\d))?\s*(h|hr|hrs|hour|hours)\b/)
  if (h?.[1]) {
    const whole = Number(h[1])
    const tenth = h[2] ? Number(h[2]) / 10 : 0
    return clamp(Math.round((whole + tenth) * 60), 1, 24 * 60)
  }
  return null
}

function estimateMinutes(text: string) {
  const t = text.toLowerCase()
  if (/\b(brush|brushed)\b.*\b(teeth|tooth)\b/.test(t)) return 2
  if (/\bfloss\b/.test(t)) return 2
  if (/\bshower\b/.test(t)) return 10
  if (/\b(call|phone|ring)\b/.test(t)) return 15
  if (/\b(dinner|lunch|breakfast)\b/.test(t)) return 60
  if (/\b(meeting|appointment|visit)\b/.test(t)) return 30
  if (/\b(gym|workout|lift|run|cardio|yoga)\b/.test(t)) return 60
  if (/\b(grocery|store|shopping|errand)\b/.test(t)) return 45
  if (/\b(sleep|nap)\b/.test(t)) return 60
  return 30
}

function isImmediateIntent(text: string) {
  return /\b(right now|now|starting|start(?:ing)?|about to|gonna|going to)\b/i.test(text)
}

function isPhysicalAction(text: string) {
  return /\b(run|running|workout|gym|exercise|walk|walking|lift|lifting|train|training|bike|biking|cycle|cycling|swim|swimming|jog|jogging|stretch|stretching)\b/i.test(text)
}

function extractEmbeddedParentHint(text: string) {
  const match = text.match(/\b(?:during|while)\s+(?:my|the|a|an)?\s*([a-z][\w\s-]{0,40})/i)
  if (!match?.[1]) return null
  const raw = match[1]
    .split(/\b(?:and then|then|also|but)\b/i)[0]
    ?.split(/[,.]/)[0]
    ?.trim()
  if (!raw) return null
  return normalizeTitle(raw)
}

function parseMood(text: string) {
  const t = text.toLowerCase()
  if (/#mood\s*(?:\(|:)/.test(t)) return null
  const wordCount = t.split(/\s+/).filter(Boolean).length
  if (wordCount <= 2 && /\b(ok|okay)\b/.test(t)) return null
  const frac = t.match(/\b(?:feeling|feel|mood)\b[^0-9]{0,24}(\d{1,2})\s*\/\s*10\b/)
  if (frac?.[1]) {
    const v = clamp(Number(frac[1]), 0, 10)
    return Number.isFinite(v) ? v : null
  }

  const direct = t.match(/\b(?:mood|feeling|feel)\b[^0-9]{0,24}(\d{1,2})\b/)
  if (direct?.[1]) {
    const v = clamp(Number(direct[1]), 0, 10)
    return Number.isFinite(v) ? v : null
  }

  const adjectiveMap: Array<{ re: RegExp; value: number }> = [
    { re: /\b(amazing|awesome|fantastic|incredible|great)\b/, value: 9 },
    { re: /\b(good|pretty good|fine)\b/, value: 7 },
    { re: /\b(okay|ok|meh|neutral)\b/, value: 5 },
    { re: /\b(bad|not great|not good)\b/, value: 3 },
    { re: /\b(awful|terrible|horrible|miserable)\b/, value: 1 },
    { re: /\b(happy|joyful|excited)\b/, value: 8 },
    { re: /\b(sad|down|depressed)\b/, value: 2 },
    { re: /\b(angry|mad|frustrated)\b/, value: 3 },
  ]

  for (const m of adjectiveMap) {
    if (m.re.test(t)) return m.value
  }
  if (!/\b(?:feeling|feel|mood)\b/.test(t)) return null
  return null
}

function parseMoneyUsd(text: string) {
  const t = text.toLowerCase()
  const usd = t.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1]
  if (usd) return Number(usd)
  const dollars = t.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/)?.[1]
  if (dollars) return Number(dollars)
  const spend = t.match(/\bspend\s*(?:about\s*)?(\d+(?:\.\d{1,2})?)\b/)?.[1]
  if (spend) return Number(spend)
  return null
}

function inferDefaultFutureTaskHour(text: string) {
  const t = text.toLowerCase()
  if (/\bmorning\b/.test(t)) return 9
  if (/\bafternoon\b/.test(t)) return 13
  if (/\bevening\b/.test(t)) return 18
  return 9
}

function extractBuyList(phrase: string) {
  const m = phrase.match(/\b(?:buy|get|pick up)\b\s+(.+)$/i)?.[1]
  if (!m) return []
  const cut = m.split(/\b(?:at|in|to|with|for|tomorrow|today|next|on)\b/i)[0] ?? m
  return cut
    .split(/,|\band\b/i)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function splitCandidatePhrases(text: string) {
  function splitOnFuturePivots(s: string) {
    const t = s.trim()
    if (!t) return []
    const re = /\b(?:i\s*'?m|im|i\s+am)?\s*(?:gonna|going\s+to)\b/gi
    const starts: number[] = []
    for (const m of t.matchAll(re)) {
      const idx = m.index ?? -1
      if (idx > 0) starts.push(idx)
    }
    if (starts.length === 0) return [t]
    const out: string[] = []
    let last = 0
    for (const idx of starts) {
      const part = t.slice(last, idx).trim()
      if (part) out.push(part)
      last = idx
    }
    const tail = t.slice(last).trim()
    if (tail) out.push(tail)
    return out
  }

  return text
    .split(/[\n.;]+/)
    .flatMap((x) => x.split(/\s+(?:and then|then|also)\s+/i))
    .flatMap(splitOnFuturePivots)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 48)
}

function stripTokenNoise(text: string) {
  return text
    .replace(/#([a-zA-Z][\w/-]*)\(([-+]?\d*\.?\d+)\)/g, ' ')
    .replace(/#([a-zA-Z][\w/-]*):([-+]?\d*\.?\d+)/g, ' ')
    .replace(/(^|\s)[+@][\w/-]+/g, ' ')
    .replace(/(^|\s)[!^]\d{1,2}\b/g, ' ')
    .replace(/~\s*\d{1,3}\s*(?:h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, ' ')
    .replace(/(^|\s)#[\w/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTitle(raw: string) {
  let t = raw.replace(/\s+/g, ' ').trim()
  // Strip common speech filler prefixes so we don't generate nonsense titles like "OK so right…".
  for (let i = 0; i < 3; i++) {
    const next = t.replace(/^(?:ok(?:ay)?|alright|right|so|like|well|um+|uh+)\b[\s,.-]*/i, '').trim()
    if (next === t) break
    t = next
  }
  return t
}

function stripFirstPersonFuturePrefix(text: string) {
  return text
    .replace(/^(?:i\s*'?m|im|i\s+am)\s+(?:going\s+to|gonna)\s+/i, '')
    .replace(/^(?:we\s*'?re|were|we\s+are)\s+(?:going\s+to|gonna)\s+/i, '')
    .trim()
}

function looksLikeGarbagePhrase(title: string) {
  const t = normalizeTitle(title)
  if (!t) return true
  if (t.length < 3) return true
  if (t.length > 120) return true
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 16) return true
  const noise = new Set(['ok', 'okay', 'alright', 'right', 'so', 'then', 'and', 'yeah', 'yep', 'um', 'uh', 'i', "i'm", 'im'])
  if (words.every((w) => noise.has(w.toLowerCase()))) return true
  if (words.length <= 2 && words.every((w) => noise.has(w.toLowerCase()))) return true
  if (/^(?:ok(?:ay)?|um+|uh+)\b/i.test(t) && words.length <= 3) return true
  return false
}

function extractMealEventTitle(prefix: string) {
  const t = prefix.toLowerCase()
  const idx = Math.max(t.lastIndexOf(' dinner'), t.lastIndexOf(' lunch'), t.lastIndexOf(' breakfast'))
  if (idx === -1) return null
  const after = prefix.slice(idx).trim()
  const title = after.replace(/^(dinner|lunch|breakfast)\b/i, (m) => m[0]!.toUpperCase() + m.slice(1)).trim()
  return title || null
}

function pickEventAndTaskFromPrefix(prefix: string) {
  const meal = extractMealEventTitle(` ${prefix}`)
  if (meal) {
    const taskPart = prefix.replace(new RegExp(meal, 'i'), '').trim()
    return { eventTitle: meal, taskTitle: taskPart || null }
  }
  const t = prefix.toLowerCase()
  if (/\b(drive|drove|driving|commute|uber|lyft|bus|train|flight|airport)\b/.test(t)) return { eventTitle: 'Transport', taskTitle: null }
  if (/\b(work|shift)\b/.test(t)) return { eventTitle: 'Work', taskTitle: null }
  if (/\b(clinic|patients|inpatient|rounds)\b/.test(t)) return { eventTitle: 'Clinic', taskTitle: null }
  if (/\b(call|phone|ring)\b/.test(t)) return { eventTitle: 'Call', taskTitle: null }
  if (/\b(bank|loan|mortgage|finance)\b/.test(t)) return { eventTitle: 'Bank', taskTitle: null }
  return { eventTitle: normalizeTitle(prefix), taskTitle: null }
}

export function parseCaptureNatural(rawText: string, nowMs = Date.now()): ParseNaturalResult {
  const tasks: ParsedTask[] = []
  const events: ParsedEvent[] = []

  const text = rawText.trim()
  if (!text) return { tasks, events }

  const dayOffset = detectDayOffset(text, nowMs)
  const chronoBase = chrono.parseDate(text, new Date(nowMs), { forwardDate: true })
  const dayStart = chronoBase ? startOfDayMs(chronoBase.getTime()) : addDaysMs(startOfDayMs(nowMs), dayOffset)
  let lastExplicitMin: number | null = null
  let lastExplicitStartMin: number | null = null
  let lastExplicitEndMin: number | null = null
  let lastTaskIndex: number | null = null

  const phrases = splitCandidatePhrases(text)
  for (const phraseRaw of phrases) {
    const mood = parseMood(phraseRaw)
    const base = phraseRaw.replace(/\b(feeling|feel|mood)\b.*$/i, '').trim()
    const phrase = stripTokenNoise(base)
    const embeddedParentHint = extractEmbeddedParentHint(phraseRaw)
    const isPast = looksLikePastTense(phraseRaw) || looksLikePastTense(text)
    const preferredMin: number | null = lastExplicitEndMin ?? lastExplicitMin
    let time: { startMin: number; endMin: number; consumed: string } | null = phrase ? parseTimeRange(phrase, nowMs, preferredMin) : null
    if (!time) {
      const until = phrase.match(/\b(?:until|till)\s+(\d{1,2}(?::\d{2})?(?:\s*o'?clock)?\s*(?:am|pm)?)\b/i)
      const baseStart: number | null =
        lastExplicitStartMin != null && lastExplicitEndMin != null && lastExplicitEndMin - lastExplicitStartMin <= 60
          ? lastExplicitStartMin
          : lastExplicitEndMin ?? lastExplicitMin
      if (until?.[1] && baseStart != null) {
        const endMinRaw = parseTimeToken(until[1], phrase, nowMs, null, baseStart)
        if (endMinRaw != null) {
          let endMin = endMinRaw
          if (endMin < baseStart) endMin = endMin + 12 * 60
          time = { startMin: baseStart, endMin, consumed: until[0] }
        }
      }
    }
    const duration = parseDurationMinutes(phrase) ?? estimateMinutes(phrase)
    const isForgot = looksLikeForgot(phraseRaw)
    const isFutureContext = dayOffset > 0 && !isPast
    const immediateIntent = isImmediateIntent(phraseRaw)
    const physicalAction = isPhysicalAction(phrase)
    const forceEvent = physicalAction && (immediateIntent || /\bshould\b/i.test(phraseRaw))

    if (mood != null) {
      let at = isPast ? defaultPastAt(dayStart, phraseRaw, nowMs) : nowMs
      if (time) {
        let startAt = dayStart + clamp(time.startMin, 0, 24 * 60 - 1) * 60 * 1000
        if (!isPast && startAt < nowMs - 60 * 60 * 1000 && dayOffset === 0) startAt = startAt + 24 * 60 * 60 * 1000
        at = startAt
      }
      events.push({
        title: `mood: ${mood}/10`,
        startAt: at,
        endAt: at + 5 * 60 * 1000,
        kind: 'log',
        tags: ['#mood'],
        explicitTime: Boolean(time),
        sourceText: phraseRaw,
      })
    }

    const phraseLower = phrase.toLowerCase()
    const moodOnlyPrefix = mood != null && (phraseLower === 'i' || phraseLower === "i'm" || phraseLower === 'im')
    if (!phrase || moodOnlyPrefix) continue
    const forceKeep =
      Boolean(time) ||
      /\b(i have to|i need to|need to|make (?:that )?a task|make this a task|reminder|todo|task for)\b/i.test(phraseRaw)
    if (looksLikeGarbagePhrase(phrase) && !forceKeep) continue

    // If it has a time, assume it’s scheduling an event (and optionally a task alongside it).
    if (time) {
      const startMin: number = time.startMin
      const endMin: number = time.endMin
      const inferredEndMin: number = endMin === startMin ? startMin + duration : endMin
      const titlePrefix = phrase.replace(time.consumed, '').replace(/\b(at|@)\b/i, '').trim()
      const { eventTitle, taskTitle } = pickEventAndTaskFromPrefix(titlePrefix)
      const fallbackFromRaw = pickEventAndTaskFromPrefix(phraseRaw).eventTitle
      const taskIntent = /\b(task|todo|reminder)\b/i.test(phraseRaw) || /\bneed to\b/i.test(phraseRaw)
      const taskOnlyIntent =
        /\b(make (?:that )?a task|make this a task|reminder|todo)\b/i.test(phraseRaw) &&
        !/\b(meeting|drive|driving|work|walk|dinner|lunch|breakfast|gym|workout|flight|clinic|rounds|study)\b/i.test(titlePrefix)

      let startAt = dayStart + clamp(startMin, 0, 24 * 60 - 1) * 60 * 1000
      let endAt = dayStart + clamp(inferredEndMin, 1, 36 * 60) * 60 * 1000
      if (!isPast && startAt < nowMs - 60 * 60 * 1000 && dayOffset === 0) {
        startAt = startAt + 24 * 60 * 60 * 1000
        endAt = endAt + 24 * 60 * 60 * 1000
      }
      let eventTitleNorm = normalizeTitle(eventTitle || 'Event')
      if (looksLikeGarbagePhrase(eventTitleNorm)) {
        const shortened = normalizeTitle(eventTitleNorm.split(/\s+/).slice(0, 8).join(' '))
        if (!looksLikeGarbagePhrase(shortened)) {
          eventTitleNorm = shortened
        } else {
          const fallback = normalizeTitle(fallbackFromRaw || eventTitle || 'Event')
          eventTitleNorm = looksLikeGarbagePhrase(fallback) ? 'Event' : fallback
        }
      }
      let createdTask = false
      const scoped = /\b(later|after this|after that|tomorrow|next|eventually)\b/i.test(phraseRaw) || isFutureContext ? 'global' : 'inline'
      if (taskIntent) {
        const taskRaw = normalizeTitle(stripFirstPersonFuturePrefix(titlePrefix.replace(/\b(make|set)\b.*\b(task|todo|reminder)\b.*$/i, '').trim()))
        if (!looksLikeGarbagePhrase(taskRaw)) {
          tasks.push({
            title: taskRaw,
            status: isPast ? 'done' : isForgot ? 'todo' : 'todo',
            estimateMinutes: estimateMinutes(taskRaw),
            scheduledAt: startAt,
            dueAt: endAt,
            scope: scoped,
          })
          lastTaskIndex = tasks.length - 1
        } else if (lastTaskIndex != null) {
          tasks[lastTaskIndex] = {
            ...tasks[lastTaskIndex],
            scheduledAt: startAt,
            dueAt: endAt,
          }
        }
        createdTask = true
      }

      const buyItems = extractBuyList(phraseRaw)
      if (buyItems.length) {
        tasks.push({
          title: 'Buy groceries',
          status: isPast ? 'done' : 'todo',
          estimateMinutes: 45,
          scheduledAt: startAt,
          dueAt: endAt,
          tags: ['#shopping'],
          notes: buyItems.map((x) => `- [ ] ${x}`).join('\n'),
          scope: scoped,
        })
        createdTask = true
      }

      if (!taskOnlyIntent) {
        events.push({
          title: eventTitleNorm,
          startAt,
          endAt: Math.max(endAt, startAt + 5 * 60 * 1000),
          kind: embeddedParentHint ? 'episode' : 'event',
          estimateMinutes: Math.round((Math.max(endAt, startAt) - startAt) / (60 * 1000)),
          explicitTime: true,
          sourceText: phraseRaw,
          parentHint: embeddedParentHint,
        })
      }
      lastExplicitMin = inferredEndMin
      lastExplicitStartMin = startMin
      lastExplicitEndMin = inferredEndMin
      if (taskOnlyIntent || createdTask) continue
      if (taskTitle) {
        const taskTitleNorm = normalizeTitle(stripFirstPersonFuturePrefix(taskTitle))
        if (!looksLikeGarbagePhrase(taskTitleNorm)) {
          tasks.push({
            title: taskTitleNorm,
            status: isPast ? 'done' : isForgot ? 'todo' : 'todo',
            estimateMinutes: estimateMinutes(taskTitle),
            scope: scoped,
          })
          lastTaskIndex = tasks.length - 1
        }
      }
      continue
    }

    // Workout sets (MVP heuristic).
    const setMatch = phrase.match(/\b(\d{1,4})\s*(push[-\s]?ups?|sit[-\s]?ups?|squats?|pull[-\s]?ups?)\b/i)
    if (setMatch?.[1] && setMatch?.[2]) {
      const at = isPast ? defaultPastAt(dayStart, phrase, nowMs) : nowMs
      const reps = Number(setMatch[1])
      const move = setMatch[2].toLowerCase().replace(/\s+/g, ' ')
      events.push({ title: `workout: ${reps} ${move}`, startAt: at, endAt: at + 5 * 60 * 1000, kind: 'log', tags: ['#workout'], explicitTime: false, sourceText: phraseRaw })
      const rpe = phrase.match(/\brpe\s*(\d{1,2})\b/i)?.[1]
      if (rpe) events.push({ title: `rpe: ${rpe}`, startAt: at, endAt: at + 5 * 60 * 1000, kind: 'log', tags: ['#workout'], explicitTime: false, sourceText: phraseRaw })
      continue
    }

  // Food / meals (MVP heuristic).
  const mealKind = /\b(breakfast|lunch|dinner|snack|meal)\b/i.exec(phrase)?.[1]?.toLowerCase() ?? null
  const ate = phrase.match(/\b(ate|eating|eat|having|have)\b\s+(.+)$/i)
  // Avoid spurious "Meal" events when the word "meal" appears without an eating verb.
  if ((mealKind && mealKind !== 'meal') || ate?.[2]) {
    const at = isPast ? defaultPastAt(dayStart, phrase, nowMs) : nowMs
    const title = mealKind ? mealKind[0].toUpperCase() + mealKind.slice(1) : 'Meal'
    const list = (ate?.[2] ?? '')
      .split(/,|\band\b/i)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12)
      const dur = Math.max(15, parseDurationMinutes(phrase) ?? 30)
      const titleNorm = normalizeTitle(title)
      if (looksLikeGarbagePhrase(titleNorm)) continue
      events.push({
        title: titleNorm,
        startAt: at,
        endAt: at + dur * 60 * 1000,
        kind: 'event',
        tags: ['#food'],
        notes: list.length ? list.map((x) => `- ${x}`).join('\n') : undefined,
        estimateMinutes: dur,
        explicitTime: false,
        sourceText: phraseRaw,
      })
      continue
    }

    // Hydration (MVP).
    const drank = phrase.match(/\b(drank|drink|drinking)\b\s+(.+)$/i)
    if (drank?.[2]) {
      const at = isPast ? defaultPastAt(dayStart, phrase, nowMs) : nowMs
      const item = drank[2].trim()
      events.push({ title: `drink: ${item}`, startAt: at, endAt: at + 5 * 60 * 1000, kind: 'log', tags: ['#hydration'], explicitTime: false, sourceText: phraseRaw })
      continue
    }

    // Grocery-style: "bought apples, bananas, pears"
    const bought = phrase.match(/\b(bought|purchased|picked up|got)\b\s+(.+)$/i)
    if (bought?.[2]) {
      const list = bought[2]
        .split(/,|\band\b/i)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 12)
      const at = isPast ? defaultPastAt(dayStart, phrase, nowMs) : nowMs
      const title = 'Grocery run'
      events.push({
        title,
        startAt: at,
        endAt: at + duration * 60 * 1000,
        kind: 'event',
        tags: ['#shopping'],
        notes: list.map((x) => `- ${x}`).join('\n'),
        explicitTime: false,
        sourceText: phraseRaw,
      })
      tasks.push({ title: 'Buy groceries', status: 'done', notes: list.map((x) => `- [x] ${x}`).join('\n'), estimateMinutes: 45 })
      continue
    }

    // Generic: treat as a task if it looks imperative; otherwise an event log in the past.
    const at = isPast ? defaultPastAt(dayStart, phrase, nowMs) : nowMs
    const defaultStart = clamp(at, dayStart, dayStart + 24 * 60 * 60 * 1000 - 1)
    const defaultEnd = defaultStart + duration * 60 * 1000

    // Segment pattern: "4 hours inpatient and 4 hours clinic" → one event with dividers in notes.
    const segs = Array.from(phrase.matchAll(/(\d{1,2})(?:\.(\d))?\s*(h|hr|hrs|hour|hours)\s+([a-z][\w ]{1,24})/gi)).map((m) => {
      const whole = Number(m[1])
      const tenth = m[2] ? Number(m[2]) / 10 : 0
      const mins = Math.round((whole + tenth) * 60)
      const label = (m[4] ?? '').trim()
      return { mins: clamp(mins, 15, 12 * 60), label }
    })
    if (segs.length >= 2) {
      const total = segs.reduce((a, s) => a + s.mins, 0)
      const start = defaultStart
      const end = start + total * 60 * 1000
      const notes: string[] = []
      let cursor = start
      for (const s of segs) {
        const dt = new Date(cursor)
        const hh = String(dt.getHours()).padStart(2, '0')
        const mm = String(dt.getMinutes()).padStart(2, '0')
        notes.push(`**${hh}:${mm}** - ${s.label}`)
        cursor = cursor + s.mins * 60 * 1000
      }
      events.push({
        title: /work|shift|clinic/i.test(phrase) ? 'Work' : 'Event',
        startAt: start,
        endAt: end,
        kind: 'event',
        estimateMinutes: total,
        notes: notes.join('\n'),
        explicitTime: false,
        sourceText: phraseRaw,
      })
      continue
    }

    const imperative =
      !forceEvent &&
      (/^(call|text|email|buy|pick up|schedule|book|do|finish|start)\b/i.test(phrase) ||
        /\b(i have to|i need to|i'm gonna|im gonna|going to|gotta)\b/i.test(phrase))
    if (imperative || isForgot || isFutureContext) {
      const normalized = normalizeTitle(stripFirstPersonFuturePrefix(phrase.replace(/^forgot\s+/i, '').trim()))
      if (looksLikeGarbagePhrase(normalized)) continue
      const scope = /\b(later|after this|after that|tomorrow|next|eventually)\b/i.test(phraseRaw) || isFutureContext ? 'global' : 'inline'
      const buyList = extractBuyList(phrase)
      const money = parseMoneyUsd(phrase) ?? parseMoneyUsd(text)
      const scheduledAt = isFutureContext ? dayStart + inferDefaultFutureTaskHour(phrase) * 60 * 60 * 1000 : null
      const dueAt = isFutureContext ? dayStart + 24 * 60 * 60 * 1000 - 1 : null
      const tags = buyList.length ? ['#shopping'] : undefined
      const noteLines: string[] = []
      if (buyList.length) noteLines.push(...buyList.map((x) => `- [ ] ${x}`))
      if (money != null && Number.isFinite(money)) noteLines.push(`Budget: $${money}`)
      tasks.push({
        title: normalized,
        status: isForgot ? 'todo' : isPast ? 'done' : 'todo',
        estimateMinutes: duration,
        scheduledAt,
        dueAt,
        tags,
        notes: noteLines.length ? noteLines.join('\n') : undefined,
        scope,
      })
    } else {
      const normalized = normalizeTitle(stripFirstPersonFuturePrefix(phrase))
      if (looksLikeGarbagePhrase(normalized)) continue
      const baseStart = defaultStart
      const baseEnd = defaultEnd
      const openEnded = forceEvent && immediateIntent && !isPast
      events.push({
        title: normalized,
        startAt: baseStart,
        endAt: baseEnd,
        kind: embeddedParentHint ? 'episode' : 'event',
        estimateMinutes: duration,
        explicitTime: false,
        sourceText: phraseRaw,
        parentHint: embeddedParentHint,
        openEnded,
      })
    }
  }

  return { tasks: tasks.slice(0, 16), events: events.slice(0, 32) }
}

/**
 * Split text on horizontal dividers (---, ***, ___) into separate blocks.
 * Each block is parsed independently for topics/entities.
 */
function splitOnDividers(text: string): string[] {
  // Match horizontal rules: 3+ dashes, asterisks, or underscores on their own line
  const dividerPattern = /^[\t ]*(?:[-]{3,}|[*]{3,}|[_]{3,})[\t ]*$/gm
  const parts = text.split(dividerPattern)
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Extract tracker values from text using #name(value) or #name:value syntax
 */
function extractTrackers(text: string): Array<{ key: string; value: number }> {
  const trackers: Array<{ key: string; value: number }> = []

  // #tracker(value) pattern
  const parenPattern = /#([a-zA-Z][\w/-]*)\s*\(\s*([-+]?\d*\.?\d+)\s*\)/g
  for (const m of text.matchAll(parenPattern)) {
    const key = m[1]!.toLowerCase()
    const value = parseFloat(m[2]!)
    if (Number.isFinite(value)) {
      trackers.push({ key, value })
    }
  }

  // #tracker:value pattern
  const colonPattern = /#([a-zA-Z][\w/-]*)\s*:\s*([-+]?\d*\.?\d+)/g
  for (const m of text.matchAll(colonPattern)) {
    const key = m[1]!.toLowerCase()
    const value = parseFloat(m[2]!)
    if (Number.isFinite(value) && !trackers.some((t) => t.key === key)) {
      trackers.push({ key, value })
    }
  }

  // Natural language patterns like "mood 7/10" or "energy is 8"
  const nlPattern = /\b(mood|energy|stress|pain|anxiety|focus|motivation|sleep|productivity)\b[^0-9]{0,12}(\d{1,2})(?:\s*\/\s*10)?/gi
  for (const m of text.matchAll(nlPattern)) {
    const key = m[1]!.toLowerCase()
    const value = clamp(parseInt(m[2]!, 10), 0, 10)
    if (Number.isFinite(value) && !trackers.some((t) => t.key === key)) {
      trackers.push({ key, value })
    }
  }

  return trackers
}

/**
 * Extract @people mentions from text
 */
function extractPeople(text: string): string[] {
  const people = new Set<string>()

  // @person pattern (simple word)
  for (const m of text.matchAll(/@([a-zA-Z][\w-]*)/g)) {
    people.add(m[1]!.toLowerCase())
  }

  // @"Full Name" pattern (quoted)
  for (const m of text.matchAll(/@"([^"]+)"/g)) {
    people.add(m[1]!.toLowerCase())
  }

  return Array.from(people).slice(0, 20)
}

/**
 * Extract #tags from text (excluding tracker values)
 */
function extractTags(text: string): string[] {
  const tags = new Set<string>()

  // #tag pattern - but exclude those with (value) or :value
  for (const m of text.matchAll(/(^|\s)#([a-zA-Z][\w/-]*)(?![:(])/g)) {
    tags.add(m[2]!.toLowerCase())
  }

  return Array.from(tags).slice(0, 20)
}

/**
 * Extract *contexts from text
 */
function extractContexts(text: string): string[] {
  const contexts = new Set<string>()

  for (const m of text.matchAll(/(^|\s)\*([a-zA-Z][\w-]*)/g)) {
    contexts.add(m[2]!.toLowerCase())
  }

  return Array.from(contexts).slice(0, 10)
}

/**
 * Extract !locations from text
 */
function extractLocations(text: string): string[] {
  const locations = new Set<string>()

  // !location pattern (simple word)
  for (const m of text.matchAll(/(^|\s)!([a-zA-Z][\w-]*)/g)) {
    locations.add(m[2]!.toLowerCase())
  }

  // !"Full Location" pattern (quoted)
  for (const m of text.matchAll(/!"([^"]+)"/g)) {
    locations.add(m[1]!.toLowerCase())
  }

  return Array.from(locations).slice(0, 10)
}

/**
 * Generate a unique block ID
 */
function makeBlockId(index: number): string {
  return `blk_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 8)}`
}

/**
 * Parse text with horizontal divider support.
 * Text is split on --- or *** dividers, and each block is parsed independently.
 * Entities (people, tags, trackers, etc.) are extracted per-block.
 */
export function parseCaptureWithBlocks(rawText: string, nowMs = Date.now()): ParseBlocksResult {
  const text = rawText.trim()
  if (!text) {
    return { blocks: [], tasks: [], events: [] }
  }

  const rawBlocks = splitOnDividers(text)
  const blocks: ParsedBlock[] = []
  const allTasks: ParsedTask[] = []
  const allEvents: ParsedEvent[] = []

  for (let i = 0; i < rawBlocks.length; i++) {
    const blockText = rawBlocks[i]!

    // Parse this block for tasks and events
    const parsed = parseCaptureNatural(blockText, nowMs)

    // Extract tokens specific to this block
    const trackers = extractTrackers(blockText)
    const people = extractPeople(blockText)
    const tags = extractTags(blockText)
    const contexts = extractContexts(blockText)
    const locations = extractLocations(blockText)

    // Enhance events with extracted location
    const enhancedEvents = parsed.events.map((ev) => ({
      ...ev,
      people: people.length > 0 ? people : ev.people,
      location: locations[0] ?? ev.location,
    }))

    // Enhance tasks with extracted tags and contexts
    const enhancedTasks = parsed.tasks.map((task) => ({
      ...task,
      tags: tags.length > 0 ? [...(task.tags ?? []), ...tags.filter((t) => !task.tags?.includes(t))] : task.tags,
    }))

    const block: ParsedBlock = {
      id: makeBlockId(i),
      blockIndex: i,
      rawText: blockText,
      tasks: enhancedTasks,
      events: enhancedEvents,
      trackers,
      people,
      tags,
      contexts,
      locations,
    }

    blocks.push(block)
    allTasks.push(...enhancedTasks)
    allEvents.push(...enhancedEvents)
  }

  return {
    blocks,
    tasks: allTasks.slice(0, 32),
    events: allEvents.slice(0, 64),
  }
}
