import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ArrowLeft, Phone, Video, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConversationItem, MessageItem, useSendMessage, useMarkRead, useEditMessage, useDeleteMessage, useReactToMessage } from "@/hooks/use-messages";
import { formatPresence } from "@/hooks/use-presence";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import AudioRecorder from "./AudioRecorder";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function groupByDate(messages: MessageItem[]) {
  const groups: { date: string; messages: MessageItem[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = new Date(msg.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const label = d === today ? "Aujourd'hui" : d === yesterday ? "Hier" : d;
    if (label !== currentDate) {
      currentDate = label;
      groups.push({ date: label, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// Détecter le format audio supporté par le navigateur
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

interface Props {
  conversation: ConversationItem | null;
  messages: MessageItem[] | undefined;
  onBack: () => void;
  onToggleInfo: () => void;
  onInitiateCall: (type: "audio" | "video") => void;
}

export default function ChatPanel({ conversation, messages, onBack, onToggleInfo, onInitiateCall }: Props) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [editingMsg, setEditingMsg] = useState<MessageItem | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMsg = useSendMessage();
  const markRead = useMarkRead();
  const editMsg = useEditMessage();
  const deleteMsg = useDeleteMessage();
  const reactMsg = useReactToMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      markRead.mutate(conversation.id);
    }
  }, [conversation?.id]);

  const handleSend = async () => {
    if (!input.trim() || !conversation) return;
    try {
      if (editingMsg) {
        await editMsg.mutateAsync({ messageId: editingMsg.id, content: input.trim(), conversationId: conversation.id });
        setEditingMsg(null);
      } else {
        await sendMsg.mutateAsync({ conversationId: conversation.id, content: input.trim(), replyToId: replyTo?.id });
        setReplyTo(null);
      }
      setInput("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSendAudio = async (blob: Blob, durationSec: number) => {
    if (!conversation || !user) return;
    try {
      // ✅ Détecter le format supporté par le navigateur
      const mimeType = getSupportedMimeType() || blob.type || "audio/webm";
      const ext = mimeType.includes("mp4") ? "mp4"
        : mimeType.includes("ogg") ? "ogg"
        : "webm";

      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("messages-files")
        .upload(fileName, blob, { contentType: mimeType });
      if (upErr) throw upErr;

      // ✅ Stocker le path (fileName) et non l'URL publique
      await sendMsg.mutateAsync({
        conversationId: conversation.id,
        content: `🎙️ Message vocal (${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, "0")})`,
        attachmentUrl: fileName,
        attachmentType: mimeType,
        messageType: "audio_note",
      });
      setIsRecording(false);
    } catch (err: any) {
      toast.error("Erreur envoi audio: " + err.message);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary">
        <div className="text-center px-6">
          <Send className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-semibold">Sélectionnez une conversation</p>
          <p className="text-sm text-muted-foreground mt-1">ou commencez-en une nouvelle</p>
        </div>
      </div>
    );
  }

  const dateGroups = groupByDate(messages || []);
  const isGroup = conversation.type === "group";
  const presenceText = !isGroup && conversation.partnerPresence
    ? formatPresence(conversation.partnerPresence.status, conversation.partnerPresence.last_seen_at)
    : isGroup ? `${conversation.participants.length} participants` : "";

  return (
    <div className="flex-1 flex flex-col h-full bg-card">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-6 h-20 flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className={cn(
          "relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-border",
          isGroup ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white" : "bg-secondary text-foreground"
        )}>
          {conversation.avatarUrl
            ? <AvatarImage src={conversation.avatarUrl} />
            : <AvatarFallback className="text-sm font-semibold">{getInitials(conversation.name)}</AvatarFallback>
          }
          {!isGroup && conversation.partnerPresence?.status === "online" && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{conversation.name}</p>
          {presenceText && <p className="text-xs text-muted-foreground truncate">{presenceText}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-secondary" onClick={() => onInitiateCall("audio")}>
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-secondary" onClick={() => onInitiateCall("video")}>
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-secondary" onClick={onToggleInfo}>
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-secondary px-4 py-5 space-y-4">
        {dateGroups.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center py-2">
              <span className="text-xs text-muted-foreground bg-card border border-border px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            {group.messages.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id;
              const prevMsg = i > 0 ? group.messages[i - 1] : null;
              const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id || prevMsg.message_type === "system");
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  isGroup={isGroup}
                  onReply={() => setReplyTo(msg)}
                  onEdit={() => { setEditingMsg(msg); setInput(msg.content); }}
                  onDelete={(forEveryone) => deleteMsg.mutate({ messageId: msg.id, forEveryone, conversationId: conversation.id })}
                  onReact={(emoji) => reactMsg.mutate({ messageId: msg.id, emoji, conversationId: conversation.id })}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de saisie */}
      <div className="bg-card border-t border-border p-4">
        {(replyTo || editingMsg) && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-secondary px-3 py-2">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">
                {editingMsg ? "Modifier le message" : `Répondre à ${replyTo?.senderName}`}
              </p>
              <p className="text-xs text-muted-foreground truncate">{(editingMsg || replyTo)?.content}</p>
            </div>
            <button
              onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(""); }}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 hover:bg-secondary">
            <Paperclip className="w-4 h-4" />
          </Button>
          <div className="flex-1 bg-secondary border border-border rounded-full px-4">
            <textarea
              placeholder="Écrivez un message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full p-2 resize-none bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              style={{ height: "auto", overflow: "hidden" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
          </div>
          {input.trim() ? (
            <Button
              size="icon"
              className="h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <AudioRecorder
              isRecording={isRecording}
              onStartRecording={() => setIsRecording(true)}
              onSend={handleSendAudio}
              onCancel={() => setIsRecording(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
