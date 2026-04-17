import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useExams(search?: string) {
  return useQuery({
    queryKey: ["exams", search],
    queryFn: async () => {
      let query = supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.textSearch("fts", search, { config: "french" });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (exam: { title: string; description: string; matiere: string; filiere: string; niveau: string; annee: string }) => {
      const { error } = await supabase.from("exams").insert({
        ...exam,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}
