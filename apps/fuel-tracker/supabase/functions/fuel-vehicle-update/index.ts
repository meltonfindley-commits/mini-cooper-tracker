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

  const { password, id, oldName, newName, year, make, model, trim_level, color, original_mileage, current_mileage } = await req.json()

  if (password !== Deno.env.get("ADMIN_PASSWORD")) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

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

  // Update vehicle row with all fields
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

  if (vehicleError) {
    return new Response(JSON.stringify({ ok: false, error: vehicleError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }

  // Propagate name change to fuel_logs only if name actually changed
  let updatedLogs = 0
  if (oldName && newName.trim() !== oldName) {
    const { count } = await supabase
      .from("fuel_logs")
      .update({ vehicle: newName.trim() })
      .eq("vehicle", oldName)
    updatedLogs = count ?? 0
  }

  return new Response(JSON.stringify({ ok: true, updatedLogs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
})
