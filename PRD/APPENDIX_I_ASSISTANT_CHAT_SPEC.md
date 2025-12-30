# Appendix I — Assistant / “Ask Insight” Chat Screen

## I.1 Purpose

Provide a ChatGPT-style interface that can:
- **Search and summarize** the user’s own data (notes, tasks, events, habits, trackers).
- **Create/update** items via conversational commands (MCP-style).
- **Ask clarifying questions** and emit review cards when uncertain.

The Assistant must be **privacy-forward**: default to local/on-device operations, and be explicit when sending data off-device.

## I.2 Modes

1) **Local Search (default)**
- Uses on-device indexes and cached Supabase rows.
- Never sends user data to an external LLM.

2) **LLM Answering (optional)**
- Uses a user-provided API key or a server-side proxy (recommended).
- Sends only the minimum necessary context (retrieval snippets + user prompt).

## I.3 Retrieval (RAG) Requirements (MVP)

- Index sources:
  - Inbox captures (raw transcript text)
  - Entries (title/body/segments)
  - Tasks (title/notes/dates/tags)
  - Trackers (name/value/time)
- Filters:
  - time range (“yesterday”, “last week”, “in October”)
  - facets/tags/people/context tokens
- Output:
  - answer + linked sources (tap → open details panel)
  - optional “Suggested Task/Event” cards when the answer implies creation

## I.4 Action Layer

Assistant can propose actions, but must not silently mutate data:
- “Create task …” → show a confirmation card
- “Schedule … tomorrow at 3” → show a calendar preview card
- “Log mood 8” → show tracker card and one-tap confirm

## I.5 Key Management

Preferred:
- Store third-party API keys **server-side** (Supabase Vault / Edge Function secrets) and call via Edge Function.

Acceptable for developer builds:
- Store user key locally (Keychain/Keystore). Avoid plain-text files for production.

## I.6 UI Requirements

- Left nav includes **Assistant**.
- Layout:
  - message list (user/assistant bubbles)
  - composer at bottom (supports `/commands`)
  - mode toggle: Local / LLM
  - “Search results” panel inline (cards with timestamps + tags)

