import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: "TMDB_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // path after /tmdb-proxy  e.g. /search or /movie/123
  const tmdbPath = url.searchParams.get("path") ?? "";
  const query = url.searchParams.get("query") ?? "";
  const append = url.searchParams.get("append_to_response") ?? "";

  let tmdbUrl = `${TMDB_BASE}${tmdbPath}?api_key=${TMDB_API_KEY}`;
  if (query) tmdbUrl += `&query=${encodeURIComponent(query)}&page=1`;
  if (append) tmdbUrl += `&append_to_response=${encodeURIComponent(append)}`;

  try {
    const res = await fetch(tmdbUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "TMDB request failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
