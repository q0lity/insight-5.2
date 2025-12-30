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

  return json(
    {
      error: "Not implemented",
      hint:
        "Implement Google Calendar sync and mapping writes to external_event_links.",
    },
    501,
  );
});
