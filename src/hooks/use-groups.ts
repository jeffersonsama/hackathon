import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useGroups(filter?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["groups", filter],
    queryFn: async () => {
      let query = supabase
        .from("groups")
        .select("*, group_members(count)")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (filter === "mine" && user) {
        // Filter to groups user is member of
        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);
        const myGroupIds = new Set((memberships || []).map((m) => m.group_id));
        return (data || []).filter((g) => myGroupIds.has(g.id));
      }
      if (filter === "public") {
        return (data || []).filter((g) => g.is_public);
      }
      return data;
    },
  });
}

export function useGroupDetail(groupId: string | null) {
  return useQuery({
    queryKey: ["group-detail", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId!);
      if (error) throw error;

      // Get profiles for all members
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return data.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));
    },
  });
}

export function useGroupMessages(groupId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.group_id === groupId) {
            qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, qc]);

  return useQuery({
    queryKey: ["group-messages", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_messages" as any)
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set((data as any[]).map((m: any) => m.sender_id))];
      if (senderIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return (data as any[]).map((m: any) => ({
        ...m,
        senderProfile: profileMap.get(m.sender_id),
      }));
    },
  });
}

export function useSendGroupMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, content, fileUrl, fileType }: { groupId: string; content: string; fileUrl?: string; fileType?: string }) => {
      const { error } = await supabase
        .from("group_messages" as any)
        .insert({
          group_id: groupId,
          sender_id: user!.id,
          content,
          file_url: fileUrl || null,
          file_type: fileType || null,
        });
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, isPublic }: { name: string; description: string; isPublic: boolean }) => {
      const { data, error } = await supabase.from("groups").insert({
        name,
        description,
        is_public: isPublic,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;

      await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user!.id,
        role: "admin",
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user!.id,
        role: "member",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useMyGroupMembership(groupId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-group-membership", groupId],
    enabled: !!groupId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
