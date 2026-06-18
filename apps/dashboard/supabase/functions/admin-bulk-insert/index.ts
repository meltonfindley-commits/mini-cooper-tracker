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

  const { rows } = await req.json()

  if (!Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No rows provided" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const rowsWithUser = rows.map((r: Record<string, unknown>) => ({ ...r, user_id: user.id }))
  const { data, error } = await supabase.from("services").insert(rowsWithUser).select()

  return new Response(JSON.stringify({ ok: !error, count: data?.length ?? 0, error }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
