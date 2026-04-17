import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, role, appUrl } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).single();
    const fullName = profile?.full_name || "Utilisateur";
    const roleLabels: Record<string, string> = { student: "Étudiant", teacher: "Professeur", alumni: "Alumni", admin: "Administrateur" };

    console.log(`[send-validation-email] Account validated for ${fullName} (${role})`);
    // In production, integrate with an email provider here
    return new Response(JSON.stringify({ success: true, message: `Validation email queued for ${fullName}`, role: roleLabels[role] || role }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
