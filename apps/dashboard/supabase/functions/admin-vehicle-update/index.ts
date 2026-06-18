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

  const { id, oldName, newName, year, make, model, trim_level, color, original_mileage, current_mileage } = await req.json()

  if (!newName?.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "Vehicle name is required" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update({
      name: newName.trim(),
      year: year ? parseInt(year) : null,
      make: make?.trim() || null,
      model: model?.trim() || null,
      trim_level: trim_level?.trim() || null,
      color: color?.trim() || null,
      original_mileage: original_mileage ? parseFloat(original_mileage) : null,
      current_mileage: current_mileage ? parseFloat(current_mileage) : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (vehicleError) {
    return new Response(JSON.stringify({ ok: false, error: vehicleError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }

  let updatedTasks = 0
  if (oldName && newName.trim() !== oldName) {
    const { count } = await supabase
      .from("services")
      .update({ vehicle: newName.trim() })
      .eq("vehicle", oldName)
      .eq("user_id", user.id)
    updatedTasks = count ?? 0
  }

  return new Response(JSON.stringify({ ok: true, updatedTasks }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
