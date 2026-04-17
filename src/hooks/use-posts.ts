import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePosts() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_profiles_fkey(full_name, avatar_url, department), comments(count), post_reactions(reaction_type, user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Sort: same faculty first, then by date (already sorted)
      const userFaculty = profile?.department;
      if (!userFaculty) return data;
      const sameFaculty = data.filter((p: any) => p.profiles?.department === userFaculty);
      const otherFaculty = data.filter((p: any) => p.profiles?.department !== userFaculty);
      return [...sameFaculty, ...otherFaculty];
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ content, mediaUrls, title, postType, tags, externalUrl }: {
      content: string; mediaUrls?: string[]; title?: string; postType?: string; tags?: string[]; externalUrl?: string;
    }) => {
      const pt = mediaUrls && mediaUrls.length > 0 && !postType ? "media" : (postType || "text");
      const { error } = await supabase.from("posts").insert({
        user_id: user!.id,
        content,
        media_urls: mediaUrls || [],
        post_type: pt,
        title: title || null,
        tags: tags || null,
        external_url: externalUrl || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: string }) => {
      const { data: existing } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user!.id)
        .eq("reaction_type", type)
        .maybeSingle();

      if (existing) {
        await supabase.from("post_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user!.id,
          reaction_type: type,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      // Delete reactions and comments first, then the post
      await supabase.from("post_reactions").delete().eq("post_id", postId);
      await supabase.from("comments").delete().eq("post_id", postId);
      const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
