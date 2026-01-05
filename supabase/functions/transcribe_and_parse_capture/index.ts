import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CaptureContext = {
  activeGoalIds?: string[];
  activeProjectIds?: string[];
  activeEntryId?: string | null;
};

type CapturePayload = {
  captureId?: string;
  audioBucket?: string | null;
  audioPath?: string | null;
  transcript?: string | null;
  mode?: "transcribe_only" | "transcribe_and_parse";
  context?: CaptureContext | null;
};

type TrackerToken = {
  key: string;
  rawToken: string;
  value: number | string | boolean;
  valueType: "number" | "boolean" | "text";
};

const TRACKER_RE = /#([a-zA-Z][\w-]*)\(([^)]+)\)/g;
const TASK_PATTERNS = [
  /\b(?:i need to|i have to|i gotta|i've got to|remember to|remind me to)\s+([^.!?\n]+)/gi,
  /\b(?:todo|task)\s*:\s*([^.!?\n]+)/gi,
];
const DEFAULT_AUDIO_BUCKET = "attachments";
const PLACEHOLDER_TEXT = "[Audio capture pending transcription]";
const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_AUDIO_EXTENSIONS = new Set([
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg",
  "wav",
  "webm",
]);
const OPENAI_AUDIO_MIME_BY_EXT: Record<string, string> = {
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function normalizeKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveAudioLocation(audioPath: string, audioBucket?: string | null) {
  const bucket = audioBucket ?? DEFAULT_AUDIO_BUCKET;
  if (audioBucket) {
    return { bucket, path: audioPath };
  }
  if (audioPath.startsWith(`${DEFAULT_AUDIO_BUCKET}/`)) {
    return { bucket: DEFAULT_AUDIO_BUCKET, path: audioPath.slice(DEFAULT_AUDIO_BUCKET.length + 1) };
  }
  return { bucket, path: audioPath };
}

function normalizeAudioFilename(filename: string) {
  const parts = filename.split(".");
  if (parts.length < 2) return `${filename}.m4a`;
  const ext = parts.pop()?.toLowerCase();
  const base = parts.join(".");
  if (ext && OPENAI_AUDIO_EXTENSIONS.has(ext)) return filename;
  return `${base}.m4a`;
}

function inferAudioContentType(filename: string, fallbackType?: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && OPENAI_AUDIO_MIME_BY_EXT[ext]) return OPENAI_AUDIO_MIME_BY_EXT[ext];
  if (fallbackType && fallbackType !== "application/octet-stream") return fallbackType;
  return "audio/mp4";
}

async function transcribeWithOpenAI(audio: Blob, filename: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  // Log API key info (prefix only, never full key)
  const keyPrefix = apiKey.slice(0, 10);
  console.log("[OpenAI] API key prefix:", keyPrefix + "...");

  // Log audio blob details
  console.log("[OpenAI] Audio blob - size:", audio.size, "bytes, type:", audio.type || "(empty)");

  const normalizedFilename = normalizeAudioFilename(filename);
  if (normalizedFilename !== filename) {
    console.log("[OpenAI] Normalized audio filename:", filename, "->", normalizedFilename);
  }
  const contentType = inferAudioContentType(normalizedFilename, audio.type);
  if (contentType !== audio.type) {
    console.log("[OpenAI] Using content type:", contentType, "from", audio.type || "(empty)");
  }

  // Convert to ArrayBuffer and create a proper File object (not Blob)
  // OpenAI Whisper requires a file with proper filename and MIME type
  const arrayBuffer = await audio.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Log first few bytes to verify audio data is present
  const header = Array.from(uint8Array.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log("[OpenAI] Audio header bytes:", header, "total bytes:", uint8Array.length);

  // Create a File object (not Blob) - this is what OpenAI expects
  const file = new File([uint8Array], normalizedFilename, { type: contentType });
  console.log("[OpenAI] Created File object - name:", file.name, "size:", file.size, "type:", file.type);

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  console.log("[OpenAI] Sending request to Whisper API...");

  const response = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  console.log("[OpenAI] Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OpenAI] Error response:", errorText);
    throw new Error(`OpenAI transcription failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log("[OpenAI] Transcription successful, text length:", data?.text?.length ?? 0);
  if (typeof data?.text === "string") return data.text;
  return "";
}

function formatDisplayName(rawKey: string) {
  return rawKey
    .trim()
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function coerceValue(rawValue: string): number | string | boolean {
  const trimmed = rawValue.trim();
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }
  const num = Number(trimmed);
  if (Number.isFinite(num) && trimmed !== "") {
    return num;
  }
  return trimmed;
}

function valueTypeOf(value: number | string | boolean): "number" | "boolean" | "text" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  return "text";
}

function extractTrackerTokens(text: string): TrackerToken[] {
  const tokens: TrackerToken[] = [];
  for (const match of text.matchAll(TRACKER_RE)) {
    const key = normalizeKey(match[1] ?? "");
    const rawValue = match[2] ?? "";
    if (!key) continue;
    const value = coerceValue(rawValue);
    tokens.push({
      key,
      rawToken: `#${key}(${rawValue})`,
      value,
      valueType: valueTypeOf(value),
    });
  }
  return tokens;
}

