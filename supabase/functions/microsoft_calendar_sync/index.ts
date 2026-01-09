import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID") ?? "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "";
const OAUTH_TOKEN_SECRET = Deno.env.get("OAUTH_TOKEN_SECRET") ?? "";

async function deriveKey(secret: string) {
  const data = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(input: string) {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decryptToken(cipherText: string | null | undefined) {
  if (!cipherText) return null;
  if (!OAUTH_TOKEN_SECRET) throw new Error("Missing OAUTH_TOKEN_SECRET");
  const [ivPart, dataPart] = cipherText.split(":");
  if (!ivPart || !dataPart) throw new Error("Invalid token format");
  const key = await deriveKey(OAUTH_TOKEN_SECRET);
  const iv = fromBase64(ivPart);
  const data = fromBase64(dataPart);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

async function encryptToken(token: string) {
  if (!OAUTH_TOKEN_SECRET) throw new Error("Missing OAUTH_TOKEN_SECRET");
  const key = await deriveKey(OAUTH_TOKEN_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
}

async function refreshAccessToken(refreshToken: string) {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET");
  }
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "offline_access Calendars.ReadWrite",
  });
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description ?? data?.error ?? "Token refresh failed");
  }
  return data as { access_token: string; expires_in?: number; scope?: string; token_type?: string };
}

