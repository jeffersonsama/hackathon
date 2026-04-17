import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

// ── Types ──
export interface ConversationItem {
  id: string;
  type: "direct" | "group";
  name: string;
  avatarUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  partnerId?: string;
  partnerPresence?: { status: string; last_seen_at: string };
  participants: { userId: string; fullName: string; avatarUrl: string | null; isAdmin: boolean }[];
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  message_type: string;
  duration_seconds: number | null;
  call_status: string | null;
  is_pinned: boolean;
  deleted_for_everyone: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  replyPreview?: { content: string; senderName: string } | null;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

// ── Singleton realtime : compteur de références par channel ──
// Évite de créer plusieurs channels identiques quand le hook
// est monté dans plusieurs composants simultanément (ex: AppLayout + MessagesPage)
const channelRefs = new Map<string, { channel: ReturnType<typeof supabase.channel>; count: number }>();

function useRealtimeChannel(
  channelName: string,
  enabled: boolean,
  setup: (ch: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>
) {
  useEffect(() => {
    if (!enabled) return;

    // Si le channel existe déjà, incrémenter le compteur sans recréer
    if (channelRefs.has(channelName)) {
      channelRefs.get(channelName)!.count++;
      return () => {
        const ref = channelRefs.get(channelName);
        if (ref) {
          ref.count--;
          if (ref.count <= 0) {
            supabase.removeChannel(ref.channel);
            channelRefs.delete(channelName);
          }
        }
      };
    }

    // Créer un nouveau channel
    const ch = setup(supabase.channel(channelName));
    channelRefs.set(channelName, { channel: ch, count: 1 });

    return () => {
      const ref = channelRefs.get(channelName);
      if (ref) {
        ref.count--;
        if (ref.count <= 0) {
          supabase.removeChannel(ref.channel);
          channelRefs.delete(channelName);
        }
      }
    };
  }, [channelName, enabled]);
}

// ── Conversations ──
export function useConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useRealtimeChannel(
    `conv-updates-${user?.id}`,
    !!user,
    (ch) => ch
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe()
  );

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const uid = user!.id;

      const { data: myParts } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id, last_read_at")
        .eq("user_id", uid);
      if (!myParts?.length) return [] as ConversationItem[];

      const convIds = (myParts as any[]).map((p: any) => p.conversation_id);

      const { data: convos } = await supabase
        .from("conversations" as any)
        .select("*")
        .in("id", convIds)
        .order("last_message_at", { ascending: false });
      if (!convos?.length) return [] as ConversationItem[];

      const { data: allParts } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id, user_id, is_admin")
        .in("conversation_id", convIds);

      const allUserIds = [...new Set((allParts as any[] || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", allUserIds);
      const pMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const { data: presenceData } = await supabase
        .from("user_presence" as any)
        .select("user_id, status, last_seen_at")
        .in("user_id", allUserIds);
      const presMap = new Map((presenceData as any[] || []).map((p: any) => [p.user_id, p]));

      const unreadCounts = await Promise.all(
        (myParts as any[]).map(async (part: any) => {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", part.conversation_id)
            .gt("sent_at", part.last_read_at)
            .neq("sender_id", uid);
          return { id: part.conversation_id, count: count || 0 };
        })
      );
      const unreadMap = new Map(unreadCounts.map((u) => [u.id, u.count]));

      return (convos as any[]).map((conv: any) => {
        const parts = (allParts as any[] || []).filter((p: any) => p.conversation_id === conv.id);
        const otherParts = parts.filter((p: any) => p.user_id !== uid);
        const partner = conv.type !== "group" && otherParts[0] ? pMap.get(otherParts[0].user_id) : null;
        const partnerPres = partner ? presMap.get(partner.user_id) : null;

        return {
          id: conv.id,
          type: conv.type || "direct",
          name: conv.type === "group" ? (conv.name || "Groupe") : (partner?.full_name || "Utilisateur"),
          avatarUrl: conv.type === "group" ? conv.avatar_url : partner?.avatar_url,
          lastMessageAt: conv.last_message_at || conv.created_at,
          lastMessagePreview: conv.last_message_preview || "",
          unreadCount: unreadMap.get(conv.id) || 0,
          partnerId: partner?.user_id,
          partnerPresence: partnerPres ? { status: partnerPres.status, last_seen_at: partnerPres.last_seen_at } : undefined,
          participants: parts.map((p: any) => {
            const prof = pMap.get(p.user_id);
            return { userId: p.user_id, fullName: prof?.full_name || "Utilisateur", avatarUrl: prof?.avatar_url, isAdmin: p.is_admin };
          }),
        } as ConversationItem;
      }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    },
  });
}

// ── Messages ──
export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useRealtimeChannel(
    `msgs-${conversationId}`,
    !!conversationId && !!user,
    (ch) => ch
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg?.conversation_id === conversationId || (payload.old as any)?.conversation_id === conversationId) {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      })
      .subscribe()
  );

  return useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async (): Promise<MessageItem[]> => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("sent_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      if (!msgs?.length) return [];

      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", senderIds);
      const pMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const msgIds = msgs.map((m: any) => m.id);
      const { data: reactions } = await supabase
        .from("message_reactions" as any)
        .select("message_id, emoji, user_id")
        .in("message_id", msgIds);

      const reactMap = new Map<string, { emoji: string; count: number; reacted: boolean }[]>();
      for (const r of (reactions as any[] || [])) {
        const key = r.message_id;
        if (!reactMap.has(key)) reactMap.set(key, []);
        const arr = reactMap.get(key)!;
        const existing = arr.find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count++;
          if (r.user_id === user!.id) existing.reacted = true;
        } else {
          arr.push({ emoji: r.emoji, count: 1, reacted: r.user_id === user!.id });
        }
      }

      const replyIds = msgs.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
      let replyMap = new Map<string, { content: string; senderName: string }>();
      if (replyIds.length) {
        const { data: replies } = await supabase
          .from("messages")
          .select("id, content, sender_id")
          .in("id", replyIds);
        for (const r of (replies as any[] || [])) {
          const prof = pMap.get(r.sender_id);
          replyMap.set(r.id, { content: r.content?.substring(0, 80) || "", senderName: prof?.full_name || "Utilisateur" });
        }
      }

      return msgs.map((m: any) => {
        const sender = pMap.get(m.sender_id);
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          sent_at: m.sent_at,
          attachment_url: m.attachment_url,
          attachment_type: m.attachment_type,
          reply_to_id: m.reply_to_id,
          is_edited: m.is_edited || false,
          message_type: m.message_type || "text",
          duration_seconds: m.duration_seconds,
          call_status: m.call_status,
          is_pinned: m.is_pinned || false,
          deleted_for_everyone: m.deleted_for_everyone || false,
          senderName: sender?.full_name || "Utilisateur",
          senderAvatar: sender?.avatar_url,
          replyPreview: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
          reactions: reactMap.get(m.id) || [],
        } as MessageItem;
      });
    },
  });
}

