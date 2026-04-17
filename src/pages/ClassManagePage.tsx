import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Copy, Trash2, Upload, FileText, Link as LinkIcon, X, Settings, RefreshCw, MessageCircle, Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClassMessages, useSendClassMessage } from "@/hooks/use-class-messages";

function useClassDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["classroom-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("classrooms").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

function useClassMembers(id: string | undefined) {
  return useQuery({
    queryKey: ["classroom-members", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_members")
        .select("*, profiles:user_id(full_name, avatar_url, user_id)")
        .eq("classroom_id", id!)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useClassResources(id: string | undefined) {
  return useQuery({
    queryKey: ["classroom-resources", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("classroom_resources")
        .select("*")
        .eq("classroom_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function useRemoveClassMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, classroomId }: { memberId: string; classroomId: string }) => {
      const { error } = await supabase.from("classroom_members").delete().eq("id", memberId);
      if (error) throw error;
      return classroomId;
    },
    onSuccess: (classroomId) => {
      qc.invalidateQueries({ queryKey: ["classroom-members", classroomId] });
      toast.success("✅ Membre retiré");
    },
    onError: (e: any) => toast.error(`❌ Erreur : ${e.message}`),
  });
}

function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ resourceId, classroomId }: { resourceId: string; classroomId: string }) => {
      const { error } = await (supabase as any).from("classroom_resources").delete().eq("id", resourceId);
      if (error) throw error;
      return classroomId;
    },
    onSuccess: (classroomId) => {
      qc.invalidateQueries({ queryKey: ["classroom-resources", classroomId] });
      toast.success("✅ Ressource supprimée");
    },
    onError: (e: any) => toast.error(`❌ Erreur : ${e.message}`),
  });
}

export default function ClassManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: classroom, isLoading } = useClassDetail(id);
  const { data: members } = useClassMembers(id);
  const { data: resources } = useClassResources(id);
  const removeMember = useRemoveClassMember();
  const deleteResource = useDeleteResource();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", subject: "" });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [resForm, setResForm] = useState({ title: "", file_url: "", file_type: "link" });
  const [showResForm, setShowResForm] = useState(false);
  const [savingRes, setSavingRes] = useState(false);

  // ✅ Guard dans useEffect — pas dans le corps du rendu
  useEffect(() => {
    if (!isLoading && classroom && user) {
      if (classroom.created_by !== user.id) {
        toast.error("Accès refusé — vous n'êtes pas le créateur de cette classe");
        navigate("/classrooms");
      }
    }
  }, [isLoading, classroom, user, navigate]);

  if (isLoading || !user) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-[24px]" />
      </div>
    );
  }
  if (!classroom) return <div className="p-6 text-center text-muted-foreground">Classe non trouvée</div>;
  if (classroom.created_by !== user.id) return null;

  const copyCode = () => { navigator.clipboard.writeText(classroom.invite_code); toast.success("Code copié !"); };

  const handleRegenerateCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 8);
    const { error } = await supabase.from("classrooms").update({ invite_code: newCode }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Nouveau code généré");
    qc.invalidateQueries({ queryKey: ["classroom-detail", id] });
  };

  const handleEditClass = async () => {
    try {
      const { error } = await supabase.from("classrooms").update({
        name: editForm.name, description: editForm.description, subject: editForm.subject,
      }).eq("id", id!);
      if (error) throw error;
      toast.success("✅ Classe modifiée");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["classroom-detail", id] });
      qc.invalidateQueries({ queryKey: ["teacher-classrooms"] });
    } catch (err: any) { toast.error(`❌ Erreur : ${err.message}`); }
  };

  const handleDeleteClass = async () => {
    if (deleteConfirm !== classroom.name) { toast.error("Le nom ne correspond pas"); return; }
    try {
      const { error } = await supabase.from("classrooms").delete().eq("id", id!);
      if (error) throw error;
      toast.success("✅ Classe supprimée");
      qc.invalidateQueries({ queryKey: ["teacher-classrooms"] });
      navigate("/classrooms");
    } catch (err: any) { toast.error(`❌ Erreur : ${err.message}`); }
  };

  // Upload fichier → storage → sauvegarde en BDD
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `classrooms/${id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("course-resources").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("course-resources").getPublicUrl(path);
      const ft = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "pdf";
      // Pré-remplir le formulaire pour que le prof confirme le titre
      setResForm({ title: file.name.replace(/\.[^/.]+$/, ""), file_url: urlData.publicUrl, file_type: ft });
      setShowResForm(true);
      toast.success("✅ Fichier uploadé — confirmez le titre ci-dessous");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  // Sauvegarder la ressource en BDD
  const handleSaveResource = async () => {
    if (!resForm.title.trim() || !resForm.file_url.trim()) {
      toast.error("Titre et URL requis"); return;
    }
    setSavingRes(true);
    try {
      const { error } = await (supabase as any).from("classroom_resources").insert({
        classroom_id: id!, title: resForm.title, file_url: resForm.file_url, file_type: resForm.file_type,
      });
      if (error) throw error;
      toast.success("✅ Ressource ajoutée");
      setShowResForm(false);
      setResForm({ title: "", file_url: "", file_type: "link" });
      qc.invalidateQueries({ queryKey: ["classroom-resources", id] });
    } catch (err: any) { toast.error(`❌ Erreur : ${err.message}`); }
    finally { setSavingRes(false); }
  };

  const studentMembers = (members || []).filter((m: any) => m.role !== "teacher");

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-0 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classrooms")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{classroom.name}</h1>
          <p className="text-sm text-muted-foreground">Gestion de la classe · {studentMembers.length} étudiants</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Code d'invitation */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5">
            <span className="text-sm font-mono text-foreground">{classroom.invite_code}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyCode}><Copy className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRegenerateCode}><RefreshCw className="w-3 h-3" /></Button>
          </div>
          {/* Modifier */}
          <Button variant="outline" size="sm" onClick={() => { setEditForm({ name: classroom.name, description: classroom.description || "", subject: classroom.subject || "" }); setEditOpen(true); }}>
            <Settings className="w-3 h-3 mr-1" />Modifier
          </Button>
          {/* Supprimer */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                <Trash2 className="w-3 h-3 mr-1" />Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[24px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la classe ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {studentMembers.length} membres seront retirés. Tapez « {classroom.name} » pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={classroom.name} className="rounded-xl" />
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteClass} className="rounded-xl bg-destructive text-destructive-foreground"
                  disabled={deleteConfirm !== classroom.name}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Dialog modifier */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border rounded-[24px]">
          <DialogHeader><DialogTitle className="text-xl font-bold">Modifier la classe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom</Label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" /></div>
            <div><Label>Matière</Label><Input value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} className="rounded-xl mt-1" /></div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} className="rounded-xl mt-1" /></div>
            <Button className="w-full rounded-xl py-5 font-bold" onClick={handleEditClass}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onglets */}
      <Tabs defaultValue="discussion">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="discussion" className="rounded-xl font-bold">
            <MessageCircle className="w-4 h-4 mr-1" />Discussion
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl font-bold">
            <Users className="w-4 h-4 mr-1" />Membres ({studentMembers.length})
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-xl font-bold">
            <FileText className="w-4 h-4 mr-1" />Contenu ({(resources || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Chat */}
        <TabsContent value="discussion" className="mt-4">
          <ClassChat classroomId={id!} />
        </TabsContent>

        {/* Membres */}
        <TabsContent value="members" className="space-y-3 mt-4">
          {!studentMembers.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucun étudiant dans cette classe</p>
              <p className="text-sm mt-1">Partagez le code <strong className="font-mono">{classroom.invite_code}</strong></p>
            </div>
          ) : studentMembers.map((m: any) => (
            <Card key={m.id} className="bg-card border-border rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(m.profiles as any)?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {((m.profiles as any)?.full_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{(m.profiles as any)?.full_name || "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground">Rejoint le {new Date(m.joined_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={() => removeMember.mutate({ memberId: m.id, classroomId: id! })}>
                  <X className="w-4 h-4 mr-1" />Retirer
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Contenu — upload prof + liste ressources */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {/* Boutons upload — prof uniquement */}
          <div className="flex justify-end gap-2 flex-wrap">
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.mp4,.zip" />
            <Button variant="outline" className="rounded-xl" onClick={() => { setResForm({ title: "", file_url: "", file_type: "link" }); setShowResForm(true); }}>
              <LinkIcon className="w-4 h-4 mr-2" />Ajouter un lien
            </Button>
            <Button className="rounded-xl" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />{uploading ? "Upload en cours..." : "Uploader un fichier"}
            </Button>
          </div>

          {/* Formulaire confirmation ressource */}
          {showResForm && (
            <Card className="bg-card border-border rounded-2xl animate-in fade-in slide-in-from-top-2">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-bold text-foreground">Confirmer la ressource</p>
                <div>
                  <Label>Titre *</Label>
                  <Input placeholder="Ex: Cours Chapitre 1 – Introduction" value={resForm.title}
                    onChange={e => setResForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input placeholder="https://..." value={resForm.file_url}
                    onChange={e => setResForm(p => ({ ...p, file_url: e.target.value }))} className="rounded-xl mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl" onClick={handleSaveResource} disabled={savingRes}>
                    {savingRes ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowResForm(false)}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des ressources */}
          {resources && resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map((res: any) => (
                <Card key={res.id} className="bg-card border-border rounded-2xl">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {res.file_type === "link" ? <LinkIcon className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{res.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {res.file_type} · {new Date(res.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => deleteResource.mutate({ resourceId: res.id, classroomId: id! })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !showResForm && (
            <div className="py-12 border-2 border-dashed border-border rounded-2xl text-center">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-bold">Aucune ressource partagée</p>
              <p className="text-sm text-muted-foreground mt-1">Uploadez un fichier ou ajoutez un lien externe.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClassChat({ classroomId }: { classroomId: string }) {
  const { data: messages } = useClassMessages(classroomId);
  const sendMessage = useSendClassMessage();
  const { user } = useAuth();
  const [msgInput, setMsgInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!msgInput.trim()) return;
    try {
      await sendMessage.mutateAsync({ classroomId, content: msgInput.trim() });
      setMsgInput("");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Card className="bg-card border-border rounded-[24px] overflow-hidden">
      <CardContent className="p-0 flex flex-col h-[480px]">
        <div className="bg-secondary/30 border-b border-border px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[15px]">Discussion</h3>
            <p className="text-[11px] text-muted-foreground">Messages en direct</p>
          </div>
          <MessageCircle className="w-5 h-5 text-muted-foreground/50" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/10">
          {messages && messages.length > 0 ? messages.map((msg: any) => {
            const isOwn = msg.sender_id === user?.id;
            const initials = (msg.senderProfile?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
                {!isOwn && (
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    {msg.senderProfile?.avatar_url && <AvatarImage src={msg.senderProfile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white dark:bg-secondary text-foreground rounded-bl-sm border border-border"}`}>
                  {!isOwn && <p className="text-xs font-semibold text-primary mb-0.5">{msg.senderProfile?.full_name}</p>}
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center h-full opacity-60">
              <MessageCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold">Aucun message pour l'instant</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input placeholder="Écrire un message..." value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 bg-secondary border-0 rounded-xl" />
          <Button size="icon" className="bg-primary text-primary-foreground rounded-xl shrink-0 active:scale-95"
            onClick={handleSend} disabled={!msgInput.trim() || sendMessage.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}