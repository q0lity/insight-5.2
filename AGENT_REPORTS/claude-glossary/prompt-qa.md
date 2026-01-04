You are Agent Q (Glossary QA). Read the draft glossary provided in the prompt and check for inconsistencies with the context. Flag any term definitions that imply schema fields not listed or conflict with the PRD. Provide corrections if needed. Use ASCII only.

Context (same as for Agent G):
- Entry is atomic record with facets note|task|event|habit|tracker; has title, timestamps, tokens (tags/contexts/people), optional difficulty/importance/durationMinutes.
- entries table includes start_at/end_at/duration_minutes, body_markdown, frontmatter, source.
- entry_segments include note/divider/transcript.
- entities table includes tag/person/place types.
- tracker_definitions + tracker_logs, habit_definitions + habit_instances.
- external_event_links maps entries to external calendar events.

Draft glossary:
{{GLOSSARY_DRAFT}}

Output format:
- Heading: "## QA Notes".
- Bullets: issue + suggested fix (if any).
