import { X, User, LogOut, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConversationItem } from "@/hooks/use-messages";
import { formatPresence, presenceColor } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

interface Props {
  conversation: ConversationItem;
  onClose: () => void;
}

export default function InfoPanel({ conversation, onClose }: Props) {
  const navigate = useNavigate();
  const isGroup = conversation.type === "group";

  return (
    <div className="w-80 border-l border-border flex flex-col h-full bg-card">
      <div className="h-16 px-4 flex items-center justify-between border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm text-foreground">Détails</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              {conversation.avatarUrl && <AvatarImage src={conversation.avatarUrl} />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{getInitials(conversation.name)}</AvatarFallback>
            </Avatar>
            {!isGroup && conversation.partnerPresence?.status && conversation.partnerPresence.status !== "offline" && (
              <span className={cn("absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card", presenceColor(conversation.partnerPresence.status))} />
            )}
          </div>
          <h4 className="font-bold text-foreground mt-3">{conversation.name}</h4>
          {!isGroup && conversation.partnerPresence && (
            <p className={cn("text-xs mt-0.5", conversation.partnerPresence.status === "online" ? "text-green-600" : "text-muted-foreground")}>
              {formatPresence(conversation.partnerPresence.status, conversation.partnerPresence.last_seen_at)}
            </p>
          )}
          {isGroup && (
            <p className="text-xs text-muted-foreground mt-0.5">{conversation.participants.length} participants</p>
          )}
        </div>

        {/* Direct: View Profile */}
        {!isGroup && conversation.partnerId && (
          <div className="px-4 mb-4">
            <Button variant="outline" className="w-full" onClick={() => navigate(`/profile/${conversation.partnerId}`)}>
              <User className="w-4 h-4 mr-2" />Voir le profil
            </Button>
          </div>
        )}

        {/* Group: Participants */}
        {isGroup && (
          <div className="px-4 mb-4">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Participants</h5>
            <div className="space-y-2">
              {conversation.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(p.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{p.fullName}</span>
                  </div>
                  {p.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 mt-auto pb-6 space-y-2">
          {isGroup && (
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />Quitter le groupe
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
