import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, published_by_profile:profiles!announcements_published_by_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) {
         console.warn("Join failed, fetching without profiles");
         const fallback = await supabase
           .from("announcements")
           .select("*")
           .order("created_at", { ascending: false });
         if (fallback.error) throw fallback.error;
         return fallback.data as any[];
      }

      return data as any[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (vars: { title: string; content: string; announcement_type: string; expires_at: string | null; published: boolean }) => {
      const { error } = await supabase.from("announcements").insert({
        title: vars.title,
        content: vars.content,
        announcement_type: vars.announcement_type,
        expires_at: vars.expires_at,
        published: vars.published,
        published_by: user!.id,
        published_at: vars.published ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { id: string; title: string; content: string; announcement_type: string; expires_at: string | null; published: boolean }) => {
      const { error } = await supabase.from("announcements").update({
        title: vars.title,
        content: vars.content,
        announcement_type: vars.announcement_type,
        expires_at: vars.expires_at,
        published: vars.published,
      }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}