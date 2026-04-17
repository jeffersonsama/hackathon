import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Users, Lock, Globe, Plus, ArrowRight, MessageCircle, Send, Paperclip, UserPlus, Trash2, LogOut, FileText, Crown, Search, ChevronRight, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useGroups, useCreateGroup, useJoinGroup, useGroupDetail, useGroupMembers, useGroupMessages, useSendGroupMessage, useLeaveGroup, useRemoveGroupMember, useAddGroupMember, useDeleteGroup, useMyGroupMembership } from "@/hooks/use-groups";
import { useSearchUsers } from "@/hooks/use-messages";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const createGroup = useCreateGroup();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nom requis"); return; }
    try {
      const group = await createGroup.mutateAsync({ name, description, isPublic });
      toast.success("Groupe créé !");
      setOpen(false);
      setName(""); setDescription("");
      navigate(`/groups/${group.id}`);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 mt-1 rounded-full text-sm font-bold  transition-colors shadow-sm active:scale-95">
          <Plus className="w-4 h-4" /> Créer
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem]">
        <DialogHeader><DialogTitle>Nouveau groupe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du groupe" className="rounded-xl" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="rounded-xl" /></div>
          <div className="flex items-center justify-between">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button onClick={handleCreate} disabled={createGroup.isPending} className="w-full bg-primary text-primary-foreground rounded-xl">
            {createGroup.isPending ? "Création..." : "Valider la création"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: users } = useSearchUsers(query);
  const addMember = useAddGroupMember();

  const handleAdd = async (userId: string) => {
    try {
      await addMember.mutateAsync({ groupId, userId });
      toast.success("Membre ajouté !");
      setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl"><UserPlus className="w-4 h-4 mr-1" /> Ajouter</Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem]">
        <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
        <Input placeholder="Rechercher..." value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3 rounded-xl" />
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {users?.map((u: any) => (
            <button key={u.user_id} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors text-left" onClick={() => handleAdd(u.user_id)}>
              <Avatar className="w-8 h-8">
                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{u.full_name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupDetailView({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: group } = useGroupDetail(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: messages } = useGroupMessages(groupId);
  const sendMessage = useSendGroupMessage();
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveGroupMember();
  const deleteGroup = useDeleteGroup();
  const { data: myMembership } = useMyGroupMembership(groupId);
  const [msgInput, setMsgInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = myMembership?.role === "admin";
  const isMember = !!myMembership;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!msgInput.trim()) return;
    try { await sendMessage.mutateAsync({ groupId, content: msgInput.trim() }); setMsgInput(""); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  if (!group) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const files = (messages || []).filter((m: any) => m.file_url);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/groups")} className="rounded-xl">← Retour</Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {group.is_public ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
          <Badge variant="secondary" className="rounded-lg"><Users className="w-3 h-3 mr-1" />{members?.length || 0}</Badge>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} className="rounded-xl"><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer le groupe</AlertDialogTitle><AlertDialogDescription>Cette action supprimera le groupe "{group?.name}" et tous ses messages. Elle est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { await deleteGroup.mutateAsync(groupId); toast.success("Groupe supprimé"); navigate("/groups"); }}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Quitter le groupe</AlertDialogTitle><AlertDialogDescription>Êtes-vous sûr ?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={async () => { await leaveGroup.mutateAsync(groupId); toast.success("Vous avez quitté le groupe"); navigate("/groups"); }}>Quitter</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Retirer ce membre</AlertDialogTitle><AlertDialogDescription>Ce membre sera retiré du groupe.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (removeMemberId) { await removeMember.mutateAsync({ groupId, userId: removeMemberId }); toast.success("Membre retiré"); } setRemoveMemberId(null); }}>Retirer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="discussion">
        <TabsList><TabsTrigger value="discussion">Discussion</TabsTrigger><TabsTrigger value="members">Membres ({members?.length || 0})</TabsTrigger><TabsTrigger value="files">Fichiers ({files.length})</TabsTrigger></TabsList>

        <TabsContent value="discussion" className="mt-4">
          {isMember ? (
            <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
              <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                {messages && messages.length > 0 ? messages.map((msg: any) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
                      {!isOwn && <Avatar className="w-7 h-7 flex-shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getInitials(msg.senderProfile?.full_name || "?")}</AvatarFallback></Avatar>}
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                        {!isOwn && <p className="text-xs font-semibold mb-0.5">{msg.senderProfile?.full_name}</p>}
                        <p>{msg.content}</p>
                        {msg.file_url && <a href={msg.file_url} target="_blank" className="text-xs underline">📎 Fichier</a>}
                        <p className={`text-[10px] mt-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground text-center py-8">Aucun message. Commencez la discussion !</p>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input placeholder="Écrire un message..." value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-secondary border-0 rounded-xl" />
                <Button size="icon" className="bg-primary text-primary-foreground rounded-xl" onClick={handleSend} disabled={!msgInput.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-[2rem] border border-border p-8 text-center text-muted-foreground">Rejoignez le groupe pour accéder à la discussion</div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="bg-card rounded-[2rem] border border-border p-4 space-y-2">
            {isAdmin && <AddMemberDialog groupId={groupId} />}
            {members?.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50">
                <Avatar className="w-8 h-8">{m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} />}<AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(m.profile?.full_name || "?")}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="text-sm font-medium text-foreground">{m.profile?.full_name}</p></div>
                {m.role === "admin" && <Badge variant="secondary" className="text-xs rounded-lg"><Crown className="w-3 h-3 mr-1" />Admin</Badge>}
                {isAdmin && m.user_id !== user?.id && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRemoveMemberId(m.user_id)}><Trash2 className="w-3 h-3" /></Button>}
              </div>
            ))}
          </div>
          {isMember && !isAdmin && <Button variant="outline" className="mt-3 text-destructive rounded-xl" onClick={() => setLeaveDialogOpen(true)}><LogOut className="w-4 h-4 mr-1" /> Quitter le groupe</Button>}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="bg-card rounded-[2rem] border border-border p-4 space-y-2">
            {files.length > 0 ? files.map((f: any) => (
              <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1"><p className="text-sm text-foreground">{f.file_type || "Fichier"}</p><p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("fr-FR")}</p></div>
              </a>
            )) : <p className="text-sm text-muted-foreground text-center py-4">Aucun fichier partagé</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GroupsPage() {
  const [filter, setFilter] = useState("all");
  const { data: groups, isLoading } = useGroups(filter === "all" ? undefined : filter);
  const joinGroup = useJoinGroup();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: groupId } = useParams<{ id: string }>();
  const [myMembershipIds, setMyMembershipIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("group_members").select("group_id").eq("user_id", user.id).then(({ data }) => {
        setMyMembershipIds(new Set((data || []).map((m) => m.group_id)));
      });
    });
  }, [user, groups]);

  if (groupId) return <GroupDetailView groupId={groupId} />;

  const handleJoin = (groupId: string) => {
    joinGroup.mutate(groupId, {
      onSuccess: () => { toast.success("Vous avez rejoint le groupe !"); navigate(`/groups/${groupId}`); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const displayGroups = (groups || []).filter((g: any) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full w-full bg-background pb-24 md:pb-6">

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 md:px-6 pt-5 pb-3">

          <div className="flex items-center justify-between mb-3 ">    
              <h1 className="text-xl font-bold text-foreground">Groupes</h1>
              <CreateGroupDialog />
          </div>
          <div className="relative group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Trouver un groupe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-secondary border border-border rounded-full text-[14px] font-medium text-foreground placeholder:text-muted-foreground focus:bg-card focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-4 mt-2">
          {[{ id: "all", label: "Tous" }, { id: "mine", label: "Mes groupes" }, { id: "public", label: "Public" }].map((tab) => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6">
        <div className="w-full max-w-2xl mx-auto mt-5">
        {/* Section label */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-[2rem] p-5 shadow-card border border-border flex gap-4"><Skeleton className="w-16 h-16 rounded-[20px]" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div></div>
          ))
        ) : displayGroups.length > 0 ? (
          displayGroups.map((group: any, i: number) => {
            const memberCount = (group.group_members as any)?.[0]?.count || 0;
            const initials = getInitials(group.name);
            const isMember = myMembershipIds.has(group.id);

            return (
              <motion.div key={group.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <article
                  onClick={() => isMember ? navigate(`/groups/${group.id}`) : undefined}
                  className="bg-card p-5 shadow-card border border-border rounded-[2rem] flex gap-4 items-center group cursor-pointer hover:bg-secondary/50 transition-all"
                >
                  <Avatar className="w-16 h-16 rounded-[20px] shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-xl rounded-[20px]">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-md font-bold text-foreground truncate">{group.name}</h3>
                      {group.is_public ? <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      {group.class_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-lg">Classe</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2 font-medium">{group.description}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">{memberCount} membres</span>
                    </div>
                  </div>

                  {isMember ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-all" onClick={() => navigate(`/groups/${group.id}`)}>
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </div>
                  ) : group.is_public ? (
                    <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={(e) => { e.stopPropagation(); handleJoin(group.id); }}>
                      Rejoindre
                    </Button>
                  ) : null}
                </article>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center">
            <Hash className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">Aucun groupe trouvé</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
