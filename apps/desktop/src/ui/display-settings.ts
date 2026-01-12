export type EventTitleDetail = 'auto' | 'full' | 'focus'
export type DisplayDensity = 'large' | 'compact'

export type DisplaySettings = {
  eventTitleDetail: EventTitleDetail
  density: DisplayDensity
}

const STORAGE_KEY = 'insight5.ui.display.v1'
export const DISPLAY_SETTINGS_CHANGED_EVENT = 'insight5.ui.display.changed'

const DEFAULT_SETTINGS: DisplaySettings = {
  eventTitleDetail: 'auto',
  density: 'large',
}

export function loadDisplaySettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>
    const detail = parsed.eventTitleDetail
    const density = parsed.density
    if (detail === 'auto' || detail === 'full' || detail === 'focus') {
      return {
        eventTitleDetail: detail,
        density: density === 'compact' || density === 'large' ? density : DEFAULT_SETTINGS.density,
      }
    }
    return DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveDisplaySettings(next: DisplaySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new Event(DISPLAY_SETTINGS_CHANGED_EVENT))
  } catch {
    // ignore
  }
}
