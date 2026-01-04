You are Agent R (PRD QA). Read the proposed PRD update and check for conflicts with existing PRD constraints (offline capture, no client LLM keys, segments/dividers). Flag any inconsistencies and suggest fixes. Use ASCII only.

Proposed update:
Based on the context provided, here are my proposed edits to MASTER_PRD_V3.md:

## Section 5: Language: Markdown + YAML + Tokens
**Insert after existing content:**
• Web UI is the authoritative interface design; desktop mirrors web functionality
• Mobile UI adapts to match all web features with touch-optimized patterns
• During capture: live markdown writing for multi-topic sessions, minimal event logging for simple commands
• Capture sessions use dividers/segments inserted in real-time markdown stream

## Section 6: Voice + MCP-Style Command Interface  
**Insert after existing content:**
• Mobile capture UX is highest development priority for feature parity
• Command detection determines logging strategy: full markdown vs minimal events

## Section 7: Screens & Navigation
**Insert after existing content:**
• Mobile navigation must provide equivalent access to all web UI features
• Capture interface prioritized for mobile optimization and responsiveness

## Section 16: Detailed User Flows (Quick Log)
**Insert after existing content:**
• Mobile Quick Log flow mirrors web behavior with touch adaptations
• Live markdown generation during extended capture sessions
• Automatic segment insertion for topic transitions in multi-part captures

These edits establish web UI primacy, ensure mobile feature parity, and clarify the live markdown capture behavior while maintaining the existing ASCII-only, concise documentation style.

