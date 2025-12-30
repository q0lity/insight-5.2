export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'insight5.ui.theme.v1'
export const THEME_CHANGED_EVENT = 'insight5.theme.changed'

export function getSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
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
