# Backend + API + Auth Design Specification

**Document**: 03-backend-api-auth-spec-2026-01.md
**Date**: 2026-01-18
**Author**: insight52/polecats/keeper (AI Agent)
**Status**: Complete

---

## 1. Executive Summary

InSight is a voice-first life-tracking application built on Supabase. This specification documents the backend architecture, REST API design, authentication flows, and edge function patterns that power the application.

### Key Architecture Decisions
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Authentication**: Supabase Auth (JWT) + OAuth2 for calendar integrations
- **API Style**: REST via Supabase auto-generated API + custom Edge Functions
- **AI Integration**: Claude (Anthropic) for voice parsing and intelligent assistance
- **Push Notifications**: Apple Push Notification service (APNs) via Edge Functions

---

## 2. Database Schema Overview

### 2.1 Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User settings and preferences | `timezone`, `settings` (JSONB) |
| `entries` | Atomic logs (tasks, events, notes, habits) | `facets[]`, `status`, `tags[]`, `embedding` (vector) |
| `goals` | User goals with importance scoring | `importance` (1-10), `archived` |
| `projects` | Projects linked to goals | `status`, `goal_id` FK |
| `tracker_definitions` | User-defined tracker types | `key`, `value_type`, `min/max_value` |
| `tracker_logs` | Tracker data points | `value_numeric/text/bool`, `occurred_at` |
| `habit_definitions` | User-defined habits | `schedule` (JSONB), `importance` |
| `habit_instances` | Habit completion logs | `entry_id` FK, `value_numeric` |
| `workout_sessions` | Workout containers | `template` (strength/cardio/mobility) |
| `workout_rows` | Exercise sets/reps/weights | `exercise`, `reps`, `weight`, `rpe` |
| `nutrition_logs` | Nutrition data | `calories`, `protein_g`, macros |
| `timers` | Live Activity timers | `kind` (countdown/stopwatch/pomodoro), `state` |
| `attachments` | Storage pointers | `bucket`, `path`, `mime_type` |
| `saved_views` | Dashboard configurations | `view_type`, `query` (JSONB) |

### 2.2 Integration Tables

| Table | Purpose |
|-------|---------|
| `external_accounts` | OAuth tokens for Google/Microsoft |
| `external_event_links` | Calendar event mappings |
| `device_tokens` | APNs device tokens for push notifications |
| `entities` | Tag/person/place lookup cache |

### 2.3 Join Tables

| Table | Relationship |
|-------|--------------|
| `entry_goals` | entries ↔ goals (M:N) |
| `entry_projects` | entries ↔ projects (M:N) |
| `entry_segments` | Timestamped notes within entries |

---

## 3. Authentication Architecture

### 3.1 Primary Authentication (Supabase Auth)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│ Supabase Auth │────▶│   Database   │
│ (iOS/Web)   │     │   (JWT)       │     │  (RLS)       │
└─────────────┘     └──────────────┘     └──────────────┘
```

**Flow**:
1. User signs in via Supabase Auth (email/password, magic link, or social)
2. Client receives JWT access token + refresh token
3. All API requests include `Authorization: Bearer <jwt>`
4. RLS policies enforce `auth.uid() = user_id` on all tables

**JWT Configuration** (from `config.toml`):
```toml
[auth]
jwt_expiry = 3600  # 1 hour
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = false
```

### 3.2 OAuth2 Integration (Calendar Providers)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│ OAuth Flow   │────▶│ Edge Function│
│             │     │ (Google/MS)  │     │ (exchange)   │
└─────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │external_accts│
                                        │(encrypted)   │
                                        └──────────────┘
```

**Supported Providers**:
- Google (Calendar API + OAuth2)
- Microsoft (Graph API + OAuth2)

**Token Security**:
- Tokens encrypted with AES-GCM before storage
- Encryption key: `OAUTH_TOKEN_SECRET` environment variable
- Format: `{iv_base64}:{ciphertext_base64}`

**OAuth Exchange Flow**:
```typescript
// POST /functions/v1/google_oauth_exchange
// POST /functions/v1/microsoft_oauth_exchange
{
  "code": "authorization_code_from_redirect",
  "redirectUri": "https://app.insight.dev/oauth/callback"
}

// Response
{
  "status": "ok",
  "provider": "google",
  "expiresAt": "2026-01-18T15:00:00Z"
}
```

### 3.3 Token Refresh Strategy

OAuth tokens are automatically refreshed:
- Check if `expires_at < now() + 5 minutes`
- If expired, call provider's token refresh endpoint
- Update encrypted tokens in `external_accounts`
- Proceed with original request

---

## 4. REST API Design

### 4.1 Supabase Auto-Generated API

