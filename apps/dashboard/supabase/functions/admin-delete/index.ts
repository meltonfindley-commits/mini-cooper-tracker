import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { password, id } = await req.json()

  if (password !== Deno.env.get("ADMIN_PASSWORD")) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { error } = await supabase.from("services").delete().eq("id", id)

  return new Response(JSON.stringify({ ok: !error, error }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