// ── Send Message ──
export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, content, replyToId, attachmentUrl, attachmentType, messageType }: {
      conversationId: string; content: string; replyToId?: string; attachmentUrl?: string; attachmentType?: string; messageType?: string;
    }) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        conversation_id: conversationId,
        content,
        reply_to_id: replyToId || null,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
        message_type: messageType || "text",
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ── Mark Read ──
export function useMarkRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await supabase
        .from("conversation_participants" as any)
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ── Create Direct Conversation ──
export function useCreateDirectConversation() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { data: myConvs } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (myConvs?.length) {
        const convIds = (myConvs as any[]).map((c: any) => c.conversation_id);
        const { data: partnerConvs } = await supabase
          .from("conversation_participants" as any)
          .select("conversation_id")
          .eq("user_id", partnerId)
          .in("conversation_id", convIds);

        if (partnerConvs?.length) {
          for (const pc of partnerConvs as any[]) {
            const { data: conv } = await supabase
              .from("conversations" as any)
              .select("id, type")
              .eq("id", pc.conversation_id)
              .eq("type", "direct")
              .maybeSingle();
            if (conv) return conv;
          }
        }
      }

      const { data: newConv, error } = await supabase
        .from("conversations" as any)
        .insert({ type: "direct", created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("conversation_participants" as any).insert([
        { conversation_id: (newConv as any).id, user_id: user!.id, is_admin: true },
        { conversation_id: (newConv as any).id, user_id: partnerId, is_admin: false },
      ]);

      return newConv as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

// ── Create Group Conversation ──
export function useCreateGroupConversation() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, participantIds }: { name: string; participantIds: string[] }) => {
      const { data: conv, error } = await supabase
        .from("conversations" as any)
        .insert({ type: "group", name, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      const allIds = [user!.id, ...participantIds];
      await supabase.from("conversation_participants" as any).insert(
        allIds.map((uid) => ({
          conversation_id: (conv as any).id,
          user_id: uid,
          is_admin: uid === user!.id,
        }))
      );

      await supabase.from("messages").insert({
        conversation_id: (conv as any).id,
        sender_id: user!.id,
        content: `a créé le groupe "${name}"`,
        message_type: "system",
      } as any);

      return conv as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

// ── Edit Message ──
export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content, conversationId }: { messageId: string; content: string; conversationId: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ content, is_edited: true, edited_at: new Date().toISOString() } as any)
        .eq("id", messageId);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (convId) => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
    },
  });
}

// ── Delete Message ──
export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, forEveryone, conversationId }: { messageId: string; forEveryone: boolean; conversationId: string }) => {
      const update = forEveryone
        ? { deleted_for_everyone: true, content: "" }
        : { deleted_for_sender: true };
      const { error } = await supabase.from("messages").update(update as any).eq("id", messageId);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (convId) => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
    },
  });
}

// ── React to Message ──
export function useReactToMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ messageId, emoji, conversationId }: { messageId: string; emoji: string; conversationId: string }) => {
      const { data: existing } = await supabase
        .from("message_reactions" as any)
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("message_reactions" as any).delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("message_reactions" as any).insert({
          message_id: messageId,
          user_id: user!.id,
          emoji,
        });
      }
      return conversationId;
    },
    onSuccess: (convId) => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
    },
  });
}

// ── Search Users ──
export function useSearchUsers(query: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["search-users", query],
    enabled: !!query && query.length >= 2 && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .neq("user_id", user!.id)
        .eq("account_status", "approved")
        .ilike("full_name", `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}