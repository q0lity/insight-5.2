# Specification: ChatGPT-Style Life Planner Engine

## Overview

Transform the existing Insight chat assistant into a production-ready, ChatGPT-style life planner with multi-modal input capabilities (voice, images, documents), intelligent database querying, and automated task/event creation. The engine will enable users to interact naturally through voice, upload documents (like syllabi) and images (like workout photos) to automatically extract and create structured data, query their personal database with formatted table outputs, and engage in conversational planning that adapts to their needs.

## Workflow Type

**Type**: feature

**Rationale**: This is a significant feature enhancement that introduces new capabilities (voice input, file uploads, multi-modal AI processing) while extending existing infrastructure (OpenAI integration, chat UI, storage systems). It requires careful implementation across multiple components and involves integration with external APIs for vision and speech processing.

## Task Scope

### Services Involved
- **desktop** (primary) - Main Electron app containing the assistant view, OpenAI integration, and all storage systems
- **shared** (supporting) - Contains shared local search utilities used by the assistant

### This Task Will:
- [ ] Enhance the chat UI to a professional ChatGPT-like interface with auto-collapsing sidebar
- [ ] Add voice input capability using OpenAI Whisper API
- [ ] Add file upload capability for images and documents
- [ ] Extend OpenAI integration to support multi-modal content (vision API)
- [ ] Implement PDF text extraction for document processing
- [ ] Create intelligent data extraction from uploads (syllabus -> events, workout photos -> exercise data)
- [ ] Add database querying with formatted table output (macros, nutrition history, etc.)
- [ ] Enable conversational task/event creation with adaptive prompts
- [ ] Add confidence-based clarifying questions when data is ambiguous

### Out of Scope:
- Mobile app changes (insight-mobile)
- Landing page changes
- Backend API changes (all processing happens client-side via OpenAI API)
- Real-time collaboration features
- Third-party calendar sync (Google Calendar, etc.)

## Service Context

### Desktop (Primary Service)

**Tech Stack:**
- Language: TypeScript
- Framework: React + Vite + Electron
- Styling: Tailwind CSS
- State: React hooks + localStorage
- Database: Dexie (IndexedDB)
- Key directories: `src/workspace/views`, `src/assistant`, `src/storage`, `src/ui`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd apps/desktop
npm run dev
```

**Port:** 5174

**Key Dependencies:**
- `react-markdown` - Already installed for rendering markdown
- `remark-gfm` - Already installed for GitHub-flavored markdown (tables support)
- `@supabase/supabase-js` - Cloud sync
- `dexie` - Local IndexedDB wrapper

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/workspace/views/assistant.tsx` | desktop | Major UI overhaul - ChatGPT-style interface, add voice/upload buttons, auto-collapse sidebar, enhanced message rendering |
| `apps/desktop/src/openai.ts` | desktop | Add multimodal support (vision API), add Whisper API transcription function |
| `apps/desktop/src/assistant/storage.ts` | desktop | Add ChatMessage types for attachments (images, files), add conversation context types |
| `apps/desktop/src/ui/icons.tsx` | desktop | Add new icons: `upload`, `paperclip` (if not present) |
| `apps/desktop/package.json` | desktop | Add dependencies: `react-dropzone@^14.x`, `pdf-parse@^1.1.1` (use v1.x API, NOT v2) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/openai.ts` | OpenAI API call patterns, error handling, response extraction |
| `apps/desktop/src/storage/nutrition.ts` | Data structure patterns, estimation logic, confidence scoring |
| `apps/desktop/src/storage/calendar.ts` | Event creation patterns, date handling |
| `apps/desktop/src/storage/tasks.ts` | Task creation patterns, status management |
| `apps/desktop/src/assistant/local.ts` | Local search patterns for querying data |
| `apps/desktop/src/ui/icons.tsx` | SVG icon patterns |

## Patterns to Follow

### OpenAI API Call Pattern

From `apps/desktop/src/openai.ts`:

```typescript
export async function callOpenAiText(opts: {
  apiKey: string
  model: string
  messages: OpenAiMessage[]
  temperature?: number
  maxOutputTokens?: number
  responseFormat?: { type: 'json_object' } | null
}) {
  // Implementation handles model variations, error retry, response extraction
}
```

**Key Points:**
- Use existing `openAiApiUrl()` helper for endpoint construction
- Handle both `/v1/responses` and `/v1/chat/completions` endpoints
- Include retry logic for parameter compatibility issues
- Extract response text using the `extractResponseText()` helper

### Vision API Extension Pattern

New function to add to `openai.ts`:

```typescript
export type MultiModalContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

export type MultiModalMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | MultiModalContent[]
}

