import { useState, useEffect } from "react";
import { Check, CheckCheck, MoreVertical, Reply, Pencil, Trash2, Copy, Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageItem } from "@/hooks/use-messages";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Hook URL signée — gère les anciens messages (URL complète) et les nouveaux (path) ──
function useSignedUrl(pathOrUrl: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) return;

    // Si c'est déjà une URL complète (anciens messages publics), l'utiliser directement
    if (pathOrUrl.startsWith("http")) {
      setUrl(pathOrUrl);
      return;
    }

    // Sinon générer une URL signée valable 1h
    supabase.storage
      .from("messages-files")
      .createSignedUrl(pathOrUrl, 3600)
      .then(({ data, error }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [pathOrUrl]);

  return url;
}

// ── Lecteur audio sécurisé ──
function AudioMessage({ path, mimeType }: { path: string; mimeType: string | null }) {
  const signedUrl = useSignedUrl(path);

  if (!signedUrl) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 text-xs text-muted-foreground">
        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <audio controls className="max-w-[220px] h-8">
      <source src={signedUrl} type={mimeType || "audio/webm"} />
      Votre navigateur ne supporte pas la lecture audio.
    </audio>
  );
}

interface Props {
  message: MessageItem;
  isOwn: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: (forEveryone: boolean) => void;
  onReact: (emoji: string) => void;
}

export default function MessageBubble({
  message, isOwn, showAvatar, isGroup,
  onReply, onEdit, onDelete, onReact,
}: Props) {
  const [showEmojis, setShowEmojis] = useState(false);

  // Message supprimé
  if (message.deleted_for_everyone) {
    return (
      <div className={cn("flex mb-1", isOwn ? "justify-end" : "justify-start")}>
        <div className="px-4 py-2 rounded-2xl bg-muted/50 text-muted-foreground italic text-sm">
          🚫 Message supprimé
        </div>
      </div>
    );
  }

  // Message système
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-1 rounded-full">
          {message.senderName} {message.content}
        </span>
      </div>
    );
  }

  // Log d'appel
  if (message.message_type === "call_log") {
    const isMissed = message.call_status === "missed" || message.call_status === "declined";
    const isAudio = message.content?.includes("audio");
    const durMin = message.duration_seconds ? Math.floor(message.duration_seconds / 60) : 0;
    const durSec = message.duration_seconds ? message.duration_seconds % 60 : 0;

    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
          {isAudio
            ? <Phone className={cn("w-3.5 h-3.5", isMissed ? "text-destructive" : "text-green-500")} />
            : <Video className={cn("w-3.5 h-3.5", isMissed ? "text-destructive" : "text-green-500")} />
          }
          <span>
            {message.content}
            {isMissed ? " manqué" : ""}
            {message.duration_seconds ? ` · ${durMin}:${durSec.toString().padStart(2, "0")}` : ""}
          </span>
        </div>
      </div>
    );
  }

  const time = new Date(message.sent_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      className={cn("flex mb-1 group", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowEmojis(true)}
      onMouseLeave={() => setShowEmojis(false)}
    >
      {/* Avatar */}
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 mr-2 mt-auto flex-shrink-0">
          {message.senderAvatar && <AvatarImage src={message.senderAvatar} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(message.senderName || "U")}
          </AvatarFallback>
        </Avatar>
      )}
      {!isOwn && !showAvatar && <div className="w-8 mr-2 flex-shrink-0" />}

      <div className="relative max-w-[70%]">
        {/* Aperçu réponse */}
        {message.replyPreview && (
          <div className={cn(
            "px-3 py-1.5 mb-0.5 rounded-t-xl text-xs border-l-2 border-primary",
            isOwn ? "bg-primary/20 text-primary-foreground/80" : "bg-secondary/80 text-foreground/80"
          )}>
            <span className="font-semibold text-primary">{message.replyPreview.senderName}</span>
            <p className="truncate">{message.replyPreview.content}</p>
          </div>
        )}

        {/* Bulle */}
        <div className={cn(
          "px-3.5 py-2 text-sm relative",
          isOwn
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "bg-secondary text-foreground rounded-2xl rounded-bl-md",
          message.replyPreview ? "rounded-t-none" : ""
        )}>
          {/* Nom expéditeur dans les groupes */}
          {!isOwn && isGroup && showAvatar && (
            <p className="text-xs font-semibold text-primary mb-0.5">{message.senderName}</p>
          )}

          {/* ✅ Message vocal — URL signée sécurisée */}
          {message.message_type === "audio_note" && message.attachment_url && (
            <div className="flex items-center gap-2 my-1">
              <AudioMessage
                path={message.attachment_url}
                mimeType={message.attachment_type}
              />
            </div>
          )}

          {/* Image */}
          {message.message_type === "image" && message.attachment_url && (
            <img
              src={message.attachment_url}
              alt=""
              className="rounded-lg max-w-full mb-1 cursor-pointer"
            />
          )}

          {/* Texte — ne pas afficher pour les audio_note (le contenu est juste un label) */}
          {message.content && message.message_type !== "audio_note" && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Fichier joint */}
          {message.attachment_url && message.message_type === "file" && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline mt-1 block"
            >
              📎 Fichier joint
            </a>
          )}

          {/* Heure + statut */}
          <div className={cn("flex items-center gap-1 mt-0.5", isOwn ? "justify-end" : "")}>
            <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
              {time}
            </span>
            {message.is_edited && (
              <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70")}>
                (modifié)
              </span>
            )}
            {isOwn && <CheckCheck className="w-3 h-3 text-primary-foreground/70" />}
          </div>
        </div>

        {/* Réactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                  r.reacted
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted border-border hover:border-primary/30"
                )}
              >
                {r.emoji} {r.count > 1 && <span className="text-muted-foreground">{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Actions au survol */}
        {showEmojis && (
          <div className={cn(
            "absolute top-0 flex items-center gap-0.5 bg-card border border-border rounded-full shadow-lg px-1 py-0.5 z-10",
            isOwn ? "left-0 -translate-x-full -ml-1" : "right-0 translate-x-full mr-1"
          )}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="w-6 h-6 hover:scale-125 transition-transform text-sm"
              >
                {e}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded-full">
                  <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-48">
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="w-4 h-4 mr-2" />Répondre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                  <Copy className="w-4 h-4 mr-2" />Copier
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />Modifier
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(false)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Supprimer pour moi
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem onClick={() => onDelete(true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />Supprimer pour tous
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
