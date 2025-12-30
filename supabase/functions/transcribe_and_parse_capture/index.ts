import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type CaptureContext = {
  activeGoalIds?: string[];
  activeProjectIds?: string[];
  activeEntryId?: string | null;
};

type CapturePayload = {
  captureId?: string;
  audioPath?: string | null;
  transcript?: string | null;
  context?: CaptureContext | null;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: CapturePayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { captureId, audioPath, transcript, context } = payload ?? {};
  if (!captureId || (!audioPath && !transcript)) {
    return json(
      {
        error: "captureId and either audioPath or transcript are required",
      },
      400,
    );
  }

  return json({
    captureId,
    status: "queued",
    proposals: [],
    questions: [],
    context: context ?? null,
  });
});