function entryToMicrosoftEvent(entry: any) {
  const fm = (entry.frontmatter ?? {}) as Record<string, unknown>;
  const allDay = fm.allDay === true;
  return {
    subject: entry.title,
    body: { contentType: "text", content: entry.body_markdown ?? "" },
    isAllDay: allDay,
    start: { dateTime: entry.start_at, timeZone: "UTC" },
    end: { dateTime: entry.end_at, timeZone: "UTC" },
    location: fm.location ? { displayName: String(fm.location) } : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Supabase env missing" }, 500);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const scopeStartMs =
    typeof payload.scopeStartMs === "number" ? payload.scopeStartMs : new Date().setHours(0, 0, 0, 0);
  const scopeEndMs =
    typeof payload.scopeEndMs === "number" ? payload.scopeEndMs : scopeStartMs + 365 * 24 * 60 * 60 * 1000;

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const { data: account, error: accountError } = await supabase
    .from("external_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("provider", "microsoft")
    .maybeSingle();
  if (accountError || !account) return json({ error: "Microsoft calendar not connected" }, 400);

  let accessToken = await decryptToken(account.access_token);
  const refreshToken = await decryptToken(account.refresh_token);
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;

  if (!accessToken || (!refreshToken && expiresAt && expiresAt < Date.now())) {
    return json({ error: "Missing or expired tokens" }, 400);
  }

  if (refreshToken && expiresAt && expiresAt < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;
    const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
    const encryptedAccess = await encryptToken(refreshed.access_token);
    await supabase
      .from("external_accounts")
      .update({
        access_token: encryptedAccess,
        expires_at: nextExpiresAt,
        scope: refreshed.scope ?? account.scope,
      })
      .eq("id", account.id);
  }

  const startIso = new Date(scopeStartMs).toISOString();
  const endIso = new Date(scopeEndMs).toISOString();
  const eventsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    },
  );
  const eventsPayload = await eventsRes.json();
  if (!eventsRes.ok) {
    return json({ error: eventsPayload?.error?.message ?? "Calendar fetch failed" }, 400);
  }
  const externalEvents = Array.isArray(eventsPayload.value) ? eventsPayload.value : [];

  const { data: links } = await supabase
    .from("external_event_links")
    .select("id, entry_id, external_event_id, etag, last_synced_at")
    .eq("user_id", userData.user.id)
    .eq("provider", "microsoft");

  const linkByExternal = new Map<string, any>();
  const linkByEntry = new Map<string, any>();
  (links ?? []).forEach((link) => {
    linkByExternal.set(link.external_event_id, link);
    linkByEntry.set(link.entry_id, link);
  });

  const { data: entries } = await supabase
    .from("entries")
    .select("id, title, start_at, end_at, updated_at, frontmatter, body_markdown, facets, deleted_at")
    .eq("user_id", userData.user.id)
    .contains("facets", ["event"])
    .gte("start_at", startIso)
    .lte("start_at", endIso)
    .is("deleted_at", null);

  const entryById = new Map<string, any>();
  (entries ?? []).forEach((entry) => entryById.set(entry.id, entry));

  let pulled = 0;
  let pushed = 0;
  let conflicts = 0;

  for (const event of externalEvents) {
    if (!event?.id) continue;
    const link = linkByExternal.get(event.id);
    const externalUpdated = event.lastModifiedDateTime ? new Date(event.lastModifiedDateTime).getTime() : 0;

    if (event.isCancelled) {
      if (link) {
        await supabase.from("entries").update({ deleted_at: new Date().toISOString() }).eq("id", link.entry_id);
      }
      continue;
    }

    const startAt = event.start?.dateTime ? new Date(event.start.dateTime).getTime() : null;
    const endAt = event.end?.dateTime ? new Date(event.end.dateTime).getTime() : null;
    if (!startAt || !endAt) continue;

    if (link) {
      const entry = entryById.get(link.entry_id);
      if (!entry) continue;
      const localUpdated = entry.updated_at ? new Date(entry.updated_at).getTime() : 0;
      const diff = Math.abs(externalUpdated - localUpdated);
      if (diff < 60 * 1000) conflicts += 1;

      if (externalUpdated > localUpdated) {
        await supabase.from("entries").update({
          title: event.subject ?? "Event",
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          body_markdown: event.body?.content ?? "",
          frontmatter: {
            ...(entry.frontmatter ?? {}),
            allDay: event.isAllDay ?? false,
            location: event.location?.displayName ?? null,
            externalId: event.id,
          },
          source: "calendar",
        }).eq("id", entry.id);
        pulled += 1;
      } else if (localUpdated > externalUpdated) {
        const updateRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${event.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entryToMicrosoftEvent(entry)),
        });
        if (updateRes.ok) pushed += 1;
      }
      continue;
    }

    const insertPayload = {
      user_id: userData.user.id,
      title: event.subject ?? "Event",
      facets: ["event"],
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      body_markdown: event.body?.content ?? "",
      frontmatter: {
        allDay: event.isAllDay ?? false,
        location: event.location?.displayName ?? null,
        externalId: event.id,
      },
      source: "calendar",
    };

    const { data: created, error: insertError } = await supabase
      .from("entries")
      .insert(insertPayload)
      .select("id")
      .single();
    if (!insertError && created?.id) {
      await supabase.from("external_event_links").insert({
        user_id: userData.user.id,
        entry_id: created.id,
        provider: "microsoft",
        external_event_id: event.id,
        external_calendar_id: event.calendar?.id ?? null,
        etag: event.changeKey ?? null,
        last_synced_at: new Date().toISOString(),
      });
      pulled += 1;
    }
  }

  for (const entry of entries ?? []) {
    if (linkByEntry.has(entry.id)) continue;
    if (!entry.start_at || !entry.end_at) continue;
    if (entry.source === "calendar") continue;
    const createRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entryToMicrosoftEvent(entry)),
    });
    const created = await createRes.json();
    if (!createRes.ok || !created?.id) continue;
    await supabase.from("external_event_links").insert({
      user_id: userData.user.id,
      entry_id: entry.id,
      provider: "microsoft",
      external_event_id: created.id,
      external_calendar_id: created.calendar?.id ?? null,
      etag: created.changeKey ?? null,
      last_synced_at: new Date().toISOString(),
    });
    pushed += 1;
  }

  return json({
    pulled,
    pushed,
    conflicts,
    lastSyncAt: Date.now(),
  });
});
