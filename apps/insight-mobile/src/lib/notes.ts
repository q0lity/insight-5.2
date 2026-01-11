export function firstLine(text: string) {
  return (text.split(/\r?\n/)[0] ?? '').trim().slice(0, 60) || 'Untitled';
}

export function extractTags(text: string): string[] {
  const matches = text.match(/(^|[\s(])#([a-zA-Z][\w/-]*)/g) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

export function extractPeople(text: string): string[] {
  const matches = text.match(/(^|[\s(])@([a-zA-Z][\w/-]*)/g) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

export function extractPlaces(text: string): string[] {
  const matches = text.match(/(^|[\s(])!([a-zA-Z][\w/-]*)/g) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

export function getPreview(text: string) {
  const lines = text.split('\n').slice(1).join(' ').trim();
  if (!lines) return '';
  return lines.slice(0, 80) + (lines.length > 80 ? '...' : '');
}

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function formatRelativeDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
