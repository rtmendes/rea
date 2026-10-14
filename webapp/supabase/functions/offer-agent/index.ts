// Supabase Edge Function: runs the offer-pipeline value check with Claude using a server-side
// ANTHROPIC_API_KEY, so signed-in users of the REA webapp never hold the key in their browser.
// Deploy: supabase functions deploy offer-agent ; secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";

const DEFAULT_MODEL = "claude-opus-5-5";
const cors = (origin: string | null) => ({ "access-control-allow-origin": origin || "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405, headers: cors(origin) });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY secret is not set on this project." }, { status: 503, headers: cors(origin) });
  let body: { prompt?: string; schema?: Record<string, unknown>; model?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors(origin) }); }
  if (typeof body.prompt !== "string" || body.prompt.length > 200_000 || !body.schema) return Response.json({ error: "prompt (≤200k chars) and schema are required" }, { status: 400, headers: cors(origin) });
  const model = typeof body.model === "string" && /^claude-[a-z0-9-]+$/.test(body.model) ? body.model : DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      output_config: { format: { type: "json_schema", schema: body.schema } },
      messages: [{ role: "user", content: body.prompt }],
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "The model declined this request." }, { status: 422, headers: cors(origin) });
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    return Response.json({ text, model: response.model, usage: response.usage }, { headers: cors(origin) });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 502;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status, headers: cors(origin) });
  }
});
