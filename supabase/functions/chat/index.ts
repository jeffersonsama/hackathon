import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es l'assistant IA de UPF-Connect, une plateforme universitaire. Tu aides les étudiants et enseignants avec :

- **Épreuves & Examens** : expliquer des sujets, donner des pistes de résolution, comparer des méthodes, résumer des corrections
- **Cours** : expliquer des concepts, donner des résumés, aider à comprendre les chapitres
- **Messages** : aider à rédiger des messages professionnels à des enseignants ou camarades
- **Statistiques & Dashboard** : analyser la progression, donner des conseils d'organisation
- **Calendrier** : rappeler comment gérer son temps, prioriser les révisions
- **Groupes** : conseiller sur le travail collaboratif
- **Notifications** : résumer les notifications récentes, identifier qui a envoyé quoi
- **Général** : conseils d'études, méthodologie, motivation, orientation

Tu as accès au contexte de l'utilisateur connecté (profil, cours, épreuves, notifications, messages récents, groupes, événements). Utilise ces données pour répondre de manière personnalisée.

Réponds en français, de manière concise et utile. Utilise des emojis quand c'est approprié. Si on te demande quelque chose hors du contexte universitaire/éducatif, redirige poliment vers les sujets pertinents.`;

async function fetchUserContext(userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const [
    profileRes,
    rolesRes,
    enrollmentsRes,
    notificationsRes,
    examsRes,
    eventsRes,
    groupsRes,
    conversationsRes,
  ] = await Promise.all([
    sb.from("profiles").select("full_name, department, filiere, niveau, bio, account_status").eq("user_id", userId).single(),
    sb.from("user_roles").select("role").eq("user_id", userId),
    sb.from("course_enrollments").select("course_id, progress, completed, enrolled_at, courses(title, category)").eq("user_id", userId).limit(20),
    sb.from("notifications").select("title, content, type, created_at, read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    sb.from("exams").select("title, matiere, filiere, niveau, annee, exam_type, created_at").eq("created_by", userId).order("created_at", { ascending: false }).limit(10),
    sb.from("events").select("title, event_type, start_time, end_time, location").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(10),
    sb.from("group_members").select("group_id, role, groups(name, description)").eq("user_id", userId).limit(10),
    sb.from("conversation_participants").select("conversation_id, conversations(name, type, last_message_preview, last_message_at)").eq("user_id", userId).order("conversations(last_message_at)", { ascending: false }).limit(5),
  ]);

  const context: Record<string, any> = {};

  if (profileRes.data) context.profil = profileRes.data;
  if (rolesRes.data) context.roles = rolesRes.data.map(r => r.role);
  if (enrollmentsRes.data?.length) context.cours_inscrits = enrollmentsRes.data;
  if (notificationsRes.data?.length) context.notifications_recentes = notificationsRes.data;
  if (examsRes.data?.length) context.mes_epreuves = examsRes.data;
  if (eventsRes.data?.length) context.evenements_a_venir = eventsRes.data;
  if (groupsRes.data?.length) context.mes_groupes = groupsRes.data;
  if (conversationsRes.data?.length) context.conversations_recentes = conversationsRes.data;

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user from JWT
    let userContext = "";
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await sb.auth.getUser();
      
      if (user) {
        const ctx = await fetchUserContext(user.id);
        if (Object.keys(ctx).length > 0) {
          userContext = `\n\n--- CONTEXTE UTILISATEUR (données en temps réel) ---\n${JSON.stringify(ctx, null, 2)}\n--- FIN DU CONTEXTE ---`;
        }
      }
    } catch (e) {
      console.error("Failed to fetch user context:", e);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + userContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
