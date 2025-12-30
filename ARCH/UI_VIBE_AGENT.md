# Insight 5 — UI Vibe Agent (Aesthetic + UX Rules)

This is the “design QA” contract for desktop UI changes. Any UI work should be checked against these rules before shipping.

## Non‑Negotiables

- **Alignment first**: borders, dividers, and content baselines must line up across columns/panes; no “almost aligned” 1–3px drift.
- **Breathable density**: prefer fewer, clearer elements over packed controls; use negative space intentionally.
- **Consistent hierarchy**: title → section label → control → helper text; don’t invent new weights/sizes per screen.
- **Systematic spacing**: use a small spacing scale (4/8/12/16/24/40) and stick to it.
- **Subtle accents**: accent color is reserved for primary actions, selection states, and key indicators (not decoration).
- **State clarity**: hover/active/selected/disabled states are obvious, consistent, and low-latency.
- **Progressive disclosure**: advanced fields stay hidden until relevant (e.g., only show workout sections after “Workout” is detected/selected).
- **Accessibility**: maintain readable contrast and keyboard reachability for primary flows.

## Layout Rules (Desktop)

- **Equal gutters**: major surfaces (left sidebar / center / right details) should feel balanced; avoid “dead whitespace” on one side.
- **Hard edges match**: if two surfaces stack vertically, their bottom edges should end at the same y unless intentionally staggered.
- **Dividers are purposeful**: use 1px borders or subtle separators; avoid double borders (border + divider line).

## Timeline / Calendar Rules

- **Grid continuity**: hour grid lines extend through every column (time labels, main grid, tracker lane).
- **Right‑lane anchoring**: tracker dots must sit *on* the tracker lane; pills should be consistently offset from the lane.
- **Collision behavior**: overlapping trackers never cover each other; they offset predictably (stacking), not randomly.

## Interaction Rules

- **Primary flows are one-click**: “capture → save → see it placed” should feel immediate and obvious.
- **Editing is local**: when you change a field in the right sidebar, it updates the selected item instantly (no hidden save).
- **Previews build trust**: any parser/generator output (Markdown, extracted tokens) should be visible and inspectable.

## Definition of Done (UI)

Before calling a UI change “done”, verify:

- No misaligned borders/dividers between panes
- No unexpected extra right/left whitespace in the main layout
- Timeline rows align to the last visible hour
- Tracker dots visually intersect the lane line
- New UI has complete hover/active/disabled states

