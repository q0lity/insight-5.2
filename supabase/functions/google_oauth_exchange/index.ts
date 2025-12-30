import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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

  if (!code) {
    return json({ error: "OAuth code is required" }, 400);
  }

  return json(
    {
      error: "Not implemented",
      hint:
        "Configure GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET and implement token exchange.",
    },
    501,
  );
});
