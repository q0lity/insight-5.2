## Proposed Edits

Based on the platform governance principles (web UI as source of truth, mobile adaptation, mobile capture priority), here are the specific edits:

• **[C1) Global Style Requirements]** -> **Append**:
```
- Platform governance: Web UI is the authoritative design source; desktop and mobile adapt to match core web patterns.
- Mobile capture experience receives highest design priority for touch and voice interactions.
```

• **[C2) Navigation (Confirmed)]** -> **Insert after "Right bar: context panel..."**:
```

Mobile adaptations:
- Left bar collapses to hamburger menu
- Underbar remains persistent for primary actions
- Right panel becomes modal/drawer for context
- Touch-first capture flows prioritized over desktop patterns
```

• **[C3) Core Components Inventory]** -> **Insert after "Heatmap Card (GitHub-style)"**:
```
- Mobile Capture Bar (voice/photo/quick text with gesture shortcuts)
- Adaptive Layout Container (responsive grid that maintains web component hierarchy)
```

• **[C5) Screen-Level Requirements (MVP)]** -> **Insert new subsection after "Views" section**:
```

### Mobile Capture Priority
- Voice capture: single-tap activation from any screen
- Photo capture: immediate processing with voice annotation
- Quick text: swipe-up gesture from underbar
- All capture flows maintain feature parity with web UI
```

• **[C6) "Beautiful by Default"]** -> **Append**:
```
- Responsive breakpoints that preserve web UI component relationships
- Mobile-specific micro-animations for capture feedback
- Cross-platform design tokens ensure visual consistency
```