All tables are accessible via Supabase PostgREST:

```
Base URL: https://oaywymdbbhhewppmpihr.supabase.co/rest/v1/
Headers:
  - Authorization: Bearer <jwt>
  - apikey: <anon_key>
  - Content-Type: application/json
```

**Common Operations**:

| Operation | Method | Endpoint | Example |
|-----------|--------|----------|---------|
| List | GET | `/entries?select=*` | `?facets=cs.{task}&status=eq.open` |
| Create | POST | `/entries` | `{ "title": "...", "facets": ["task"] }` |
| Update | PATCH | `/entries?id=eq.<uuid>` | `{ "status": "done" }` |
| Delete | DELETE | `/entries?id=eq.<uuid>` | Soft delete via `deleted_at` |
| RPC | POST | `/rpc/<function_name>` | Custom PostgreSQL functions |

**Query Operators**:
- `eq.` - Equals
- `neq.` - Not equals
- `gt./gte.` - Greater than
- `lt./lte.` - Less than
- `cs.` - Contains (arrays)
- `ov.` - Overlaps (arrays)
- `is.` - Is null/not null
- `order` - Sort results
- `limit/offset` - Pagination

### 4.2 Custom Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `claude_agent` | POST | AI assistant interactions |
| `google_calendar_sync` | POST | Sync Google Calendar events |
| `google_oauth_exchange` | POST | Exchange OAuth code for tokens |
| `microsoft_calendar_sync` | POST | Sync Microsoft Calendar events |
| `microsoft_oauth_exchange` | POST | Exchange OAuth code for tokens |
| `send_push_notification` | POST | Send APNs push to user devices |
| `transcribe_and_parse_capture` | POST | Transcribe audio + extract entities |

---

## 5. Edge Function Specifications

### 5.1 Claude Agent (`/functions/v1/claude_agent`)

**Purpose**: AI-powered assistant for voice parsing and intelligent interactions.

**Request**:
```typescript
POST /functions/v1/claude_agent
Authorization: Bearer <jwt>

{
  "prompt": "string",           // User input (text or transcription)
  "context": {                  // Optional context
    "active_entry_id": "uuid",
    "active_goal_ids": ["uuid"],
    "active_project_ids": ["uuid"],
    "user_timezone": "America/New_York"
  },
  "stream": false               // Streaming not yet implemented
}
```

**Response**:
```typescript
{
  "response": "string",         // AI response text
  "tool_calls": [               // Tools executed
    {
      "name": "create_entry",
      "input": { ... },
      "result": { ... }
    }
  ],
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567
  },
  "container_id": "string"      // For session continuity
}
```

**Available Tools** (38 total):

*Always Loaded (3)*:
- `get_current_context` - Fetch user's current state
- `parse_voice_capture` - Extract trackers/tasks from text
- `quick_log` - Fast logging for single items

*Deferred (35)*:
- Entry CRUD: `query_entries`, `create_entry`, `update_entry`, `delete_entry`, `bulk_update_entries`
- Trackers: `batch_log_trackers`, `query_tracker_logs`, `create_tracker_definition`, `aggregate_tracker_data`
- Workouts: `log_workout`, `query_workouts`
- Nutrition: `log_nutrition`, `query_nutrition`
- Goals: `list_goals`, `create_goal`, `update_goal_progress`
- Projects: `list_projects`, `create_project`, `link_entry_to_project`
- Search: `semantic_search`, `search_by_tags`
- Analytics: `get_daily_summary`, `get_streak_stats`, `calculate_xp`
- Calendar: `get_scheduled_entries`

**Architecture**:
- Model: `claude-sonnet-4-5-20250929`
- Max iterations: 10 (agentic loop)
- Beta header: `advanced-tool-use-2025-11-20`
- Supports Tool Search and Code Execution server tools

### 5.2 Calendar Sync Functions

**Google Calendar Sync** (`/functions/v1/google_calendar_sync`):

```typescript
POST /functions/v1/google_calendar_sync
Authorization: Bearer <jwt>

{
  "calendarId": "primary",      // Optional, defaults to "primary"
  "scopeStartMs": 1705536000000, // Optional, defaults to today
  "scopeEndMs": 1737072000000    // Optional, defaults to +1 year
}
```

**Response**:
```typescript
{
  "pulled": 5,      // Events imported from Google
  "pushed": 2,      // Events exported to Google
  "conflicts": 0,   // Near-simultaneous edits
  "lastSyncAt": 1705622400000
}
```

**Sync Logic**:
1. Fetch external events from Google Calendar API
2. Fetch local entries with `facets: ["event"]`
3. For each external event:
   - If cancelled → soft delete local entry
   - If linked + external newer → update local
   - If linked + local newer → update external
   - If not linked → create local entry + link
