// Send Push Notification Edge Function
// Sends APNs push notifications to iOS devices

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Configuration
// =============================================================================

const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// Response Helpers
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// APNs JWT Token Generation
// =============================================================================

async function generateApnsJwt(keyId: string, teamId: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'ES256',
    kid: keyId,
  };

  const claims = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${headerB64}.${claimsB64}`;

  // Import the private key
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the data
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signatureInput)
  );

  // Convert signature to base64url
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signatureB64}`;
}

// =============================================================================
// APNs Payload Builder
// =============================================================================

interface ApnsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound: string;
    badge?: number;
    category?: string;
    'interruption-level'?: 'passive' | 'active' | 'time-sensitive' | 'critical';
    'thread-id'?: string;
  };
  // Custom data
  [key: string]: unknown;
}

function buildApnsPayload(
  title: string,
  body: string,
  category?: string,
  data?: Record<string, string>
): ApnsPayload {
  const payload: ApnsPayload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      'interruption-level': category === 'habitReminder' ? 'time-sensitive' : 'active',
    },
  };

  if (category) {
    payload.aps.category = category;
  }

  // Add custom data at root level (for notification userInfo)
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      payload[key] = value;
    }
  }

  return payload;
}

// =============================================================================
// Send Single Push Notification
// =============================================================================

async function sendPushToDevice(
  token: string,
  payload: ApnsPayload,
  jwt: string,
  bundleId: string,
  useSandbox: boolean
): Promise<{ success: boolean; error?: string }> {
  const host = useSandbox ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;
  const url = `https://${host}/3/device/${token}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorBody = await response.text();
    console.error(`[SendPush] APNs error for token ${token.substring(0, 8)}...: ${response.status} ${errorBody}`);
    return { success: false, error: `${response.status}: ${errorBody}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[SendPush] Network error for token ${token.substring(0, 8)}...: ${message}`);
    return { success: false, error: message };
  }
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ==========================================================================
    // Auth & Setup
    // ==========================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apnsKeyId = Deno.env.get('APNS_KEY_ID');
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
    const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
    const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.insightswift.app';
    const apnsUseSandbox = Deno.env.get('APNS_USE_SANDBOX') === 'true';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[SendPush] Missing Supabase credentials');
      return json({ error: 'Missing Supabase credentials' }, 500);
    }

    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey) {
      console.error('[SendPush] Missing APNs credentials');
      return json({ error: 'Missing APNs credentials (APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY)' }, 500);
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Create Supabase client with service role (to read device_tokens)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify calling user (optional - could also accept service-to-service calls)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      console.error('[SendPush] Auth error:', authError?.message ?? 'No user');
      return json({ error: 'Unauthorized', detail: authError?.message }, 401);
    }

    console.log('[SendPush] Request from user:', authData.user.id);

    // ==========================================================================
    // Parse Request
    // ==========================================================================

    const body = await req.json();
    const { user_id, title, body: messageBody, category, data } = body as {
      user_id: string;
      title: string;
      body: string;
      category?: string;
      data?: Record<string, string>;
    };

    if (!user_id || !title || !messageBody) {
      return json({ error: 'user_id, title, and body are required' }, 400);
    }

    console.log('[SendPush] Sending to user:', user_id, { title, category });

    // ==========================================================================
    // Fetch Device Tokens
    // ==========================================================================

    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('platform', 'ios');

    if (tokensError) {
      console.error('[SendPush] Error fetching tokens:', tokensError.message);
      return json({ error: 'Failed to fetch device tokens', detail: tokensError.message }, 500);
    }

    if (!tokens || tokens.length === 0) {
      console.log('[SendPush] No device tokens found for user:', user_id);
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SendPush] Found', tokens.length, 'device tokens');

    // ==========================================================================
    // Generate APNs JWT
    // ==========================================================================

    const jwt = await generateApnsJwt(apnsKeyId, apnsTeamId, apnsPrivateKey);

    // ==========================================================================
    // Build Payload
    // ==========================================================================

    const payload = buildApnsPayload(title, messageBody, category, data);

    // ==========================================================================
    // Send to All Devices
    // ==========================================================================

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const { token } of tokens) {
      const result = await sendPushToDevice(token, payload, jwt, apnsBundleId, apnsUseSandbox);

      if (result.success) {
        sent++;
      } else {
        failed++;
        // Track invalid tokens for cleanup
        if (result.error?.includes('BadDeviceToken') || result.error?.includes('Unregistered')) {
          invalidTokens.push(token);
        }
      }
    }

    // ==========================================================================
    // Clean Up Invalid Tokens
    // ==========================================================================

    if (invalidTokens.length > 0) {
      console.log('[SendPush] Removing', invalidTokens.length, 'invalid tokens');
      const { error: deleteError } = await supabase
        .from('device_tokens')
        .delete()
        .in('token', invalidTokens);

      if (deleteError) {
        console.error('[SendPush] Error deleting invalid tokens:', deleteError.message);
      }
    }

    // ==========================================================================
    // Return Response
    // ==========================================================================

    console.log('[SendPush] Complete:', { sent, failed });

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SendPush] Unexpected error:', errorMessage);
    return json({ error: 'Internal server error', detail: errorMessage }, 500);
  }
});
