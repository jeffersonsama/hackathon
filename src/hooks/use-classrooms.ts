import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useClassrooms() {
  return useQuery({
    queryKey: ["classrooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classrooms")
        .select("*, classroom_members(count), profiles!classrooms_created_by_fkey(full_name, avatar_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyClassrooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-classrooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_members")
        .select("*, classrooms(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClassroom() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, subject }: { name: string; description: string; subject: string }) => {
      const { data, error } = await supabase
        .from("classrooms")
        .insert({ name, description, subject, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      // Auto-join as teacher
      await supabase.from("classroom_members").insert({
        classroom_id: data.id,
        user_id: user!.id,
        role: "teacher",
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      qc.invalidateQueries({ queryKey: ["my-classrooms"] });
    },
  });
}

export function useJoinClassroomByCode() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: classroom, error: findErr } = await supabase
        .from("classrooms")
        .select("id")
        .eq("invite_code", code.trim().toLowerCase())
        .eq("is_active", true)
        .single();
      if (findErr || !classroom) throw new Error("Code d'invitation invalide");

      const { error } = await supabase.from("classroom_members").insert({
        classroom_id: classroom.id,
        user_id: user!.id,
        role: "student",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Vous êtes déjà membre de cette classe");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classrooms"] });
      qc.invalidateQueries({ queryKey: ["my-classrooms"] });
      qc.invalidateQueries({ queryKey: ["student-classrooms"] }); // ✅ ajouter
    },
  });
}
