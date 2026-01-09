export function normalizeEntityKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalizePatternKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}
