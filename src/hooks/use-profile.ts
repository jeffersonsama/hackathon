import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useProfileData(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfileRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      return (data || []).map((r) => r.role);
    },
  });
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-stats", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [posts, enrollments, coursesCreated, groups, exams] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("course_enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("created_by", userId!),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("created_by", userId!),
      ]);
      return {
        posts: posts.count || 0,
        enrollments: enrollments.count || 0,
        coursesCreated: coursesCreated.count || 0,
        groups: groups.count || 0,
        exams: exams.count || 0,
      };
    },
  });
}

export function useProfilePosts(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-posts", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, post_reactions(id), comments(id)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        reactionCount: p.post_reactions?.length || 0,
        commentCount: p.comments?.length || 0,
      }));
    },
  });
}

export function useProfileGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-groups", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("role, groups(id, name, is_public, group_members(count))")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data || []).filter((m: any) => m.groups?.is_public).map((m: any) => ({
        id: m.groups.id,
        name: m.groups.name,
        memberCount: m.groups.group_members?.[0]?.count || 0,
        userRole: m.role,
      }));
    },
  });
}

export function useProfileExperiences(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-experiences", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_experiences" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfileEducation(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-education", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_education" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("start_year", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfileSkills(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-skills", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_skills" as any)
        .select("*, skill_endorsements(endorsed_by)")
        .eq("user_id", userId!)
        .order("endorsement_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfileRecommendations(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-recommendations", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_recommendations" as any)
        .select("*")
        .eq("to_user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Get author names
      const authorIds = [...new Set((data || []).map((r: any) => r.from_user_id))];
      let authorMap = new Map<string, any>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", authorIds);
        (profiles || []).forEach((p) => authorMap.set(p.user_id, p));
      }
      return (data || []).map((r: any) => ({
        ...r,
        authorName: authorMap.get(r.from_user_id)?.full_name || "Utilisateur",
        authorAvatar: authorMap.get(r.from_user_id)?.avatar_url,
      }));
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddExperience() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (exp: any) => {
      const { error } = await supabase.from("profile_experiences" as any).insert({ ...exp, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expérience ajoutée");
      qc.invalidateQueries({ queryKey: ["profile-experiences"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profile_experiences" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expérience supprimée");
      qc.invalidateQueries({ queryKey: ["profile-experiences"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddEducation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (edu: any) => {
      const { error } = await supabase.from("profile_education" as any).insert({ ...edu, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation ajoutée");
      qc.invalidateQueries({ queryKey: ["profile-education"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profile_education" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation supprimée");
      qc.invalidateQueries({ queryKey: ["profile-education"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddSkill() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (skill: { skill_name: string; skill_level: string; category: string }) => {
      const { error } = await supabase.from("profile_skills" as any).insert({ ...skill, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compétence ajoutée");
      qc.invalidateQueries({ queryKey: ["profile-skills"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profile_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compétence supprimée");
      qc.invalidateQueries({ queryKey: ["profile-skills"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleEndorsement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ skillId, isEndorsed }: { skillId: string; isEndorsed: boolean }) => {
      if (isEndorsed) {
        const { error } = await supabase
          .from("skill_endorsements" as any)
          .delete()
          .eq("skill_id", skillId)
          .eq("endorsed_by", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("skill_endorsements" as any)
          .insert({ skill_id: skillId, endorsed_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-skills"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddRecommendation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ toUserId, relationship, content }: { toUserId: string; relationship: string; content: string }) => {
      const { error } = await supabase.from("profile_recommendations" as any).insert({
        from_user_id: user!.id,
        to_user_id: toUserId,
        relationship,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recommandation envoyée");
      qc.invalidateQueries({ queryKey: ["profile-recommendations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
