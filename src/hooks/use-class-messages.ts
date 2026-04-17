import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useClassMessages(classroomId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!classroomId) return;
    const channel = supabase
      .channel(`class-messages-${classroomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "class_messages", filter: `classroom_id=eq.${classroomId}` }, () => {
        qc.invalidateQueries({ queryKey: ["class-messages", classroomId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classroomId, qc]);

  return useQuery({
    queryKey: ["class-messages", classroomId],
    enabled: !!classroomId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("class_messages" as any).select("*").eq("classroom_id", classroomId!).order("created_at", { ascending: true }) as any);
      if (error) throw error;
      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))] as string[];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map((m: any) => ({ ...m, senderProfile: profileMap.get(m.sender_id) }));
    },
  });
}

export function useSendClassMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ classroomId, content }: { classroomId: string; content: string }) => {
      const { error } = await (supabase.from("class_messages" as any).insert({ classroom_id: classroomId, sender_id: user!.id, content }) as any);
      if (error) throw error;
    },
    onSuccess: (_, { classroomId }) => {
      qc.invalidateQueries({ queryKey: ["class-messages", classroomId] });
    },
  });
}