4. For each unlinked local entry:
   - Create external event + link

**Microsoft Calendar Sync** (`/functions/v1/microsoft_calendar_sync`):
- Same interface and logic
- Uses Microsoft Graph API
- `calendarView` endpoint for recurring events

### 5.3 Transcribe and Parse Capture

**Purpose**: Audio transcription + entity extraction from voice captures.

```typescript
POST /functions/v1/transcribe_and_parse_capture
Authorization: Bearer <jwt>

{
  "captureId": "uuid",          // Entry ID for the capture
  "audioBucket": "attachments", // Optional, defaults to "attachments"
  "audioPath": "user_id/audio/file.m4a",
  "transcript": null,           // If provided, skips transcription
  "mode": "transcribe_and_parse", // or "transcribe_only"
  "context": {
    "activeGoalIds": ["uuid"],
    "activeProjectIds": ["uuid"],
    "activeEntryId": "uuid"
  }
}
```

**Response**:
```typescript
{
  "captureId": "uuid",
  "status": "parsed",           // or "transcribed", "no_entities"
  "transcript": "...",
  "trackerLogs": 3,             // Number logged
  "tasks": 2,                   // Tasks created
  "proposals": [],
  "questions": [],
  "context": { ... }
}
```

**Entity Extraction**:
- Trackers: `#mood(7)`, `#energy(8)`, `#stress(3)` → tracker_logs
- Tasks: "I need to...", "remember to...", "todo:" → entries with `facets: ["task"]`

### 5.4 Push Notifications

**Purpose**: Send APNs notifications to iOS devices.

```typescript
POST /functions/v1/send_push_notification
Authorization: Bearer <jwt>

{
  "user_id": "uuid",            // Target user
  "title": "Habit Reminder",
  "body": "Time for your morning workout!",
  "category": "habitReminder",  // iOS notification category
  "data": {                     // Custom payload
    "habitId": "uuid",
    "action": "complete"
  }
}
```

**Response**:
```typescript
{
  "sent": 2,    // Successful deliveries
  "failed": 0   // Failed deliveries
}
```

**Implementation Details**:
- Uses APNs HTTP/2 provider API
- JWT authentication (ES256 signing)
- Supports sandbox and production environments
- Automatically removes invalid device tokens
- Interruption levels: `passive`, `active`, `time-sensitive`, `critical`

---

## 6. Row-Level Security (RLS)

### 6.1 Policy Pattern

All user-owned tables follow this pattern:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_rw_own" ON public.<table>
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 6.2 Join Table Policies

Join tables validate ownership through parent entries:

```sql
CREATE POLICY "entry_goals_rw_via_entry" ON public.entry_goals
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = entry_goals.entry_id
      AND e.user_id = auth.uid()
  )
)
WITH CHECK (...);
```

### 6.3 Service Role Bypass

Edge Functions requiring cross-user access (e.g., push notifications) use:
- `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- User auth still validated via anon key client

---

## 7. Environment Variables

### 7.1 Required for Core Functions

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Claude API access |
| `OPENAI_API_KEY` | Whisper transcription |

### 7.2 Required for OAuth

| Variable | Purpose |
|----------|---------|
| `OAUTH_TOKEN_SECRET` | Encryption key for stored tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret |
| `MICROSOFT_REDIRECT_URI` | OAuth callback URL |

### 7.3 Required for Push Notifications

| Variable | Purpose |
|----------|---------|
| `APNS_KEY_ID` | APNs key identifier |
| `APNS_TEAM_ID` | Apple Developer Team ID |
| `APNS_PRIVATE_KEY` | APNs signing key (PEM) |
| `APNS_BUNDLE_ID` | App bundle identifier |
| `APNS_USE_SANDBOX` | `true` for development |

---

## 8. Data Flow Diagrams

### 8.1 Voice Capture Flow

```
┌─────────┐   ┌───────────┐   ┌─────────────────────┐   ┌──────────────┐
│ iOS App │──▶│ Supabase  │──▶│ transcribe_and_parse │──▶│ OpenAI       │
│         │   │ Storage   │   │ (Edge Function)      │   │ Whisper API  │
└─────────┘   └───────────┘   └─────────────────────┘   └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Entity Extract  │
                              │ #mood(7) → log  │
                              │ "need to" → task│
                              └─────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ tracker_logs    │
                              │ entries (tasks) │
                              └─────────────────┘
```

### 8.2 Calendar Sync Flow

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐
│ External    │◀──▶│ Edge Func   │◀──▶│ entries          │
│ Calendar    │    │ (sync)      │    │ (facets:["event"])│
│ (Google/MS) │    │             │    │                  │
└─────────────┘    └─────────────┘    └──────────────────┘
                          │
                          ▼
                   ┌─────────────────┐
                   │external_event_  │
                   │links (mapping)  │
                   └─────────────────┘
```

