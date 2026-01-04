## QA Notes

- **Context token definition conflict**: The glossary defines "Context" as a token type for situational information, but the PRD context lists "contexts" alongside "tags" and "people" as separate token categories. The schema appears to treat contexts as entities similar to tags/people/places rather than a distinct token type.

- **Missing schema field implications**: Several undefined terms (Block, Goal, Project, Media) are flagged as "Not defined in the provided context" but their inclusion in the glossary implies they may be planned schema additions not reflected in the current context.

- **Segment definition accuracy**: The definition correctly lists the three segment types (note/divider/transcript) and mentions timestamps, which aligns with the entry_segments schema.

- **Entry definition completeness**: The definition accurately reflects the schema fields including facets, timestamps, tokens, and optional scoring attributes (difficulty/importance/durationMinutes).

- **Tracker/Habit definitions accurate**: Both definitions correctly describe the two-table structure (definitions + logs/instances) and optional entry linking.

- **Entity types correctly identified**: Person, Place, and Tag definitions properly identify them as entity types in the cross-device vocabulary system.

- **Triple Title Rule**: No conflicts detected with the provided context - this appears to be a formatting convention that doesn't contradict any schema requirements.

**Suggested fix for Context definition**: Revise to clarify that contexts are entity-like tokens similar to tags, people, and places, rather than describing them as a separate "token type."
