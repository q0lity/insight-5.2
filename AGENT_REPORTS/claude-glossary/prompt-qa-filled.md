You are Agent Q (Glossary QA). Read the draft glossary provided in the prompt and check for inconsistencies with the context. Flag any term definitions that imply schema fields not listed or conflict with the PRD. Provide corrections if needed. Use ASCII only.

Context (same as for Agent G):
- Entry is atomic record with facets note|task|event|habit|tracker; has title, timestamps, tokens (tags/contexts/people), optional difficulty/importance/durationMinutes.
- entries table includes start_at/end_at/duration_minutes, body_markdown, frontmatter, source.
- entry_segments include note/divider/transcript.
- entities table includes tag/person/place types.
- tracker_definitions + tracker_logs, habit_definitions + habit_instances.
- external_event_links maps entries to external calendar events.

Draft glossary:
## Canonical Glossary

- **Entry**: The atomic record produced by voice or manual input, containing a title, one or more facets (note, task, event, habit, tracker), timestamps, and optional metadata like tags, people, contexts, and scoring attributes.

- **Segment**: A timestamped divider, note, or transcript fragment within an entry that provides additional structure and detail to the entry's content.

- **Block**: Not defined in the provided context.

- **Task**: A facet type of an entry representing an actionable item with optional difficulty, importance, and duration metadata for scoring and prioritization.

- **Tracker**: A measurement system consisting of tracker definitions (value type and bounds) and timestamped tracker logs that can optionally link to entries for context.

- **Habit**: A recurring behavior system with habit definitions containing settings and habit instances that log timestamped completions, optionally linked to entries.

- **Goal**: Not defined in the provided context.

- **Project**: Not defined in the provided context.

- **Person**: An entity type in the cross-device vocabulary representing individuals, referenced as tokens within entries and normalized per user.

- **Place**: An entity type in the cross-device vocabulary representing locations, referenced as tokens within entries and normalized per user.

- **Tag**: An entity type in the cross-device vocabulary used for categorization and labeling, referenced as tokens within entries and normalized per user.

- **Context**: A token type used within entries to provide situational or categorical information, part of the language contract between voice, UI, and database.

- **Media**: Not defined in the provided context.

- **Transcript**: A segment type containing voice-to-text conversion content within an entry, providing timestamped spoken input capture.

## Triple Title Rule

The triple title rule structures entry titles using a category/subcategory/title format to provide hierarchical organization and consistent naming conventions.

Examples:
- Work/Meetings/Daily Standup
- Health/Exercise/Morning Run


Output format:
- Heading: "## QA Notes".
- Bullets: issue + suggested fix (if any).
