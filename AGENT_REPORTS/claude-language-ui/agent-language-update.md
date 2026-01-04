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
