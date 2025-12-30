export type EventTitleDetail = 'auto' | 'full' | 'focus'

export type DisplaySettings = {
  eventTitleDetail: EventTitleDetail
}

const STORAGE_KEY = 'insight5.ui.display.v1'
export const DISPLAY_SETTINGS_CHANGED_EVENT = 'insight5.ui.display.changed'

const DEFAULT_SETTINGS: DisplaySettings = {
  eventTitleDetail: 'auto',
}

export function loadDisplaySettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>
    const detail = parsed.eventTitleDetail
    if (detail === 'auto' || detail === 'full' || detail === 'focus') {
      return { eventTitleDetail: detail }
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
