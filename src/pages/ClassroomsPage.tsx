import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Plus, Users, Copy, LogIn, Settings, ChevronRight, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateClassroom, useJoinClassroomByCode } from "@/hooks/use-classrooms";
import { useTeacherClassrooms } from "@/hooks/use-teacher-data";
import { useStudentClassrooms } from "@/hooks/use-student-data";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function useFacultiesAndPromotions() {
  return useQuery({
    queryKey: ["faculties-promotions"],
    queryFn: async () => {
      const [{ data: faculties }, { data: promotions }] = await Promise.all([
        (supabase as any).from("faculties").select("id, name").order("name"),
        (supabase as any).from("promotions").select("id, name, year, faculty_id").order("year", { ascending: false }),
      ]);
      return { faculties: faculties || [], promotions: promotions || [] };
    },
  });
}

export default function ClassroomsPage() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isTeacher = hasRole("teacher");

  const { data: teacherClassrooms, isLoading: teacherLoading } = useTeacherClassrooms();
  const { data: studentClassrooms, isLoading: studentLoading } = useStudentClassrooms();
  const { data: facultiesData } = useFacultiesAndPromotions();

  const createClassroom = useCreateClassroom();
  const joinByCode = useJoinClassroomByCode();

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"manual" | "promotion">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedPromotion, setSelectedPromotion] = useState("");
  const [promoClassroomName, setPromoClassroomName] = useState("");
  const [promoSubject, setPromoSubject] = useState("");
  const [addingByPromo, setAddingByPromo] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = isTeacher ? teacherLoading : studentLoading;

  const classrooms = isTeacher
    ? (teacherClassrooms || []).map((cls: any) => ({
        id: cls.id, name: cls.name, subject: cls.subject,
        invite_code: cls.invite_code, created_by: cls.created_by,
        memberCount: cls.classroom_members?.[0]?.count || 0,
        teacherName: null, isOwner: true,
      }))
    : (studentClassrooms || []).map((m: any) => ({
        id: m.classrooms?.id, name: m.classrooms?.name, subject: m.classrooms?.subject,
        invite_code: m.classrooms?.invite_code, created_by: m.classrooms?.created_by,
        memberCount: m.memberCount || 0,
        teacherName: m.teacherName || "Enseignant", isOwner: false,
      }));

  const filtered = classrooms.filter((cls: any) =>
    (cls.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.subject || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPromotions = (facultiesData?.promotions || []).filter(
    (p: any) => !selectedFaculty || p.faculty_id === selectedFaculty
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    createClassroom.mutate({ name, description, subject }, {
      onSuccess: (data: any) => {
        toast.success(`✅ Classe créée ! Code : ${data.invite_code}`);
        setCreateOpen(false); setName(""); setDescription(""); setSubject("");
        navigate(`/classrooms/${data.id}/manage`);
      },
      onError: (err: any) => toast.error(`❌ Erreur : ${err.message}`),
    });
  };

  const handleCreateByPromotion = async () => {
    if (!promoClassroomName.trim() || !selectedPromotion) {
      toast.error("Renseignez le nom et la promotion"); return;
    }
    setAddingByPromo(true);
    try {
      const { data: newClass, error: createErr } = await supabase
        .from("classrooms")
        .insert({ name: promoClassroomName, subject: promoSubject, created_by: user!.id })
        .select().single();
      if (createErr) throw createErr;

      await supabase.from("classroom_members").insert({
        classroom_id: newClass.id, user_id: user!.id, role: "teacher",
      });

      const { data: students, error: studErr } = await (supabase as any)
        .from("profiles")
        .select("user_id")
        .eq("department", selectedPromotion);
      if (studErr) throw studErr;

      if (students && students.length > 0) {
        await supabase.from("classroom_members").insert(
          students.map((s: any) => ({ classroom_id: newClass.id, user_id: s.user_id, role: "student" }))
        );
        toast.success(`✅ Classe créée avec ${students.length} étudiant(s) inscrits automatiquement !`);
      } else {
        toast.success("✅ Classe créée. Aucun étudiant trouvé pour cette promotion.");
      }

      qc.invalidateQueries({ queryKey: ["teacher-classrooms"] });
      setCreateOpen(false);
      setSelectedFaculty(""); setSelectedPromotion(""); setPromoClassroomName(""); setPromoSubject("");
      navigate(`/classrooms/${newClass.id}/manage`);
    } catch (err: any) {
      toast.error(`❌ Erreur : ${err.message}`);
    } finally {
      setAddingByPromo(false);
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinByCode.mutate(joinCode, {
      onSuccess: () => { toast.success("✅ Vous avez rejoint la classe !"); setJoinOpen(false); setJoinCode(""); },
      onError: (err: any) => toast.error(`❌ ${err.message}`),
    });
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("Code copié !"); };

  return (
    <div className="flex flex-col min-h-full w-full bg-background pb-24 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border pt-5 pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Classes</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {isTeacher ? `${classrooms.length} classe(s) créée(s)` : "Vos espaces de cours en ligne"}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Rejoindre — étudiant uniquement */}
            {!isTeacher && (
              <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                <DialogTrigger asChild>
                  <button className="p-2.5 bg-secondary border border-border rounded-full hover:bg-secondary/80 transition-colors">
                    <LogIn className="w-5 h-5 text-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem]">
                  <DialogHeader><DialogTitle className="text-xl font-black">Rejoindre une classe</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Code d'invitation</Label>
                      <Input placeholder="Ex: a1b2c3" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                        maxLength={8} className="rounded-2xl mt-2"
                        onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }} />
                    </div>
                    <Button className="w-full rounded-2xl py-5 font-bold" onClick={handleJoin}
                      disabled={joinByCode.isPending || !joinCode.trim()}>
                      {joinByCode.isPending ? "Inscription..." : "Rejoindre la classe"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Créer — prof uniquement */}
            {isTeacher && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <button className="p-2.5 bg-primary text-primary-foreground rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem] max-w-lg">
                  <DialogHeader><DialogTitle className="text-xl font-black">Nouvelle classe</DialogTitle></DialogHeader>
                  <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as any)} className="mt-2">
                    <TabsList className="w-full grid grid-cols-2 rounded-2xl">
                      <TabsTrigger value="manual" className="rounded-xl font-bold">
                        <Plus className="w-4 h-4 mr-1.5" />Manuelle
                      </TabsTrigger>
                      <TabsTrigger value="promotion" className="rounded-xl font-bold">
                        <Building2 className="w-4 h-4 mr-1.5" />Par promotion
                      </TabsTrigger>
                    </TabsList>

                    {/* Création manuelle */}
                    <TabsContent value="manual" className="space-y-4 pt-4">
                      <div>
                        <Label>Nom de la classe *</Label>
                        <Input placeholder="Ex: Master 1 – Cyber sécurité" value={name}
                          onChange={(e) => setName(e.target.value)} maxLength={80} className="rounded-2xl mt-1" />
                      </div>
                      <div>
                        <Label>Matière</Label>
                        <Input placeholder="Ex: Réseaux" value={subject}
                          onChange={(e) => setSubject(e.target.value)} className="rounded-2xl mt-1" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Description de la classe..." value={description}
                          onChange={(e) => setDescription(e.target.value)} className="rounded-2xl mt-1 min-h-[90px]" />
                      </div>
                      <Button className="w-full rounded-2xl py-5 font-bold" onClick={handleCreate}
                        disabled={createClassroom.isPending || !name.trim()}>
                        {createClassroom.isPending ? "Création..." : "Créer la classe"}
                      </Button>
                    </TabsContent>

                    {/* Création par promotion */}
                    <TabsContent value="promotion" className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground bg-secondary/60 rounded-2xl px-4 py-3">
                        Tous les étudiants de la promotion sélectionnée seront <strong>automatiquement inscrits</strong>.
                      </p>
                      <div>
                        <Label>Faculté</Label>
                        <Select value={selectedFaculty} onValueChange={(v) => { setSelectedFaculty(v); setSelectedPromotion(""); }}>
                          <SelectTrigger className="rounded-2xl mt-1">
                            <SelectValue placeholder="Choisir une faculté..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(facultiesData?.faculties || []).map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Promotion</Label>
                        <Select value={selectedPromotion} onValueChange={setSelectedPromotion} disabled={!selectedFaculty}>
                          <SelectTrigger className="rounded-2xl mt-1">
                            <SelectValue placeholder="Choisir une promotion..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPromotions.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}{p.year ? ` (${p.year})` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nom de la classe *</Label>
                        <Input placeholder="Ex: TD Algo – L3 Informatique" value={promoClassroomName}
                          onChange={(e) => setPromoClassroomName(e.target.value)} className="rounded-2xl mt-1" />
                      </div>
                      <div>
                        <Label>Matière</Label>
                        <Input placeholder="Ex: Algorithmique" value={promoSubject}
                          onChange={(e) => setPromoSubject(e.target.value)} className="rounded-2xl mt-1" />
                      </div>
                      <Button className="w-full rounded-2xl py-5 font-bold" onClick={handleCreateByPromotion}
                        disabled={addingByPromo || !promoClassroomName.trim() || !selectedPromotion}>
                        {addingByPromo ? "Inscription en cours..." : "Créer et inscrire la promotion"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher une classe..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:bg-card focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6 pb-8">
        {isLoading ? (
          <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto mt-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-4 w-full max-w-2xl mt-5 mx-auto">
            {filtered.map((cls: any, i: number) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div
                  className="bg-card rounded-[2rem] p-5 shadow-card border border-border flex gap-4 items-center hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(cls.isOwner ? `/classrooms/${cls.id}/manage` : `/classrooms/${cls.id}`)}
                >
                  <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-inner shrink-0">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-md font-bold text-foreground truncate mb-0.5">{cls.name}</h3>
                    {cls.teacherName && <p className="text-xs text-muted-foreground font-medium truncate">{cls.teacherName}</p>}
                    {cls.subject && <Badge variant="secondary" className="text-[9px] font-bold mt-1 rounded-lg">{cls.subject}</Badge>}
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">{cls.memberCount} membres</span>
                      {cls.invite_code && (
                        <button onClick={(e) => { e.stopPropagation(); copyCode(cls.invite_code); }}
                          className="text-[11px] font-bold hover:text-primary transition-colors flex items-center gap-1 ml-2">
                          <Copy className="w-3 h-3" /> {cls.invite_code}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {cls.isOwner ? (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/classrooms/${cls.id}/manage`); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-all">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border-0 text-[9px] font-bold">✓ Membre</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center w-full max-w-2xl mx-auto">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">
              {isTeacher ? "Aucune classe créée" : "Vous n'êtes inscrit à aucune classe"}
            </p>
            {!isTeacher && (
              <button onClick={() => setJoinOpen(true)} className="text-sm text-primary font-bold hover:underline mt-2 block mx-auto">
                Rejoindre une classe avec un code →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}