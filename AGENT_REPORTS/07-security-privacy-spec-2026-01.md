# Security, Privacy & Compliance Audit Report

**Date:** 2026-01-18
**Auditor:** imperator (polecat)
**Scope:** OWASP Top 10, RLS Policies, GDPR Compliance, Health Data Handling
**Files Reviewed:**
- `DB/RLS_POLICIES_V1.sql`
- `supabase/functions/` (all edge functions)

---

## Executive Summary

The Insight52 application demonstrates **strong foundational security practices** with comprehensive Row Level Security (RLS) policies and proper authentication patterns. However, several areas require attention for production readiness, particularly around GDPR compliance documentation and health data handling specifics.

**Overall Security Posture:** ⚠️ **MEDIUM-HIGH** (Good foundation, needs refinement)

| Category | Status | Risk Level |
|----------|--------|------------|
| RLS Policies | ✅ Strong | Low |
| Authentication | ✅ Strong | Low |
| OAuth Token Storage | ✅ Good | Low |
| CORS Configuration | ⚠️ Needs Review | Medium |
| GDPR Compliance | ⚠️ Needs Documentation | Medium |
| Health Data Handling | ⚠️ Needs Enhancement | Medium |
| Input Validation | ✅ Good | Low |
| Error Handling | ✅ Good | Low |

---

## 1. Row Level Security (RLS) Policy Review

### 1.1 Findings

**File:** `DB/RLS_POLICIES_V1.sql`

#### Strengths ✅

1. **Universal RLS Enablement:** All tables have RLS enabled via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

2. **Consistent User Isolation:** Every policy uses `user_id = auth.uid()` pattern ensuring users can only access their own data:
   ```sql
   using (user_id = auth.uid())
   with check (user_id = auth.uid())
   ```

3. **Join Table Security:** Join tables (`entry_goals`, `entry_projects`) correctly validate ownership through parent tables:
   ```sql
   using (exists (
     select 1 from public.entries e
     where e.id = entry_goals.entry_id
       and e.user_id = auth.uid()
   ))
   ```

4. **Profiles Table Protection:** The `profiles` table has separate SELECT/INSERT/UPDATE policies with proper `id = auth.uid()` checks.

5. **Tables Covered:**
   - profiles, entities, goals, projects, entries, entry_segments
   - tracker_definitions, tracker_logs
   - habit_definitions, habit_instances
   - workout_sessions, workout_rows, nutrition_logs
   - attachments, saved_views, timers
   - external_event_links, external_accounts
   - entry_goals, entry_projects

#### Potential Improvements ⚠️

1. **No DELETE Policies:** While `for all` policies cover DELETE, explicit DELETE policies would add clarity.

2. **Missing device_tokens Table:** The `send_push_notification` function references a `device_tokens` table not covered in RLS_POLICIES_V1.sql. Verify RLS is configured separately.

3. **Service Role Access:** The push notification function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. This is intentional but should be documented.

---

## 2. OWASP Top 10 Audit

### 2.1 A01:2021 - Broken Access Control

**Status:** ✅ **PASS**

- All edge functions validate authentication via `supabase.auth.getUser()`
- RLS policies enforce data isolation at the database level
- No direct database queries bypass auth checks

**Evidence:**
```typescript
// From claude_agent/index.ts
const { data: authData, error: authError } = await supabase.auth.getUser();
if (authError || !authData?.user) {
  return json({ error: 'Unauthorized', detail: authError?.message }, 401);
}
```

### 2.2 A02:2021 - Cryptographic Failures

**Status:** ✅ **PASS**

- OAuth tokens encrypted at rest using AES-256-GCM
- Proper key derivation using SHA-256
- Unique IV (12 bytes) for each encryption operation

**Evidence:**
```typescript
// From google_oauth_exchange/index.ts
async function encryptToken(token: string) {
  const key = await deriveKey(OAUTH_TOKEN_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
}
```

**Recommendation:** Consider using a dedicated secrets management service (e.g., Vault) for production.

### 2.3 A03:2021 - Injection

**Status:** ✅ **PASS**

- Supabase client uses parameterized queries
- No raw SQL string concatenation observed
- User input properly typed before database operations