function splitTaskCandidate(raw: string): string[] {
  const cleaned = raw.replace(/\s{2,}/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.includes(" and ")) {
    return cleaned
      .split(/\band\b/gi)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [cleaned];
}

function extractTaskTitles(text: string): string[] {
  const titles: string[] = [];
  for (const pattern of TASK_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const candidate = match[1] ?? "";
      splitTaskCandidate(candidate).forEach((item) => titles.push(item));
    }
  }
  return Array.from(
    new Set(
      titles
        .map((title) => title.replace(/^[\s-]+/, "").trim())
        .filter((title) => title.length > 2)
    )
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function resolveEntryId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entryId: string | null | undefined,
) {
  if (!entryId) return null;
  if (isUuid(entryId)) return entryId;
  const { data } = await supabase
    .from("entries")
    .select("id")
    .eq("user_id", userId)
    .eq("frontmatter->>legacyId", entryId)
    .maybeSingle();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  // Wrap entire handler in try-catch for better error visibility
  try {
    console.log("[Edge] Request received:", req.method);

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let payload: CapturePayload;
    try {
      payload = await req.json();
      console.log("[Edge] Payload parsed:", JSON.stringify({
        captureId: payload.captureId,
        hasAudioPath: !!payload.audioPath,
        hasTranscript: !!payload.transcript
      }));
    } catch (parseErr) {
      console.error("[Edge] JSON parse error:", parseErr);
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { captureId, audioBucket, audioPath, transcript, context, mode } = payload ?? {};
    if (!captureId || (!audioPath && !transcript)) {
      console.error("[Edge] Missing required fields - captureId:", captureId, "audioPath:", audioPath, "transcript:", !!transcript);
      return json(
        {
          error: "captureId and either audioPath or transcript are required",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    console.log("[Edge] Env check - SUPABASE_URL:", !!supabaseUrl, "SUPABASE_ANON_KEY:", !!supabaseAnonKey, "OPENAI_API_KEY:", !!openaiKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Missing Supabase credentials" }, 500);
    }

    if (!openaiKey && audioPath && !transcript) {
      console.error("[Edge] OPENAI_API_KEY is not set but audio transcription is needed!");
      return json({ error: "Missing OPENAI_API_KEY - cannot transcribe audio" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";

  // Log auth header presence for debugging (never log actual token)
  const hasAuthHeader = authHeader.length > 0;
  const tokenPrefix = authHeader.startsWith("Bearer ") ? authHeader.slice(7, 17) + "..." : "(no Bearer prefix)";
  console.log("[Auth] Auth header present:", hasAuthHeader, "prefix:", tokenPrefix);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[Auth] Missing or malformed Authorization header");
    return json({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  console.log("[Auth] Calling getUser() to validate token...");
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("[Auth] getUser() error:", authError.message, "status:", authError.status);
    return json({
      error: "Unauthorized",
      detail: authError.message,
      code: authError.status
    }, 401);
  }

  if (!authData?.user) {
    console.error("[Auth] getUser() returned no user");
    return json({ error: "Unauthorized", detail: "No user in response" }, 401);
  }

  console.log("[Auth] User validated:", authData.user.id, authData.user.email ?? "(no email)");
  const userId = authData.user.id;

  let resolvedTranscript = transcript?.trim() ?? "";
  if (!resolvedTranscript && audioPath) {
    console.log("[Edge] No transcript provided, downloading audio from storage...");
    const { bucket, path } = resolveAudioLocation(audioPath, audioBucket);
    console.log("[Edge] Downloading from bucket:", bucket, "path:", path);

    const { data: audioData, error: audioError } = await supabase.storage.from(bucket).download(path);
    if (audioError || !audioData) {
      console.error("[Edge] Audio download failed:", audioError?.message ?? "No data returned");
      return json({
        error: "Unable to download audio for transcription",
        detail: audioError?.message ?? "No audio data"
      }, 400);
    }

    console.log("[Edge] Audio downloaded, size:", audioData.size, "bytes, type:", audioData.type);

    try {
      const filename = path.split("/").pop() ?? "audio.m4a";
      console.log("[Edge] Starting OpenAI transcription for file:", filename);
      resolvedTranscript = (await transcribeWithOpenAI(audioData, filename)).trim();
      console.log("[Edge] Transcription complete, length:", resolvedTranscript.length);
    } catch (err) {
      console.error("[Edge] Transcription error:", err instanceof Error ? err.message : String(err));
      return json(
        { error: err instanceof Error ? err.message : "Audio transcription failed" },
        500,
      );
    }
  }

  if (!resolvedTranscript) {
    return json({ error: "Transcription returned empty text" }, 500);
  }

  if ((mode ?? "transcribe_and_parse") === "transcribe_only") {
    console.log("[Edge] Transcribe-only mode enabled; skipping parsing/logging.");
    return json({
      captureId,
      status: "transcribed",
      transcript: resolvedTranscript,
      context: context ?? null,
    });
  }

  const tokens = extractTrackerTokens(resolvedTranscript);
  const taskTitles = extractTaskTitles(resolvedTranscript);
  if (!tokens.length && !taskTitles.length) {
    return json({
      captureId,
      status: "no_entities",
      proposals: [],
      questions: [],
      trackerLogs: [],
      tasks: [],
      transcript: resolvedTranscript,
      context: context ?? null,
    });
  }

  const uniqueKeys = Array.from(new Set(tokens.map((t) => t.key)));
  const { data: definitions } = await supabase
    .from("tracker_definitions")
    .select("id, key, value_type")
    .eq("user_id", userId)
    .in("key", uniqueKeys);

  const definitionMap = new Map<string, { id: string; valueType: string }>();
  (definitions ?? []).forEach((def: any) => {
    if (def?.key && def?.id) {
      definitionMap.set(def.key, { id: def.id, valueType: def.value_type ?? "number" });
    }
  });

  const keyValueTypes = new Map<string, "number" | "boolean" | "text">();
  tokens.forEach((token) => {
    if (!keyValueTypes.has(token.key)) keyValueTypes.set(token.key, token.valueType);
  });

  const missingKeys = uniqueKeys.filter((key) => !definitionMap.has(key));
  if (missingKeys.length) {
    const insertRows = missingKeys.map((key) => ({
      user_id: userId,
      key,
      display_name: formatDisplayName(key),
      value_type: keyValueTypes.get(key) ?? "number",
    }));
    await supabase.from("tracker_definitions").insert(insertRows);
    const { data: refreshed } = await supabase
      .from("tracker_definitions")
      .select("id, key, value_type")
      .eq("user_id", userId)
      .in("key", uniqueKeys);
    (refreshed ?? []).forEach((def: any) => {
      if (def?.key && def?.id) {
        definitionMap.set(def.key, { id: def.id, valueType: def.value_type ?? "number" });
      }
    });
  }

  // Resolve entry IDs - handle both UUIDs and legacy timestamp-based IDs
  const resolvedCaptureId = await resolveEntryId(supabase, userId, captureId);
  const resolvedEntryId = await resolveEntryId(
    supabase,
    userId,
    context?.activeEntryId ?? captureId,
  );

  // Log resolved IDs for debugging
  console.log("[Parse] captureId:", captureId, "-> resolved:", resolvedCaptureId);
  console.log("[Parse] entryId:", context?.activeEntryId, "-> resolved:", resolvedEntryId);

  const existingTokens = new Set<string>();
  if (captureId) {
    // Use string comparison for captureId in metadata (works with any ID format)
    const { data: existingLogs } = await supabase
      .from("tracker_logs")
      .select("raw_token")
      .eq("user_id", userId)
      .eq("metadata->>captureId", captureId);
    (existingLogs ?? []).forEach((row: any) => {
      if (typeof row?.raw_token === "string") existingTokens.add(row.raw_token);
    });
  }

  const logPayload = tokens
    .filter((token) => !existingTokens.has(token.rawToken))
    .map((token) => {
      const definition = definitionMap.get(token.key);
      const base = {
        user_id: userId,
        tracker_id: definition?.id,
        entry_id: resolvedEntryId,
        occurred_at: new Date().toISOString(),
        unit: null,
        raw_token: token.rawToken,
        metadata: { captureId, source: "edge" },
      } as Record<string, unknown>;

      if (typeof token.value === "boolean") {
        base.value_bool = token.value;
      } else if (typeof token.value === "number" && Number.isFinite(token.value)) {
        base.value_numeric = token.value;
      } else {
        base.value_text = String(token.value ?? "");
      }
      return base;
    })
    .filter((row) => row.tracker_id);

  if (logPayload.length) {
    await supabase.from("tracker_logs").insert(logPayload);
  }

  let tasksInserted = 0;
  if (taskTitles.length) {
    const { data: existingTasks } = await supabase
      .from("entries")
      .select("title, frontmatter")
      .eq("user_id", userId)
      .contains("facets", ["task"])
      .eq("frontmatter->>captureId", captureId);

    const existingTitles = new Set(
      (existingTasks ?? [])
        .map((row: any) => String(row?.title ?? "").trim().toLowerCase())
        .filter((title) => title.length)
    );

    const newTasks = taskTitles.filter((title) => !existingTitles.has(title.toLowerCase()));
    if (newTasks.length) {
      const taskRows = newTasks.map((title) => ({
        user_id: userId,
        title,
        facets: ["task"],
        status: "todo",
        source: "app",
        frontmatter: {
          captureId,
          sourceKind: "capture_parse",
          parentEventId: resolvedEntryId,
        },
      }));
      const { data: insertedTasks } = await supabase.from("entries").insert(taskRows).select("id");
      tasksInserted = insertedTasks?.length ?? newTasks.length;
    }
  }

  // Only update the entry if we have a resolved UUID (entry exists in Supabase)
  if (resolvedCaptureId && (tokens.length || taskTitles.length)) {
    const { data: captureRow } = await supabase
      .from("entries")
      .select("frontmatter")
      .eq("user_id", userId)
      .eq("id", resolvedCaptureId)
      .maybeSingle();
    const summaryParts: string[] = [];
    if (tokens.length) summaryParts.push(`Trackers: ${tokens.map((t) => t.rawToken).join(" ")}`);
    if (taskTitles.length) summaryParts.push(`Tasks: ${taskTitles.join("; ")}`);
    const nextFrontmatter = {
      ...(captureRow?.frontmatter ?? {}),
      status: "parsed",
      processedText: summaryParts.join("\n"),
    };
    await supabase
      .from("entries")
      .update({ frontmatter: nextFrontmatter })
      .eq("user_id", userId)
      .eq("id", resolvedCaptureId);
    console.log("[Parse] Updated entry", resolvedCaptureId, "with parsed status");
  } else if (captureId && !resolvedCaptureId) {
    console.log("[Parse] Skipping entry update - captureId not found in Supabase:", captureId);
  }

  console.log("[Edge] Success! Returning parsed result");
  return json({
    captureId,
    status: "parsed",
    proposals: [],
    questions: [],
    trackerLogs: logPayload.length,
    tasks: tasksInserted,
    transcript: resolvedTranscript,
    context: context ?? null,
  });

  } catch (unexpectedError) {
    // Catch-all for any unhandled errors
    console.error("[Edge] UNEXPECTED ERROR:", unexpectedError);
    const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError);
    const errorStack = unexpectedError instanceof Error ? unexpectedError.stack : undefined;
    console.error("[Edge] Error stack:", errorStack);
    return json({
      error: "Internal server error",
      detail: errorMessage,
      stack: errorStack
    }, 500);
  }
});
