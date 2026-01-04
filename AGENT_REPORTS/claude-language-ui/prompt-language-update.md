You are Agent L (Language Spec update). Use ONLY the context below. Task: propose concise edits to APPENDIX_A_LANGUAGE_SPEC.md to support live capture markdown preview, offline-safe timestamp markers, and divider insertion for multi-topic capture. Provide exact insertion points by section heading, and proposed text. Keep ASCII only.

Context (current Appendix A excerpts):
- A6 Timestamped Dividers and Segments: segments stored in DB with atOffsetMinutes; markdown export shows timestamps and dividers.
- A5 Token Language: trackers (#key(value)), context (+gym), person (@john), tags (health/fitness).
- Offline capture rule in PRD: no client LLM keys; offline capture must never lose data; parsing happens server-side.
- Master PRD v3: live capture should show best-effort markdown preview; offline logs raw text with timestamp markers; canonical formatting finalized after server-side parsing.

Required additions:
- Live capture preview: show transcript + best-effort markdown in real time.
- Offline capture: store raw text + timestamp markers; dividers/segments finalized post-sync.
- Simple commands should generate minimal event previews; multi-topic capture uses divider/segment markers.

Deliverable format:
- Heading: "## Proposed Edits".
- Bullets with: [Section Heading] -> [Insert/Append], then the exact text to add.
