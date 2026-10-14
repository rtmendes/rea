// Supabase Edge Function: forwards scrape requests from signed-in users of the REA webapp to
// Firecrawl, adding the FIRECRAWL_API_KEY secret server-side so no browser ever holds the key.
// Deploy: supabase functions deploy firecrawl-proxy   (verify_jwt stays on: callers must be signed in)
// Secret: supabase secrets set FIRECRAWL_API_KEY=fc-...   (optional; without it the keyless tier is used)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const ALLOWED_KEYS = new Set(["url", "formats", "mobile", "onlyMainContent", "maxAge", "waitFor", "timeout"]);
const MAX_FORMATS = 4;

const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin || "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "vary": "origin",
});

function isPublicHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname;
    if (!h.includes(".") || /^(localhost|.*\.local|.*\.internal)$/i.test(h)) return false;
    if (/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.test(h) || h.startsWith("[")) return false; // literal addresses are refused; names resolve on Firecrawl's side
    return true;
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return Response.json({ success: false, error: "POST only" }, { status: 405, headers: cors(origin) });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: cors(origin) }); }
  if (!isPublicHttpUrl(body.url)) return Response.json({ success: false, error: "url must be a public http(s) URL" }, { status: 400, headers: cors(origin) });
  const forward: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (ALLOWED_KEYS.has(k)) forward[k] = v;
  if (Array.isArray(forward.formats) && (forward.formats as unknown[]).length > MAX_FORMATS) return Response.json({ success: false, error: `at most ${MAX_FORMATS} formats` }, { status: 400, headers: cors(origin) });
  const key = Deno.env.get("FIRECRAWL_API_KEY") || "";
  const upstream = await fetch(FIRECRAWL, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(forward),
  });
  const text = await upstream.text();
  return new Response(text, { status: upstream.status, headers: { ...cors(origin), "content-type": "application/json", "x-rea-proxy": key ? "keyed" : "keyless" } });
});
