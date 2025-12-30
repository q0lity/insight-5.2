# LOGGING_FORMAT (v1)

This spec defines the logging grammar for Insight 5. It is deterministic, works offline, and maps directly to `SUPABASE_SCHEMA_V1.sql` fields.

## Goals
- One capture produces structured fields every time.
- YAML frontmatter and inline tokens can be mixed.
- Output aligns to the DB schema (entries, tracker_logs, habit_instances).

## Supported Input Forms
1. YAML frontmatter + markdown body.
2. Plain text with tokens.
3. Mixed: frontmatter + tokens (frontmatter wins on conflicts).

## Frontmatter Keys (authoritative)
Required or common fields (camelCase):
- `title`
- `facets` (array, e.g. ["event","task"])
- `startAt`, `endAt` (ISO-8601)
- `durationMinutes` (number)
- `tags` (array)
- `people` (array)
- `contexts` (array)
- `location` (string)
- `category`, `subcategory`
- `importance`, `difficulty` (1-10)
- `goal`, `project`
- `trackers` (array of objects: `{key, value, unit}` optional)

Example:
```yaml
---
title: "Clinic rounds"
facets: ["event","note"]
startAt: "2025-12-08T08:00:00-05:00"
endAt: "2025-12-08T12:00:00-05:00"
tags: ["work/clinic","inpatient"]
people: ["Dr Smith"]
category: "Work"
subcategory: "Clinic"
importance: 8
difficulty: 6
---
```

## Inline Token Grammar
- `#tag` -> tags (supports hierarchy: `#work/clinic`)
- `#tracker(value)` or `#tracker:value` -> tracker logs
- `@person` -> people (multi-word allowed in quotes: `@"Dr Smith"`)
- `+context` -> contexts (Nomie style)
- `~45m`, `~1h30m` -> duration override
- `!8` -> importance (1-10)
- `^6` -> difficulty (1-10)
- `$12.50` -> money signal (optional tag `#money`)

Example:
`Clinic rounds #work/clinic @DrSmith +hospital ~4h !8 ^6`

## Normalization Rules
- Frontmatter overrides tokens and heuristics.
- Tags are lowercased and stored with `#` removed in entity keys, but events store tags as `#tag`.
- `#tracker(value)` tokens do NOT become tags; they become tracker logs.
- First hierarchical tag (`#category/subcategory`) sets `category` + `subcategory` if not explicitly set.
- If `category` missing, infer from tags/keywords using the starter taxonomy.
- If `durationMinutes` missing but `startAt`/`endAt` present, compute it.
- If time range crosses midnight, `endAt` is next day.

## Taxonomy Sources
- Auto: keyword + tag heuristics mapped into the starter taxonomy.
- Manual: edit `Insight 5/apps/desktop/src/taxonomy/starter.ts` or set `#category/subcategory` and/or frontmatter to override.

## Points
Points are derived (not manually entered):
`points = durationHours * importance * difficulty`
Where `durationHours = durationMinutes / 60`.

## Edge Cases
- If both frontmatter and body provide a value, frontmatter wins.
- If no time range is provided, use capture anchor time with `~duration` or default estimate.
- If `importance` or `difficulty` is missing, default to `5`.
- Ignore `@` mentions inside emails and URLs.
- Multiple categories: first wins, others remain tags.

## Output Mapping (DB)
- `entries.tags` <- `#tag` list
- `entries.people` <- `@person` list
- `entries.contexts` <- `+context` list
- `entries.category/subcategory` <- explicit or inferred
- `entries.importance/difficulty/duration_minutes` <- tokens/frontmatter
- `tracker_logs` <- `#tracker(value)` tokens
