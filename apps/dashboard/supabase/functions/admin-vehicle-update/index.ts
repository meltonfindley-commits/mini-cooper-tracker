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

  const { password, id, oldName, newName } = await req.json()

  if (password !== Deno.env.get("ADMIN_PASSWORD")) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

  if (!newName?.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "New name is required" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // 1. Rename in vehicles table
  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update({ name: newName.trim() })
    .eq("id", id)

  if (vehicleError) {
    return new Response(JSON.stringify({ ok: false, error: vehicleError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }

  // 2. Propagate rename to all tasks entries
  const { count, error: tasksError } = await supabase
    .from("tasks")
    .update({ vehicle: newName.trim() })
    .eq("vehicle", oldName)

  return new Response(JSON.stringify({ ok: !tasksError, updatedTasks: count ?? 0, error: tasksError }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
