You are Agent G (Glossary). Use ONLY the context below and do not invent fields not supported by it. Task: draft a canonical glossary in Markdown that defines these entity types: Event, Segment, Block, Task, Tracker, Habit, Goal, Project, Person, Place, Tag, Context, Media, Transcript. Also define the "triple title" rule (category/subcategory/title) and give 1-2 examples. Keep definitions concise and consistent with the PRD. Use ASCII only.

Context:
- Master PRD v3: Entry is the atomic record produced by voice/manual input and can have facets: note, task, event, habit, tracker. Entry has title, facets, timestamps (start/end or createdAt), tags/contexts/people tokens, optional difficulty/importance/durationMinutes for scoring. Timeline, calendar, and views rely on entries.
- Data Dictionary (Appendix F):
  - entries: facets[] includes note|task|event|habit|tracker; start_at/end_at/duration_minutes; body_markdown and frontmatter; source; embedding.
  - entry_segments: timestamped dividers/notes within an entry; segment_type note|divider|transcript.
  - entities: cross-device vocabulary for tag/person/place; type tag|person|place; key is normalized per user+type.
  - tracker_definitions + tracker_logs: tracker definition (value_type, bounds); tracker logs are timestamped values, optional link to entry.
  - habit_definitions + habit_instances: habit settings and timestamped completion/logs, optionally linked to an entry.
  - external_event_links: maps entries to external calendar events (provider, external_event_id, etag).
- Language spec references a "language" contract between voice, UI, and database; tokens include tags, people, contexts, places; markdown-first entry detail with segments/dividers.
- Offline capture uses pending captures then parsing into entries and segments (ARCH/OFFLINE_CAPTURE).

Output format:
- Heading: "## Canonical Glossary".
- Bulleted list with bold term names and 1-2 sentence definitions.
- Heading: "## Triple Title Rule" with a short definition and 1-2 examples.
