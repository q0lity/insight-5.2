import assert from 'node:assert/strict'
import { parseCaptureWithBlocks } from '../src/nlp/natural'
import { buildNotesFromTranscript } from '../src/notes/parse-session'
import { buildNotesTableMarkdown } from '../src/ui/markdown-editor'

const now = Date.now()

const moodBlocks = parseCaptureWithBlocks('I am not feeling great today.', now)
const moodTracker = moodBlocks.blocks[0]?.trackers.find((t) => t.key === 'mood')
assert(moodTracker, 'Expected mood tracker to be inferred')
assert(Math.round(moodTracker.value) === 3, `Expected mood 3 for negation, got ${moodTracker?.value}`)

const existingOutline = ['## Running outline', '- Keep this line'].join('\n')
const merged = buildNotesFromTranscript({
  existingMarkdown: existingOutline,
  transcript: '[09:00] Coding Insight right now.',
  anchorMs: now,
  title: 'Coding Insight',
})
assert(merged.includes('## Running outline'), 'Expected running outline section to be preserved')
assert(merged.includes('- Keep this line'), 'Expected running outline content to be preserved')
const noDupes = buildNotesFromTranscript({
  existingMarkdown: merged,
  transcript: 'Coding Insight right now.',
  anchorMs: now,
  title: 'Coding Insight',
})
const noteEntries = noDupes.split('\n').filter((line) => line.startsWith('### — — Note'))
assert(noteEntries.length === 0, 'Expected no placeholder live note entry')

const focus = buildNotesFromTranscript({
  existingMarkdown: '',
  transcript:
    "I'm working on the UI fixes. I'm working on the parsing fixes. I'm working on the transcription fixes, and I'm working on the mobile app.",
  anchorMs: now,
  title: 'Focus',
})
assert(focus.includes('Working On'), 'Expected working-on section')
assert(focus.includes('▶ UI fixes') && focus.includes('▶ parsing fixes') && focus.includes('▶ transcription fixes'), 'Expected working-on tasks with play marker')
assert(focus.includes('#ui') && focus.includes('#parsing') && focus.includes('#transcription') && focus.includes('#mobile'), 'Expected tags from working-on items')

const fallbackTime = buildNotesFromTranscript({
  existingMarkdown: '',
  transcript: "I'm working on the UI fixes.",
  anchorMs: Number.NaN,
  title: 'Fallback',
})
assert(!fallbackTime.includes('NaN:NaN'), 'Expected time fallback when anchorMs is invalid')

const structured = buildNotesFromTranscript({
  existingMarkdown: '',
  transcript: [
    'Section: Health & Routine Optimization',
    'Date: 2025-04-26',
    'Tags: #health #routine #fitness',
    'Subsection: Morning Routine',
    'Tasks:',
    '- Schedule morning workout before baby wakes',
    '- Include sauna in routine',
    '---',
    'Section: Moving & New Location Planning',
    'Date: 2025-04-26',
    'Tags: #move #housing #prep',
    'Tasks: Create housing shortlist; Build shortlist in Google Sheets',
  ].join('\n'),
  anchorMs: now,
  title: 'Outline',
})
assert(structured.includes('⏱'), 'Expected timestamped sections')
assert(structured.includes('### 🔹 Morning Routine'), 'Expected subsection heading')

const inlineTimes = buildNotesFromTranscript({
  existingMarkdown: '',
  transcript: 'At 09:12 I need to call John. At 10:05 I worked on financial tutoring planning.',
  anchorMs: now,
  title: 'Inline Times',
})
assert(inlineTimes.includes('⏱ 09:12'), 'Expected 09:12 entry')
assert(inlineTimes.includes('⏱ 10:05'), 'Expected 10:05 entry')

const table = buildNotesTableMarkdown('Email @Alex about the report #work', 'all')
assert(table.includes('| Area | Task | Assignee | Contact | Scheduled | Due | Priority |'), 'Expected table header')
assert(table.split('\n').length >= 3, 'Expected at least one table row')

const multi = parseCaptureWithBlocks('I need to buy groceries. Feeling stressed #mood[3].', now)
assert(multi.blocks[0]?.trackers.length, 'Expected tracker in multi-facet block')
assert(multi.blocks[0]?.tasks.length, 'Expected task in multi-facet block')

console.log('notes-tests: ok')
