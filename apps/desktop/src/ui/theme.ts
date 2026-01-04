export type ThemePreference = 'system' | 'light' | 'dark' | 'warm' | 'olive' | 'oliveOrange' | 'roseGold'
export type ResolvedTheme = 'light' | 'dark' | 'warm' | 'olive' | 'oliveOrange' | 'roseGold'

const STORAGE_KEY = 'insight5.ui.theme.v2'
export const THEME_CHANGED_EVENT = 'insight5.theme.changed'

const VALID_THEMES: ThemePreference[] = ['system', 'light', 'dark', 'warm', 'olive', 'oliveOrange', 'roseGold']
const DARK_THEMES: ResolvedTheme[] = ['dark', 'olive', 'oliveOrange', 'roseGold']

export function getSystemTheme(): ResolvedTheme {
  try {
    // System dark → 'dark', System light → 'warm' (the default warm sand look)
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'warm'
  } catch {
    return 'warm'
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return getSystemTheme()
  return pref as ResolvedTheme
}

export function isDarkTheme(theme: ResolvedTheme): boolean {
  return DARK_THEMES.includes(theme)
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && VALID_THEMES.includes(raw as ThemePreference)) {
      return raw as ThemePreference
    }
    // Migration from v1
    const oldKey = 'insight5.ui.theme.v1'
    const old = localStorage.getItem(oldKey)
    if (old === 'light') return 'light'
    if (old === 'dark') return 'dark'
  } catch {
    // ignore
  }
  return 'system'
}

export function saveThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // ignore
  }
}

export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
}

export function initTheme() {
  const pref = loadThemePreference()
  const resolved = resolveTheme(pref)
  applyTheme(resolved)
  return { pref, resolved }
}

// Theme display names for UI
export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  warm: 'Warm',
  olive: 'Olive',
  oliveOrange: 'Olive Orange',
  roseGold: 'Rose Gold',
}

// Theme preview colors for UI
export const THEME_PREVIEWS: Record<Exclude<ThemePreference, 'system'>, { bg: string; surface: string; accent: string }> = {
  light: { bg: '#FFFFFF', surface: '#F8F9FA', accent: '#D95D39' },
  dark: { bg: '#0B1020', surface: '#141a2a', accent: '#D95D39' },
  warm: { bg: '#F2F0ED', surface: '#FFFFFF', accent: '#D95D39' },
  olive: { bg: '#2B2A24', surface: '#383630', accent: '#9CA77A' },
  oliveOrange: { bg: '#2B2A24', surface: '#383630', accent: '#D95D39' },
  roseGold: { bg: '#2D2226', surface: '#3A2D32', accent: '#E8AB96' },
}