export async function callOpenAiVision(opts: {
  apiKey: string
  model: string  // gpt-4o, gpt-4o-mini, gpt-4.1-mini
  messages: MultiModalMessage[]
  maxOutputTokens?: number
}) {
  // Must use chat/completions endpoint for vision
  // Images must be base64 with proper MIME prefix: data:image/jpeg;base64,...
}
```

### Whisper API Pattern

New function to add to `openai.ts`:

```typescript
export async function callOpenAiWhisper(opts: {
  apiKey: string
  audioBlob: Blob
  language?: string  // 'en' for English
}) {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  if (opts.language) formData.append('language', opts.language)

  const res = await fetch(openAiApiUrl('/v1/audio/transcriptions'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}` },
    body: formData,
  })
  // Return transcribed text
}
```

### Data Extraction Pattern

From `apps/desktop/src/storage/nutrition.ts`:

```typescript
export function parseMealFromText(text: string, opts?: { nowMs?: number }): Partial<Meal> | null {
  // Uses regex patterns for quantity detection
  // Returns confidence scores
  // Aggregates macros from items
}
```

**Key Points:**
- Return `confidence` scores (0-1) for extracted data
- Use threshold-based decisions: high confidence (>0.85) = auto-apply, medium (0.5-0.85) = suggest with confirmation
- Aggregate totals from parsed items

### Task/Event Creation Pattern

From `apps/desktop/src/storage/tasks.ts` and `calendar.ts`:

```typescript
export async function createTask(input: {
  title: string
  status?: TaskStatus
  tags?: string[]
  dueAt?: number | null
  scheduledAt?: number | null
  // ... other fields
}): Promise<Task>

export async function createEvent(input: {
  title: string
  startAt: number
  endAt: number
  tags?: string[]
  kind?: CalendarEventKind
  // ... other fields
}): Promise<CalendarEvent>
```

### react-dropzone Pattern

New hook-based file drop zone:

```typescript
import { useDropzone } from 'react-dropzone'

// In component:
const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
  accept: {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf']
  },
  maxSize: 25 * 1024 * 1024, // 25MB
  onDrop: (acceptedFiles) => {
    // Process files
  }
})

// In JSX - MUST spread getRootProps on root element:
<div {...getRootProps()} className="dropzone">
  <input {...getInputProps()} />
  {isDragActive ? <p>Drop files here...</p> : <p>Drag & drop or click</p>}
</div>
```

**Key Points:**
- `getRootProps()` MUST be spread on the root element (not passed as props)
- `getInputProps()` creates a hidden file input
- `isDragActive` provides visual feedback during drag

### PDF Text Extraction Pattern

Using pdf-parse (v1.x API - most stable):

```typescript
import pdfParse from 'pdf-parse'

export async function extractPdfText(fileBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(fileBuffer)
  const data = await pdfParse(buffer)
  return data.text  // Full extracted text
}

// Usage with File object:
async function handlePdfUpload(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const text = await extractPdfText(arrayBuffer)
  // Send text to GPT for parsing
}
```

**Key Points:**
- Use v1.x API pattern (`pdfParse(buffer)` returns `{ text, numpages, info }`)
- Returns plain text only - no formatting preserved
- Works in both browser and Node.js environments

## Requirements

### Functional Requirements

1. **ChatGPT-Style UI**
   - Description: Professional, modern chat interface matching ChatGPT's appearance
   - Acceptance: Users see a clean, full-screen chat with auto-collapsing sidebar, message bubbles with avatars, and polished input area

2. **Voice Input**
   - Description: Microphone button for hands-free voice input using OpenAI Whisper API
   - Acceptance: User clicks mic -> records audio -> transcription appears in input -> can edit before sending

3. **File Upload**
   - Description: Upload button supporting images (PNG, JPEG, GIF, WebP) and documents (PDF)
   - Acceptance: User can drag-drop or click to upload files, preview thumbnails, and send with message

4. **Image Analysis**
   - Description: AI extracts structured data from images (workout photos, receipts, etc.)
   - Acceptance: Upload workout photo -> AI returns structured exercise data with confidence scores

5. **Document Processing**
   - Description: Parse PDFs to extract actionable data (syllabus -> events/tasks)
   - Acceptance: Upload syllabus PDF -> AI extracts deadlines, exams, assignments -> offers to create events

6. **Database Querying**
   - Description: Natural language queries return formatted table data
   - Acceptance: "What did I eat this week?" -> markdown table with dates, meals, macros

7. **Conversational Planning**
   - Description: AI suggests creating tasks/events during conversation
   - Acceptance: User discusses plans -> AI offers "Would you like me to create an event for this?"

8. **Confidence-Based Clarification**
   - Description: AI asks clarifying questions when data extraction confidence is low
   - Acceptance: Ambiguous image -> AI asks "I see what might be a bench press. Can you confirm the weight?"

### Edge Cases

1. **No OpenAI API Key** - Show helpful message with link to settings to configure key
2. **Large Audio Files (>25MB)** - Show error message suggesting shorter recordings
3. **Unsupported File Types** - Show clear error with list of supported formats
4. **Network Errors** - Retry with exponential backoff, show user-friendly error after failures
5. **Empty Transcription** - Handle Whisper returning empty/unclear results gracefully
6. **Low Confidence Extraction** - Always ask for confirmation when confidence < 0.5
7. **Sidebar State Persistence** - Remember collapsed state in localStorage

## Implementation Notes

### DO
- Follow the pattern in `openai.ts` for API calls with proper error handling
- Reuse existing `Icon` component for mic, upload icons
- Use existing `createTask()` and `createEvent()` functions from storage modules
- Use `react-markdown` with `remark-gfm` for table rendering (already installed)
- Base64 encode images with proper MIME prefix (`data:image/jpeg;base64,...`)
- Record audio as WebM (works well with MediaRecorder and Whisper)
- Show loading states during API calls (existing pattern in assistant.tsx)
- Use existing CSS variables (`--bg`, `--panel`, `--accent`, etc.) for theming

### DON'T
- Create new OpenAI wrapper - extend existing `openai.ts`
- Use Web Speech API - it's broken in Electron environments (Google blocked API key for shell environments)
- Expose API key in frontend code - always use server/main process for calls
- Skip confidence scoring - essential for user trust
- Auto-create events without user confirmation - always ask first
- Block UI during long operations - use async patterns
- Pass getRootProps() as a prop - MUST spread it directly on root element (`{...getRootProps()}`)
- Forget getInputProps() - react-dropzone requires the hidden input element

## Development Environment

### Start Services

```bash
# From project root
cd apps/desktop
npm install
npm run dev
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_OPENAI_API_KEY`: OpenAI API key for all AI features
- `VITE_OPENAI_MODEL`: Default model (gpt-4.1-mini recommended)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [ ] Chat UI matches ChatGPT-style professional appearance
2. [ ] Sidebar auto-collapses when assistant view is active
3. [ ] Voice input button works end-to-end (record -> transcribe -> display)
4. [ ] File upload button allows images and PDFs
5. [ ] Image uploads are processed via Vision API with structured extraction
6. [ ] PDF uploads extract text and offer to create events/tasks
7. [ ] Database queries return formatted markdown tables
8. [ ] AI suggests creating tasks/events during conversations
9. [ ] Low-confidence extractions prompt for user clarification
10. [ ] No console errors
11. [ ] Existing tests still pass
12. [ ] New functionality verified via browser

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Vision API function | `openai.test.ts` | Multimodal message construction, base64 encoding |
| Whisper API function | `openai.test.ts` | FormData construction, audio blob handling |
| Confidence scoring | `assistant.test.ts` | Threshold-based decision logic |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Voice to text flow | assistant ↔ OpenAI | Audio recording -> transcription -> display |
| Image analysis flow | assistant ↔ OpenAI Vision | Upload -> analysis -> structured data extraction |
| Event creation flow | assistant ↔ calendar storage | Conversation -> confirm -> event created |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Voice input | 1. Click mic 2. Speak 3. Stop | Transcribed text appears in input |
| Image upload | 1. Click upload 2. Select image 3. Send | AI describes/analyzes image |
| Syllabus processing | 1. Upload PDF 2. Review extraction 3. Confirm | Events created in calendar |
| Database query | 1. Ask "what did I eat?" 2. View response | Formatted table with nutrition data |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Assistant View | `http://localhost:5174` (navigate to Assistant) | Professional ChatGPT-like UI, input area with mic/upload buttons |
| Voice Recording | Same | Mic button shows recording state, stops cleanly |
| File Upload | Same | Drag-drop works, preview thumbnails display |
| Table Rendering | Same | Markdown tables render with proper styling |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Events created from upload | Check Dexie `events` table | New events with extracted titles/dates |
| Tasks created from conversation | Check Dexie `tasks` table | New tasks with proper status |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Voice input works reliably (5+ test recordings)
- [ ] Image upload works for JPEG, PNG, WebP
- [ ] PDF upload extracts text correctly
- [ ] No regressions in existing assistant functionality
- [ ] Code follows established patterns (openai.ts, storage modules)
- [ ] No security vulnerabilities (API key not exposed in frontend)
- [ ] UI is responsive and polished
- [ ] Loading states display during API calls
- [ ] Error messages are user-friendly

## Technical Architecture Notes

### Audio Recording Flow
```
User clicks mic -> MediaRecorder API captures WebM audio
-> Blob sent to Whisper API -> Transcription returned
-> Text inserted into input field
```

### Image Processing Flow
```
User uploads image -> Base64 encode with MIME prefix
-> Send to Vision API with extraction prompt
-> Parse structured response -> Display with confidence
-> If high confidence, offer to create entities
```

### Document Processing Flow
```
User uploads PDF -> pdf-parse extracts text
-> Send text to GPT with extraction prompt
-> Parse dates, assignments, deadlines
-> Present as list with checkboxes -> Create selected as events/tasks
```

### Database Query Flow
```
User asks natural language question -> Detect query intent
-> Call appropriate storage functions (getMealsByDateRange, etc.)
-> Format response as markdown table -> Render with remark-gfm
```
