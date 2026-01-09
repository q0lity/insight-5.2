export const CHARACTER_KEYS = ['STR', 'INT', 'CON', 'PER'];
export const CATEGORY_SHORTCUTS = ['Work', 'Health', 'Personal', 'Learning', 'Transport', 'Finance'];
export const SUBCATEGORY_SHORTCUTS: Record<string, string[]> = {
  Work: ['Clinic', 'Surgery', 'Admin', 'Meeting'],
  Health: ['Workout', 'Sleep', 'Nutrition'],
  Personal: ['Errands', 'Morning Routine', 'Family'],
  Learning: ['Reading', 'Practice', 'Study'],
  Transport: ['Driving', 'Transit', 'Flight'],
  Finance: ['Budget', 'Bills', 'Banking'],
};

export function uniqStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function parseCommaList(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseTagList(raw: string) {
  const out: string[] = [];
  for (const match of raw.matchAll(/#?([a-zA-Z][\\w/-]*)/g)) {
    out.push(match[1].toLowerCase());
  }
  return out;
}