### 8.3 AI Agent Flow

```
┌─────────┐   ┌─────────────┐   ┌───────────────┐
│ Client  │──▶│ claude_agent │──▶│ Anthropic API │
│         │   │ (Edge Func)  │   │ (Claude)      │
└─────────┘   └─────────────┘   └───────────────┘
                    │                    │
                    │◀───────────────────┘
                    │  (tool_use response)
                    ▼
             ┌─────────────┐
             │ Tool        │
             │ Executor    │
             └─────────────┘
                    │
                    ▼
             ┌─────────────┐
             │ Database    │
             │ Operations  │
             └─────────────┘
```

---

## 9. Error Handling

### 9.1 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing/invalid params) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (RLS violation) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 500 | Internal server error |

### 9.2 Error Response Format

```typescript
{
  "error": "Human-readable message",
  "detail": "Technical details",
  "code": "error_code"  // Optional
}
```

### 9.3 Edge Function Error Handling

```typescript
try {
  // Operation
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[FunctionName] Error:', message);
  return json({ error: message }, 500);
}
```

---

## 10. Security Considerations

### 10.1 Token Security
- OAuth tokens encrypted at rest (AES-GCM)
- JWT tokens short-lived (1 hour)
- Refresh tokens handled server-side

### 10.2 Data Isolation
- RLS enforces `user_id = auth.uid()` on all tables
- No cross-user data access possible via API
- Service role key only used in controlled Edge Functions

### 10.3 Input Validation
- All Edge Functions validate required fields
- SQL injection prevented by parameterized queries
- XSS mitigated by JSON-only responses

### 10.4 Rate Limiting
- Supabase provides default rate limiting
- External API calls (OpenAI, Anthropic) have their own limits
- Calendar sync functions throttle to avoid provider limits

---

## 11. Future Considerations

### 11.1 Planned Enhancements
- **Streaming responses** for `claude_agent`
- **Webhook support** for real-time calendar updates
- **Background jobs** for scheduled notifications
- **Vector search** for semantic entry retrieval

### 11.2 Scalability Notes
- Entry embeddings (1536-dim) support pgvector search
- JSONB indexes on `frontmatter`, `metadata` columns
- Array indexes (GIN) on `tags`, `contexts`, `people`

### 11.3 Monitoring
- Edge Function logs available in Supabase dashboard
- Consider adding OpenTelemetry tracing
- Token usage tracking for cost management

---

## Appendix A: Table Relationships

```
auth.users
    │
    ├── profiles (1:1)
    │
    ├── goals (1:N)
    │     └── projects (1:N)
    │
    ├── entries (1:N)
    │     ├── entry_goals (N:M) ──▶ goals
    │     ├── entry_projects (N:M) ──▶ projects
    │     ├── entry_segments (1:N)
    │     ├── tracker_logs (1:N)
    │     ├── habit_instances (1:N)
    │     ├── workout_sessions (1:1)
    │     ├── nutrition_logs (1:1)
    │     ├── attachments (1:N)
    │     └── external_event_links (1:N)
    │
    ├── tracker_definitions (1:N)
    │     └── tracker_logs (1:N)
    │
    ├── habit_definitions (1:N)
    │     └── habit_instances (1:N)
    │
    ├── entities (1:N)
    ├── saved_views (1:N)
    ├── timers (1:N)
    ├── external_accounts (1:N)
    └── device_tokens (1:N)
```

---

## Appendix B: Claude Tool Categories

| Category | Tools | Access |
|----------|-------|--------|
| Context | `get_current_context`, `parse_voice_capture`, `quick_log` | Always loaded |
| Entries | `query_entries`, `create_entry`, `update_entry`, `delete_entry`, `bulk_update_entries` | Direct + Code |
| Trackers | `batch_log_trackers`, `query_tracker_logs`, `create_tracker_definition`, `aggregate_tracker_data` | Mixed |
| Workouts | `log_workout`, `query_workouts` | Direct + Code |
| Nutrition | `log_nutrition`, `query_nutrition` | Mixed |
| Goals | `list_goals`, `create_goal`, `update_goal_progress` | Direct + Code |
| Projects | `list_projects`, `create_project`, `link_entry_to_project` | Direct + Code |
| Search | `semantic_search`, `search_by_tags` | Direct + Code |
| Analytics | `get_daily_summary`, `get_streak_stats`, `calculate_xp` | Code only |
| Calendar | `get_scheduled_entries` | Direct + Code |

---

*End of specification*
