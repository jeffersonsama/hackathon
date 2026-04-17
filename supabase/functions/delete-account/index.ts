import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Delete user-generated content
    await adminClient.from("group_messages").delete().eq("sender_id", uid);
    await adminClient.from("class_messages").delete().eq("sender_id", uid);
    await adminClient.from("comments").delete().eq("user_id", uid);
    await adminClient.from("post_reactions").delete().eq("user_id", uid);
    await adminClient.from("posts").delete().eq("user_id", uid);

    // Step 2: Delete academic data
    await adminClient.from("quiz_attempts").delete().eq("user_id", uid);
    await adminClient.from("course_progress").delete().eq("user_id", uid);
    await adminClient.from("course_enrollments").delete().eq("user_id", uid);
    await adminClient.from("classroom_members").delete().eq("user_id", uid);
    await adminClient.from("group_members").delete().eq("user_id", uid);
    await adminClient.from("event_rsvp").delete().eq("user_id", uid);
    await adminClient.from("skill_endorsements").delete().eq("endorsed_by", uid);
    await adminClient.from("profile_recommendations").delete().eq("from_user_id", uid);
    await adminClient.from("profile_skills").delete().eq("user_id", uid);
    await adminClient.from("profile_experiences").delete().eq("user_id", uid);
    await adminClient.from("profile_education").delete().eq("user_id", uid);
    await adminClient.from("notifications").delete().eq("user_id", uid);

    // Step 3: Delete conversations & messages
    const { data: convos } = await adminClient
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
    if (convos?.length) {
      const ids = convos.map((c) => c.id);
      await adminClient.from("messages").delete().in("conversation_id", ids);
      await adminClient.from("conversations").delete().in("id", ids);
    }

    // Step 4: Delete storage files
    for (const bucket of ["avatars", "covers"]) {
      const { data: files } = await adminClient.storage.from(bucket).list(uid);
      if (files?.length) {
        await adminClient.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
      }
    }

    // Step 5: Delete role and profile
    await adminClient.from("user_roles").delete().eq("user_id", uid);
    await adminClient.from("profiles").delete().eq("user_id", uid);

    // Step 6: Delete auth user
    await adminClient.auth.admin.deleteUser(uid);

    return new Response(
      JSON.stringify({ success: true, message: "Compte supprimé avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de la suppression du compte" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
