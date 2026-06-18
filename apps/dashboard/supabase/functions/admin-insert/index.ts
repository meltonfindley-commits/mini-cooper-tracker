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

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: { message: "Unauthorized" } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    })
  }
  const token = authHeader.replace("Bearer ", "")
  const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ ok: false, error: { message: "Unauthorized" } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    })
  }

  const { row } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data, error } = await supabase
    .from("services")
    .insert({ ...row, user_id: user.id })
    .select()
    .single()

  return new Response(JSON.stringify({ ok: !error, data, error }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
