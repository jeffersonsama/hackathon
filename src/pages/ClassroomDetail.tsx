import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, MessageCircle, Send, Download, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export default function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: classroom, isLoading } = useClassDetail(id);
  const { data: members } = useClassMembers(id);
  const { data: resources } = useClassResources(id);

  // ✅ Guard dans useEffect — évite la redirection pendant le rendu
  useEffect(() => {
    if (!isLoading && classroom && user && members !== undefined) {
      const isOwner = classroom.created_by === user.id;
      const isMember = (members || []).some((m: any) => m.user_id === user.id);
      if (!isOwner && !isMember) {
        toast.error("Vous ne faites pas partie de cette classe.");
        navigate("/classrooms");
      }
      // Si c'est le prof, le rediriger vers la page de gestion
      if (isOwner) {
        navigate(`/classrooms/${id}/manage`, { replace: true });
      }
    }
  }, [isLoading, classroom, user, members, id, navigate]);

  if (isLoading || !user) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-12 w-1/3 rounded-2xl" />
        <Skeleton className="h-[400px] rounded-[24px]" />
      </div>
    );
  }
  if (!classroom) return <div className="p-6 text-center text-muted-foreground">Classe introuvable</div>;

  const studentMembers = (members || []).filter((m: any) => m.role !== "teacher");
  const teacherMember = (members || []).find((m: any) => m.role === "teacher");

  return (
    <div className="flex flex-col w-full max-w-[420px] md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-0 pb-24 pt-4 md:pt-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-card border border-border shadow-sm rounded-[24px] p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        <div className="flex items-start gap-4 relative z-10">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-secondary/80 shrink-0 mt-0.5"
            onClick={() => navigate("/classrooms")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-sm text-muted-foreground mt-1">{classroom.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-secondary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> {studentMembers.length} étudiants
              </span>
              {classroom.subject && (
                <Badge variant="secondary" className="rounded-full">{classroom.subject}</Badge>
              )}
              {teacherMember && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  Prof : {(teacherMember.profiles as any)?.full_name || "Enseignant"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="discussion" className="w-full">
        <TabsList className="w-full max-w-sm grid grid-cols-3 bg-secondary/50 rounded-2xl p-1 shadow-inner h-12">
          <TabsTrigger value="discussion" className="rounded-xl font-bold data-[state=active]:shadow-sm">
            <MessageCircle className="w-4 h-4 mr-1 hidden sm:block" />Chat
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-xl font-bold data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-1 hidden sm:block" />Cours
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl font-bold data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-1 hidden sm:block" />Membres
          </TabsTrigger>
        </TabsList>

        {/* Chat */}
        <TabsContent value="discussion" className="mt-6">
          <ClassChat classroomId={id!} />
        </TabsContent>

        {/* Documents — lecture seule pour les étudiants */}
        <TabsContent value="content" className="mt-6">
          <div className="bg-white dark:bg-card rounded-[24px] shadow-sm border border-border p-6">
            <div className="mb-6">
              <h3 className="font-bold text-lg">Ressources & Cours</h3>
              <p className="text-sm text-muted-foreground">Documents partagés par le professeur</p>
            </div>

            {resources && resources.length > 0 ? (
              <div className="space-y-3">
                {resources.map((res: any) => (
                  <a
                    key={res.id}
                    href={res.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-secondary/40 hover:bg-secondary rounded-2xl transition-colors group border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {res.file_type === "link"
                        ? <LinkIcon className="w-5 h-5 text-primary" />
                        : <FileText className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{res.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(res.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground font-bold">Aucune ressource pour l'instant</p>
                <p className="text-sm text-muted-foreground mt-1">Le professeur n'a pas encore partagé de documents.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Membres */}
        <TabsContent value="members" className="mt-6">
          <div className="bg-white dark:bg-card rounded-[24px] shadow-sm border border-border p-6">
            <h3 className="font-bold text-lg mb-4">Étudiants inscrits ({studentMembers.length})</h3>
            {!studentMembers.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun étudiant inscrit pour l'instant.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl border border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(m.profiles as any)?.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {((m.profiles as any)?.full_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">
                        {(m.profiles as any)?.full_name || "Utilisateur"}
                        {m.user_id === user?.id && (
                          <span className="ml-2 text-[10px] text-primary font-normal">(vous)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Depuis {new Date(m.joined_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    <div className="bg-white dark:bg-card shadow-sm border border-border rounded-[24px] overflow-hidden flex flex-col h-[550px]">
      <div className="bg-secondary/30 border-b border-border px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[15px]">Discussion de classe</h3>
          <p className="text-[11px] text-muted-foreground">Messages en direct</p>
        </div>
        <MessageCircle className="w-5 h-5 text-muted-foreground/50" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/10">
        {messages && messages.length > 0 ? messages.map((msg: any) => {
          const isOwn = msg.sender_id === user?.id;
          const initials = (msg.senderProfile?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
              {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-auto shadow-sm">
                  {msg.senderProfile?.avatar_url && <AvatarImage src={msg.senderProfile.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-[18px] text-[14px] shadow-sm ${isOwn ? "bg-primary text-white rounded-br-sm" : "bg-white dark:bg-secondary text-foreground rounded-bl-sm border border-border"}`}>
                {!isOwn && <p className="text-[11px] font-bold text-primary mb-1">{msg.senderProfile?.full_name}</p>}
                <p className="leading-snug">{msg.content}</p>
                <p className={`text-[9px] mt-1 text-right font-medium ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <MessageCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold">Lancez la discussion !</p>
            <p className="text-xs text-muted-foreground mt-1">Dites bonjour à votre promotion.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-card border-t border-border flex gap-3">
        <Input
          placeholder="Écrire un message à la classe..."
          value={msgInput}
          onChange={e => setMsgInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="flex-1 rounded-[18px] py-6 px-5 border-border text-[14px]"
        />
        <Button size="icon" className="h-[50px] w-[50px] rounded-[18px] bg-primary text-primary-foreground shadow-md active:scale-95 shrink-0"
          onClick={handleSend} disabled={!msgInput.trim() || sendMessage.isPending}>
          <Send className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}