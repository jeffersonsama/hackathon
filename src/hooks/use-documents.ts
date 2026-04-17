import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useOfficialDocuments(search?: string, category?: string) {
  return useQuery({
    queryKey: ["official-documents", search, category],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("official_documents" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }
      if (category && category !== "Tous") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (doc: any) => {
      const { error } = await supabase.from("official_documents" as any).insert({
        ...doc,
        published_by: user!.id,
        published_at: doc.published ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document ajouté");
      qc.invalidateQueries({ queryKey: ["official-documents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("official_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["official-documents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAnnouncements(typeFilter?: string) {
  return useQuery({
    queryKey: ["announcements", typeFilter],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("announcements" as any)
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (typeFilter) {
        query = query.eq("announcement_type", typeFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePinnedAnnouncements() {
  return useQuery({
    queryKey: ["pinned-announcements"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements" as any)
        .select("*")
        .eq("pinned", true)
        .eq("published", true);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ann: any) => {
      const { error } = await supabase.from("announcements" as any).insert({
        ...ann,
        published_by: user!.id,
        published_at: ann.published ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce créée");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["pinned-announcements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce supprimée");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["pinned-announcements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ann: any) => {
      const { id, ...updates } = ann;
      const { error } = await supabase.from("announcements" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Annonce modifiée");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["pinned-announcements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
