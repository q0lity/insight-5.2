import type { CalendarEvent } from '../storage/calendar'
import type { IconName } from './icons'

export const EVENT_COLOR_PRESETS: Array<{ name: string; hex: string }> = [
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Lime', hex: '#65a30d' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Slate', hex: '#64748b' },
]

export type EventTitleMode = 'compact' | 'detailed' | 'focus'

export function formatEventTitle(ev: CalendarEvent, mode: EventTitleMode) {
  const category = (ev.category ?? '').trim()
  const subcategory = (ev.subcategory ?? '').trim()
  const location = (ev.location ?? '').trim()
  if (mode === 'focus') {
    return location || subcategory || category || ev.title
  }
  const parts: string[] = []
  if (category) parts.push(category)
  if (subcategory) parts.push(subcategory)
  if (mode === 'detailed' && location) parts.push(location)
  return parts.length ? parts.join(' | ') : ev.title
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(124, 58, 237, ${alpha})`
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
    return { color: explicitColor ?? '#7c3aed', icon: explicitIcon ?? 'calendar' }
  }

  if (ev.kind === 'log' || ev.kind === 'episode') {
    const tracker = detectTracker(ev)
    if (tracker === 'habit') return { color: '#22c55e', icon: 'check' }
    if (tracker === 'period') return { color: '#ef4444', icon: 'droplet' }
    if (tracker === 'pain') return { color: '#ef4444', icon: 'heart' }
    if (tracker === 'sleep') return { color: '#64748b', icon: 'moonStar' }
    if (tracker === 'workout') return { color: '#16a34a', icon: 'dumbbell' }
    if (tracker === 'energy') return { color: '#d97706', icon: 'bolt' }
    if (tracker === 'stress') return { color: '#db2777', icon: 'frown' }
    if (tracker === 'bored') return { color: '#64748b', icon: 'frown' }
    if (tracker === 'water') return { color: '#0ea5e9', icon: 'droplet' }
    if (tracker === 'mood') {
      const v = ev.title.toLowerCase().match(/\bmood:\s*(\d{1,2})/)?.[1]
      const moodVal = v ? Math.max(0, Math.min(10, Number(v))) : null
      return { color: '#7c3aed', icon: moodVal != null && moodVal < 6 ? 'frown' : 'smile' }
    }
    return { color: '#7c3aed', icon: 'sparkle' }
  }

  const category = detectCategory(ev)
  switch (category) {
    case 'task':
      return { color: '#2563eb', icon: 'check' }
    case 'work':
      return { color: '#4f46e5', icon: 'briefcase' }
    case 'clinic':
      return { color: '#0ea5e9', icon: 'stethoscope' }
    case 'food':
      return { color: '#ea580c', icon: 'food' }
    case 'fitness':
      return { color: '#16a34a', icon: 'dumbbell' }
    case 'hygiene':
      return { color: '#06b6d4', icon: 'tooth' }
    case 'shopping':
      return { color: '#d97706', icon: 'cart' }
    case 'sleep':
      return { color: '#64748b', icon: 'moonStar' }
    case 'study':
      return { color: '#2563eb', icon: 'book' }
    case 'commute':
      return { color: '#64748b', icon: 'pin' }
    case 'transport':
      return { color: '#64748b', icon: 'pin' }
    case 'call':
      return { color: '#db2777', icon: 'phone' }
    default:
      return { color: '#7c3aed', icon: 'calendar' }
  }
}
