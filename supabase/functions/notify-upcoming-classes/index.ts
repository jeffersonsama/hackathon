import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get current day of week (1=Monday...7=Sunday) and time
    const now = new Date();
    const jsDow = now.getUTCDay(); // 0=Sunday
    const dow = jsDow === 0 ? 7 : jsDow;

    // Calculate time window: 45-60 minutes from now
    const inMinutes = (offset: number) => {
      const d = new Date(now.getTime() + offset * 60 * 1000);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:00`;
    };
    const timeFrom = inMinutes(45);
    const timeTo = inMinutes(60);

    // Find slots starting in 45-60 min on today's day
    const { data: slots, error: slotErr } = await sb
      .from("schedule_slots")
      .select("*, schedule_modules(name, faculty, level, teacher_id)")
      .eq("day_of_week", dow)
      .gte("start_time", timeFrom)
      .lte("start_time", timeTo);

    if (slotErr) throw slotErr;
    if (!slots || slots.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalNotified = 0;

    for (const slot of slots) {
      const mod = (slot as any).schedule_modules;
      if (!mod) continue;

      // Get students matching faculty + level
      const { data: students } = await sb
        .from("profiles")
        .select("user_id")
        .eq("department", mod.faculty)
        .eq("niveau", mod.level)
        .eq("account_status", "active");

      const recipients = new Set((students || []).map((s: any) => s.user_id));
      // Also notify the teacher
      recipients.add(mod.teacher_id);

      const notifications = [...recipients].map((uid) => ({
        user_id: uid,
        title: "Cours dans ~1h",
        content: `${mod.name} commence à ${slot.start_time?.slice(0, 5)}${slot.room ? " — Salle " + slot.room : ""}`,
        type: "system" as const,
        link: "/calendar",
      }));

      if (notifications.length > 0) {
        const { error: insertErr } = await sb.from("notifications").insert(notifications);
        if (insertErr) console.error("Insert error:", insertErr);
        totalNotified += notifications.length;
      }
    }

    return new Response(JSON.stringify({ notified: totalNotified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
