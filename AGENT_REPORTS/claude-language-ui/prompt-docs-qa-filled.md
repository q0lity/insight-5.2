You are Agent Q (Docs QA). Review the proposed edits for Appendix A and Appendix C and flag any conflicts with these constraints: no client LLM keys, offline capture must never lose data, segments stored in DB with offsets, markdown export remains stable and human-editable. Suggest fixes if needed. Use ASCII only.

Proposed edits:
## Proposed Edits

**[A5 Token Language] -> Append**
```
A5.4 Timestamp Markers
- Format: `[HH:MM]` or `[HH:MM:SS]` 
- Purpose: Mark time offsets during offline capture
- Examples: `[14:32] discussed workout plan` or `[14:32:15] #weight(185)`
- Server converts to atOffsetMinutes during parsing

A5.5 Divider Markers  
- Format: `---` or `--- topic change`
- Purpose: Mark segment boundaries in multi-topic capture
- Server converts to segment breaks with atOffsetMinutes
- Optional text after `---` becomes segment label
```

**[A6 Timestamped Dividers and Segments] -> Insert before existing content**
```
A6.1 Live Capture Preview
- Display real-time transcript with best-effort markdown formatting
- Apply token language parsing for immediate visual feedback
- Preview updates continuously during capture session
- Final formatting applied after server-side parsing

A6.2 Offline Capture Storage
- Store raw text with embedded timestamp markers
- No client-side LLM processing or token resolution
- Timestamp markers: `[HH:MM]` format at natural speech breaks
- Divider markers: `---` for topic/segment boundaries
- Server processes all markers during sync to create canonical segments
```

**[A6 Timestamped Dividers and Segments] -> Append to existing content**
```
A6.4 Multi-Topic Capture Workflow
- Use `---` markers to separate distinct topics or conversation threads
- Each segment between dividers becomes separate DB entry
- Timestamp markers within segments provide sub-minute precision
- Example flow: `[14:30] #workout +gym --- [14:45] @john called about project`

A6.5 Minimal Event Previews
- Simple single-topic captures generate basic previews
- Multi-topic captures with dividers show segment breakdown
- Preview indicates pending server-side processing for final format
```

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
