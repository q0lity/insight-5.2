# Insight 5 — UI Style Guide (MVP)

This guide adapts the “Gemini Vibe Design” UX principles for Insight 5’s desktop app (`Insight 5/apps/desktop/`).

## Principles (non-negotiable)
- Content-first layouts; avoid decorative chrome.
- Breathable whitespace; consistent spacing + alignment.
- Subtle accents for hierarchy (not “colored sheets”).
- Progressive disclosure; don’t show controls that don’t work.
- Calm feedback; prefer lightweight status text/skeletons over spinners.
- Accessibility: high-contrast text, large tap targets, keyboard-friendly.

## Design Tokens (implementation)
Use existing CSS variables in `Insight 5/apps/desktop/src/App.css`:
- Surfaces: `--panel`, `--panel2`, `--glass2`, `--glass3`
- Borders: `--border`, `--border2`
- Text: `--text`, `--muted`
- Accent: `--accent`

## Layout + Alignment
- Side panels (Vault / Details) are fixed-width; center content uses a single consistent inset.
- Timelines/grids: borders align vertically across panes; avoid “hanging” bottom edges.
- Tracker lane: icon-only marks on a single vertical line, right-aligned to the calendar view.

## Components
- Buttons: pill-ish corners, clear hover/active states, no heavy gradients.
- Inputs: neutral backgrounds, minimal border weight, focused states use `--accent`.
- Cards: neutral surface + soft shadow; avoid tinted backgrounds unless conveying state.

## Motion (MVP)
- Prefer quick, subtle transitions (150–250ms) for tabs/modals.
- Avoid spinners; use inline status text for async steps.