**Evidence:**
```typescript
// From tool-executor.ts - Parameterized queries
const { data, error } = await supabase
  .from('entries')
  .select('...')
  .eq('user_id', userId)
  .is('deleted_at', null);
```

### 2.4 A04:2021 - Insecure Design

**Status:** ⚠️ **NEEDS REVIEW**

**Potential Issue:** `semantic_search` function uses `ilike` with user input:
```typescript
.or(`title.ilike.%${query}%,body_markdown.ilike.%${query}%`);
```

**Risk:** While RLS protects data access, special characters in the query string could cause unexpected behavior.

**Recommendation:** Sanitize or escape special characters (`%`, `_`, `\`) in search queries.

### 2.5 A05:2021 - Security Misconfiguration

**Status:** ⚠️ **NEEDS REVIEW**

**Issue:** CORS configured as wildcard origin:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
};
```

**Risk:** Allows any origin to make requests to the API.

**Recommendation:** Restrict CORS to specific allowed origins in production:
```typescript
const ALLOWED_ORIGINS = ['https://app.insight52.com', 'capacitor://localhost'];
```

### 2.6 A06:2021 - Vulnerable and Outdated Components

**Status:** ℹ️ **UNABLE TO FULLY ASSESS**

- Dependencies imported from esm.sh and jsr.io
- Supabase client v2 appears current
- No package.json visible for edge functions

**Recommendation:** Implement dependency scanning and version pinning.

### 2.7 A07:2021 - Identification and Authentication Failures

**Status:** ✅ **PASS**

- JWT-based authentication via Supabase Auth
- Token validation on every request
- No hardcoded credentials detected (secrets in env vars)

### 2.8 A08:2021 - Software and Data Integrity Failures

**Status:** ✅ **PASS**

- OAuth flows use proper state/code exchange
- No unsafe deserialization patterns
- Calendar sync validates external event integrity via etag

### 2.9 A09:2021 - Security Logging and Monitoring Failures

**Status:** ⚠️ **NEEDS ENHANCEMENT**

**Current State:**
- Console logging present for debugging
- Auth errors logged

**Missing:**
- Structured security event logging
- Failed authentication attempt tracking
- Anomaly detection for unusual data access patterns

**Recommendation:** Implement security event logging with structured format:
```typescript
console.log(JSON.stringify({
  event: 'auth_failure',
  timestamp: new Date().toISOString(),
  ip: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
  detail: error.message
}));
```

### 2.10 A10:2021 - Server-Side Request Forgery (SSRF)

**Status:** ✅ **PASS**

- External API calls (Google, Microsoft, OpenAI) use hardcoded URLs
- No user-controlled URL parameters for server-side requests
- Audio file downloads restricted to Supabase storage buckets

---

## 3. GDPR Compliance Assessment

### 3.1 Current State

| Requirement | Status | Notes |
|-------------|--------|-------|
| Lawful Basis for Processing | ⚠️ | Not documented in code |
| Data Subject Rights | ⚠️ | No delete/export APIs found |
| Data Minimization | ✅ | Only necessary data collected |
| Purpose Limitation | ✅ | Data used for stated purposes |
| Storage Limitation | ⚠️ | No data retention policies |
| Encryption at Rest | ✅ | Supabase handles this |
| Encryption in Transit | ✅ | HTTPS enforced |
| Consent Management | ⚠️ | Not visible in backend |

### 3.2 Required Actions for GDPR Compliance

1. **Right to Access (Art. 15):**
   - Implement `/api/gdpr/export` endpoint to export all user data

2. **Right to Erasure (Art. 17):**
   - Implement `/api/gdpr/delete-account` endpoint
   - Cascade delete across all tables
   - Handle OAuth token revocation

3. **Right to Data Portability (Art. 20):**
   - Provide machine-readable export format (JSON/CSV)

4. **Data Retention:**
   - Define and implement retention periods for:
     - Soft-deleted entries
     - Tracker logs
     - Workout/nutrition history
     - OAuth tokens for disconnected accounts

5. **Consent Records:**
   - Track consent timestamps
   - Document consent withdrawal process

---

## 4. Health Data Handling (HIPAA Considerations)

### 4.1 Sensitive Data Categories Identified

| Data Type | Tables | Sensitivity |
|-----------|--------|-------------|
| Mood/Stress Trackers | tracker_logs | High |
| Workout Data | workout_sessions, workout_rows | Medium |
| Nutrition/Diet | nutrition_logs | Medium |
| Health Goals | goals | Medium |
| Habit Tracking | habit_definitions, habit_instances | Medium |

### 4.2 Current Protections

- ✅ User data isolation via RLS
- ✅ OAuth tokens encrypted
- ✅ Authentication required for all endpoints
- ✅ No PHI/PII exposed in logs (token prefixes only)

### 4.3 Recommendations for Health Data

1. **Data Classification:**
   - Implement metadata tagging for health-related entries
   - Consider separate encryption keys for health data

2. **Audit Logging:**
   - Log access to health-related tables
   - Track data modifications for compliance

3. **Third-Party Sharing:**
   - Claude Agent has access to all user data
   - Document data processing agreements with Anthropic
   - Consider opt-in for AI analysis of health data

4. **Voice Transcription:**
   - OpenAI processes voice recordings for transcription
   - Health information may be spoken in recordings
   - Ensure OpenAI DPA covers health data

---

## 5. Edge Function Security Review

### 5.1 claude_agent/index.ts

**Security Grade:** ✅ **A**

- Proper auth validation
- Agentic loop bounded (MAX_AGENTIC_ITERATIONS = 10)
- Tool execution scoped to authenticated user
- No prompt injection vulnerabilities detected

### 5.2 google_oauth_exchange/index.ts & microsoft_oauth_exchange/index.ts

**Security Grade:** ✅ **A**

- Tokens encrypted before storage
- Refresh token preservation logic is sound
- External account ID captured for audit

### 5.3 google_calendar_sync/index.ts & microsoft_calendar_sync/index.ts

**Security Grade:** ✅ **A-**

- Token refresh before expiry (5-minute window)
- External calendar IDs stored for reference
- Soft-delete propagated for cancelled events

**Minor Issue:** Calendar sync time range accepts user input but is bounded to reasonable ranges.

### 5.4 transcribe_and_parse_capture/index.ts

**Security Grade:** ✅ **A-**

- Audio downloaded from user's storage bucket only
- OpenAI API key never exposed
- Transcript parsing uses safe regex patterns

**Note:** Consider rate limiting to prevent abuse.

### 5.5 send_push_notification/index.ts

**Security Grade:** ✅ **A**

- Uses service role for cross-user token lookup (intentional)
- Validates caller authentication
- Cleans up invalid device tokens
- APNs JWT generated securely

---

## 6. Vulnerability Summary

### Critical (P0) - None

### High (P1) - None

### Medium (P2)

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| P2-1 | Wildcard CORS | All edge functions | Restrict to allowed origins |
| P2-2 | Missing device_tokens RLS | Database | Add RLS policy |
| P2-3 | GDPR right to erasure | Backend | Implement deletion endpoint |
| P2-4 | No security audit logging | All functions | Add structured logging |

### Low (P3)

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| P3-1 | Search query sanitization | tool-executor.ts:1152 | Escape special chars |
| P3-2 | Rate limiting | All functions | Add rate limiting |
| P3-3 | Data retention undefined | Database | Define retention policies |

---

## 7. Recommended Action Plan

### Immediate (Week 1)

1. Add device_tokens RLS policy
2. Restrict CORS origins for production
3. Sanitize search query special characters

### Short-Term (Month 1)

4. Implement GDPR data export endpoint
5. Implement GDPR account deletion endpoint
6. Add structured security logging
7. Implement rate limiting on edge functions

### Medium-Term (Quarter 1)

8. Define and implement data retention policies
9. Add consent management system
10. Implement security event monitoring
11. Create health data handling documentation
12. Review and document third-party DPAs (Anthropic, OpenAI)

---

## 8. Conclusion

The Insight52 backend demonstrates solid security fundamentals with comprehensive RLS policies and proper authentication patterns. The primary gaps are in GDPR compliance tooling and security observability rather than fundamental vulnerabilities.

**Priority Focus Areas:**
1. CORS hardening for production
2. GDPR compliance endpoints
3. Security logging infrastructure

The codebase is well-structured for adding these improvements without significant architectural changes.

---

*Report generated by imperator security audit - 2026-01-18*
