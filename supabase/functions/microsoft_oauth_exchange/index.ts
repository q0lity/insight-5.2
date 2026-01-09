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
const MICROSOFT_REDIRECT_URI = Deno.env.get("MICROSOFT_REDIRECT_URI") ?? "";
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

async function encryptToken(token: string) {
  if (!OAUTH_TOKEN_SECRET) throw new Error("Missing OAUTH_TOKEN_SECRET");
  const key = await deriveKey(OAUTH_TOKEN_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
}

async function exchangeCodeForToken(code: string, redirectUri: string) {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET");
  }
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: "offline_access Calendars.ReadWrite",
  });
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description ?? data?.error ?? "OAuth token exchange failed");
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function fetchProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id?: string; mail?: string; userPrincipalName?: string };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Supabase env missing" }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const code =
    typeof payload.code === "string"
      ? payload.code
      : typeof payload.authCode === "string"
        ? payload.authCode
        : null;

  if (!code) return json({ error: "OAuth code is required" }, 400);

  const redirectUri =
    typeof payload.redirectUri === "string"
      ? payload.redirectUri
      : MICROSOFT_REDIRECT_URI;

  if (!redirectUri) return json({ error: "Missing redirect URI" }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

  try {
    const token = await exchangeCodeForToken(code, redirectUri);
    const profile = await fetchProfile(token.access_token);
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const { data: existing } = await supabase
      .from("external_accounts")
      .select("refresh_token")
      .eq("user_id", userData.user.id)
      .eq("provider", "microsoft")
      .maybeSingle();

    const refreshToken = token.refresh_token ?? existing?.refresh_token ?? null;

    const encryptedAccess = await encryptToken(token.access_token);
    const encryptedRefresh = refreshToken ? await encryptToken(refreshToken) : null;

    const { error: upsertError } = await supabase
      .from("external_accounts")
      .upsert(
        {
          user_id: userData.user.id,
          provider: "microsoft",
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          expires_at: expiresAt,
          scope: token.scope ?? null,
          external_account_id: profile?.id ?? null,
          external_email: profile?.mail ?? profile?.userPrincipalName ?? null,
          metadata: { token_type: token.token_type ?? "Bearer" },
        },
        { onConflict: "user_id,provider" },
      );

    if (upsertError) throw new Error(upsertError.message);
    return json({ status: "ok", provider: "microsoft", expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth exchange failed";
    return json({ error: message }, 400);
  }
});
