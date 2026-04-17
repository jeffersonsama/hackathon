import { useState } from "react";
import { Search, PenSquare, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConversationItem, useSearchUsers } from "@/hooks/use-messages";
import { presenceColor } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

interface Props {
  conversations: ConversationItem[] | undefined;
  isLoading: boolean;
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onNewDirect: (userId: string) => void;
  onNewGroup: () => void;
}

function NewDirectDialog({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (userId: string) => void }) {
  const [q, setQ] = useState("");
  const { data: users } = useSearchUsers(q);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
        <Input placeholder="Rechercher un utilisateur..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {users?.map((u: any) => (
            <button key={u.user_id} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
              onClick={() => { onSelect(u.user_id); onClose(); setQ(""); }}>
              <Avatar className="w-8 h-8">
                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{u.full_name}</span>
            </button>
          ))}
          {q.length >= 2 && (!users || users.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Aucun résultat</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ConversationSidebar({ conversations, isLoading, activeConvId, onSelectConv, onNewDirect, onNewGroup }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const filtered = conversations?.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "unread" && c.unreadCount === 0) return false;
    if (filter === "groups" && c.type !== "group") return false;
    return true;
  });

  return (
    <div className="w-full md:w-[400px] border-r border-border flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            <p className="text-sm text-muted-foreground">Toutes vos conversations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setNewDialogOpen(true)}>
              <PenSquare className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onNewGroup}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Chercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 bg-secondary border border-border rounded-full text-sm focus:ring-0" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
          {(["all", "unread", "groups"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === f ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}>
              {f === "all" ? "Tout" : f === "unread" ? "Non lus" : "Groupes"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 ">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Chargement...</div>
        ) : filtered && filtered.length > 0 ? (
          filtered.map((conv) => (
            <button key={conv.id} onClick={() => onSelectConv(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors bg-card hover:bg-secondary/50 ",
                activeConvId === conv.id ? "bg-secondary border-primary" : ""
              )}>
              <div className={cn(
                "relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-border",
                conv.type === "group" ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white" : "bg-secondary text-foreground"
              )}>
                {conv.avatarUrl ? (
                  <img src={conv.avatarUrl} alt={conv.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{getInitials(conv.name)}</span>
                )}
                {conv.type === "direct" && conv.partnerPresence?.status && conv.partnerPresence.status !== "offline" && (
                  <span className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background", presenceColor(conv.partnerPresence.status))} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <span className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                    {conv.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className={cn("text-[13px] truncate", conv.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground")}>{conv.lastMessagePreview || "Nouveau message"}</p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Aucune conversation</p>
            <Button variant="link" size="sm" className="text-primary" onClick={() => setNewDialogOpen(true)}>
              Envoyer un message
            </Button>
          </div>
        )}
      </div>

      <NewDirectDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} onSelect={onNewDirect} />
    </div>
  );
}
