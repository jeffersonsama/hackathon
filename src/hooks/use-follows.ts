import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserFollows(userId: string) {
  return useQuery({
    queryKey: ["follows", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUserFollowers(userId: string) {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useIsFollowing(targetUserId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-following", targetUserId],
    enabled: !!user && targetUserId !== user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["is-following"] });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["is-following"] });
    },
  });
}

export function useSubscribedPosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["posts", "subscribed"],
    queryFn: async () => {
      if (!user) return [];
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (!follows || follows.length === 0) return [];
      const followingIds = follows.map((f) => f.following_id);
      const { data, error } = await supabase
        .from("posts")
        .select(
          "*, profiles!posts_user_id_profiles_fkey(full_name, avatar_url, department), comments(count), post_reactions(reaction_type, user_id)"
        )
        .in("user_id", followingIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}