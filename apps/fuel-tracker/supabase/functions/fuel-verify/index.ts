import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { password } = await req.json()
  const ok = password === Deno.env.get("ADMIN_PASSWORD")

  return new Response(JSON.stringify({ ok }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
