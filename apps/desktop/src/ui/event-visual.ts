import type { CalendarEvent } from '../storage/calendar'
import type { IconName } from './icons'

export const EVENT_COLOR_PRESETS: Array<{ name: string; hex: string }> = [
  { name: 'Moss', hex: '#A3B87C' },
  { name: 'Sage', hex: '#7BAF7B' },
  { name: 'Lavender', hex: '#8B7EC8' },
  { name: 'Indigo', hex: '#5B5F97' },
  { name: 'Steel', hex: '#6B8CAE' },
  { name: 'Teal', hex: '#7EBDC3' },
  { name: 'Caramel', hex: '#D4A574' },
  { name: 'Clay', hex: '#D95D39' },
  { name: 'Rose', hex: '#C88B9D' },
  { name: 'Stone', hex: '#8C8B88' },
]

export type EventTitleMode = 'compact' | 'detailed' | 'focus'

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripLeadingPhrases(title: string) {
  return title.replace(/^\s*(i(?:'|\u2019)?m|i am|im)\s+/i, '').trim()
}

function stripPeopleFromTitle(title: string, people: string[] | null | undefined) {
  let cleaned = title
  const names = (people ?? []).map((p) => p.trim()).filter(Boolean)
  for (const name of names) {
    const escaped = escapeRegExp(name)
    const withPattern = new RegExp(`(?:,?\\s*(?:with|w\\/|w)\\s+${escaped})\\s*$`, 'i')
    cleaned = cleaned.replace(withPattern, '').trim()
  }
  cleaned = cleaned.replace(/\s*(,|and)\s*$/i, '').trim()
  return cleaned
}

function wrapInQuotes(title: string) {
  const trimmed = title.trim()
  if (!trimmed) return ''
  if (/^["'].*["']$/.test(trimmed)) return trimmed
  return `"${trimmed}"`
}

function inferDisplaySubcategory(ev: CalendarEvent) {
  const text = `${ev.title} ${(ev.tags ?? []).join(' ')}`.toLowerCase()
  if (/\b(watch|watching|movie|film|show|series|episode|netflix|hulu|prime|stream|tv|youtube)\b/.test(text)) {
    return 'Entertainment'
  }
  return null
}

function formatDisplayTitle(ev: CalendarEvent) {
  const stripped = stripLeadingPhrases(stripPeopleFromTitle(ev.title ?? '', ev.people))
  return stripped || ev.title
}

export function formatEventTitle(ev: CalendarEvent, mode: EventTitleMode) {
  const category = (ev.category ?? '').trim()
  let subcategory = (ev.subcategory ?? '').trim()
  const location = (ev.location ?? '').trim()
  if (!subcategory || subcategory.toLowerCase() === 'general') {
    const inferred = inferDisplaySubcategory(ev)
    if (inferred) subcategory = inferred
  }
  const titleText = formatDisplayTitle(ev)
  const titleLabel = titleText !== ev.title ? wrapInQuotes(titleText) : titleText
  if (mode === 'focus') {
    return titleLabel || location || subcategory || category || ev.title
  }
  const categoryLabel = [category, subcategory].filter(Boolean).join(' / ')
  const parts: string[] = []
  if (categoryLabel) parts.push(categoryLabel)
  if (titleLabel) parts.push(titleLabel)
  if (mode === 'detailed' && location) parts.push(location)
  return parts.length ? parts.join(' - ') : ev.title
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(163, 184, 124, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function normalizeIcon(v: string | null | undefined): IconName | null {
  const x = (v ?? '').trim() as IconName
  if (!x) return null
		  const allowed: Record<IconName, true> = {
	    home: true,
	    calendar: true,
	    mic: true,
	    check: true,
	    dots: true,
	    bolt: true,
	    sparkle: true,
	    smile: true,
	    frown: true,
	    droplet: true,
	    maximize: true,
	    play: true,
	    pause: true,
	    plus: true,
	    panelLeft: true,
    panelRight: true,
    x: true,
    sun: true,
    moon: true,
    tag: true,
    trophy: true,
    heart: true,
    file: true,
    target: true,
    gear: true,
    phone: true,
    food: true,
    dumbbell: true,
    cart: true,
    tooth: true,
    briefcase: true,
    stethoscope: true,
    pin: true,
    book: true,
	    moonStar: true,
		    users: true,
        folder: true,
		    chevronDown: true,
		    chevronRight: true,
		  }
	  return allowed[x] ? x : null
	}

function normalizeColor(v: string | null | undefined): string | null {
  const x = (v ?? '').trim()
  if (!x) return null
  const m = x.match(/^#([0-9a-fA-F]{6})$/)
  return m ? `#${m[1]}` : null
}

function titleAndTagsText(ev: CalendarEvent) {
  const tags = (ev.tags ?? []).join(' ')
  return `${ev.title} ${tags}`.toLowerCase()
}

function detectCategory(ev: CalendarEvent) {
  const text = titleAndTagsText(ev)
  if (ev.kind === 'task') return 'task'
  if (/(dentist|clinic|hospital|inpatient|stetho)/i.test(text)) return 'clinic'
  if (/(work|shift|clinic|meeting|call (with|w\/)|standup|scrum|rounds)/i.test(text)) return 'work'
  if (/(dinner|lunch|breakfast|snack|coffee|food|restaurant)/i.test(text)) return 'food'
  if (/(gym|workout|lift|run|cardio|walk|yoga)/i.test(text)) return 'fitness'
  if (/(tooth|teeth|brush|floss)/i.test(text)) return 'hygiene'
  if (/(grocery|store|shopping|buy|bought|errand)/i.test(text)) return 'shopping'
  if (/(sleep|nap|bed|asleep|wake)/i.test(text)) return 'sleep'
  if (/(study|read|class|lecture|homework)/i.test(text)) return 'study'
  if (/(commute)/i.test(text)) return 'commute'
  if (/(transport|drive|driving|bus|train|uber|lyft|flight|airport)/i.test(text)) return 'transport'
  if (/(mom|dad|call|phone|text)/i.test(text)) return 'call'
  return 'default'
}

function detectTracker(ev: CalendarEvent) {
  const text = titleAndTagsText(ev)
  const key = (ev.trackerKey ?? '').toLowerCase()
  const hay = `${key} ${text}`
  if (/\bhabit\b/.test(hay)) return 'habit'
  if (/\bperiod\b/.test(hay)) return 'period'
  if (/\bpain\b/.test(hay)) return 'pain'
  if (/\bmood\b/.test(hay)) return 'mood'
  if (/\bstress\b/.test(hay)) return 'stress'
  if (/\benergy\b/.test(hay)) return 'energy'
  if (/\bbored\b/.test(hay)) return 'bored'
  if (/\bsleep\b/.test(hay)) return 'sleep'
  if (/\bworkout\b/.test(hay)) return 'workout'
  if (/\bwater\b|\bhydrat(?:e|ion|ing)?\b/.test(hay)) return 'water'
  return null
}

export function eventAccent(ev: CalendarEvent): { color: string; icon: IconName } {
  const explicitColor = normalizeColor(ev.color)
  const explicitIcon = normalizeIcon(ev.icon)
  if (explicitColor || explicitIcon) {
    return { color: explicitColor ?? '#A3B87C', icon: explicitIcon ?? 'calendar' }
  }

  if (ev.kind === 'log' || ev.kind === 'episode') {
    const tracker = detectTracker(ev)
    if (tracker === 'habit') return { color: '#7BAF7B', icon: 'check' }
    if (tracker === 'period') return { color: '#C97B7B', icon: 'droplet' }
    if (tracker === 'pain') return { color: '#C97B7B', icon: 'heart' }
    if (tracker === 'sleep') return { color: '#8C8B88', icon: 'moonStar' }
    if (tracker === 'workout') return { color: '#7BAF7B', icon: 'dumbbell' }
    if (tracker === 'energy') return { color: '#D4A574', icon: 'bolt' }
    if (tracker === 'stress') return { color: '#C88B9D', icon: 'frown' }
    if (tracker === 'bored') return { color: '#8C8B88', icon: 'frown' }
    if (tracker === 'water') return { color: '#7EBDC3', icon: 'droplet' }
    if (tracker === 'mood') {
      const v = ev.title.toLowerCase().match(/\bmood:\s*(\d{1,2})/)?.[1]
      const moodVal = v ? Math.max(0, Math.min(10, Number(v))) : null
      return { color: '#8B7EC8', icon: moodVal != null && moodVal < 6 ? 'frown' : 'smile' }
    }
    return { color: '#A3B87C', icon: 'sparkle' }
  }

  const category = detectCategory(ev)
  switch (category) {
    case 'task':
      return { color: '#6B8CAE', icon: 'check' }
    case 'work':
      return { color: '#5B5F97', icon: 'briefcase' }
    case 'clinic':
      return { color: '#7EBDC3', icon: 'stethoscope' }
    case 'food':
      return { color: '#D95D39', icon: 'food' }
    case 'fitness':
      return { color: '#7BAF7B', icon: 'dumbbell' }
    case 'hygiene':
      return { color: '#7EBDC3', icon: 'tooth' }
    case 'shopping':
      return { color: '#D4A574', icon: 'cart' }
    case 'sleep':
      return { color: '#8C8B88', icon: 'moonStar' }
    case 'study':
      return { color: '#6B8CAE', icon: 'book' }
    case 'commute':
      return { color: '#8C8B88', icon: 'pin' }
    case 'transport':
      return { color: '#8C8B88', icon: 'pin' }
    case 'call':
      return { color: '#C88B9D', icon: 'phone' }
    default:
      return { color: '#A3B87C', icon: 'calendar' }
  }
}
