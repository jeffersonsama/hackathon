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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch expired stories
    const { data: expiredStories, error: fetchError } = await supabase
      .from("stories")
      .select("id, user_id, media_url")
      .lt("created_at", cutoff);

    if (fetchError) throw fetchError;

    if (!expiredStories || expiredStories.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete associated storage files
    const filePaths: string[] = [];
    for (const story of expiredStories) {
      if (story.media_url) {
        // Extract path from URL: .../storage/v1/object/public/stories/USER_ID/FILE
        const match = story.media_url.match(/\/stories\/(.+)$/);
        if (match) filePaths.push(match[1]);
      }
    }

    if (filePaths.length > 0) {
      await supabase.storage.from("stories").remove(filePaths);
    }

    // Delete expired stories from DB
    const ids = expiredStories.map((s) => s.id);
    const { error: deleteError } = await supabase
      .from("stories")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ deleted: ids.length, filesRemoved: filePaths.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
