import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, GripVertical, Upload, Link as LinkIcon, FileText, Video, Image, HelpCircle, Check, X, Users, BarChart3, Search, Download, Settings, Copy, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCourseDetail, useChapters, useAddChapter, useDeleteChapter, useUpdateChapterOrder,
  useChapterResources, useAddResource, useDeleteResource,
  useChapterQuizzes, useAddQuiz, useDeleteQuiz,
  useEnrolledStudents, useAllStudentProgress, useAllQuizAttempts,
} from "@/hooks/use-course-content";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

function ChapterCard({ chapter, courseId, onDelete }: { chapter: any; courseId: string; onDelete: () => void }) {
  const [showResForm, setShowResForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const { data: resources } = useChapterResources(chapter.id);
  const { data: quizzes } = useChapterQuizzes(chapter.id);
  const addResource = useAddResource();
  const deleteResource = useDeleteResource();
  const addQuiz = useAddQuiz();
  const deleteQuiz = useDeleteQuiz();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resForm, setResForm] = useState({ title: "", file_url: "", file_type: "link" });
  const [uploading, setUploading] = useState(false);
  const [quizForm, setQuizForm] = useState({ question: "", options: ["", "", "", ""], correct_answer: 0 });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${courseId}/${chapter.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-resources").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("course-resources").getPublicUrl(path);
    const ft = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "pdf";
    setResForm({ title: file.name, file_url: urlData.publicUrl, file_type: ft });
    setUploading(false);
    setShowResForm(true);
  };

  const handleAddResource = () => {
    if (!resForm.title || !resForm.file_url) { toast.error("Titre et URL requis"); return; }
    addResource.mutate({ chapter_id: chapter.id, ...resForm, order_index: (resources?.length || 0) }, {
      onSuccess: () => { setResForm({ title: "", file_url: "", file_type: "link" }); setShowResForm(false); toast.success("✅ Ressource ajoutée"); },
      onError: (e: any) => toast.error(`❌ Erreur : ${e.message}`),
    });
  };

  const handleAddQuiz = () => {
    if (!quizForm.question || quizForm.options.some(o => !o.trim())) { toast.error("Remplissez tous les champs"); return; }
    addQuiz.mutate({ chapter_id: chapter.id, ...quizForm }, {
      onSuccess: () => { setQuizForm({ question: "", options: ["", "", "", ""], correct_answer: 0 }); setShowQuizForm(false); toast.success("✅ Quiz ajouté"); },
      onError: (e: any) => toast.error(`❌ Erreur : ${e.message}`),
    });
  };

  const fileTypeIcon = (ft: string) => {
    if (ft === "video") return <Video className="w-4 h-4" />;
    if (ft === "image") return <Image className="w-4 h-4" />;
    if (ft === "link") return <LinkIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <div>
              <h4 className="font-semibold text-foreground">{chapter.title}</h4>
              {chapter.description && <p className="text-xs text-muted-foreground">{chapter.description}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ressources ({resources?.length || 0})</span>
            <div className="flex gap-1">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="w-3 h-3 mr-1" />{uploading ? "..." : "Fichier"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResForm(true)}>
                <LinkIcon className="w-3 h-3 mr-1" />URL
              </Button>
            </div>
          </div>
          {resources?.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-secondary/50 rounded p-2 text-sm">
              <div className="flex items-center gap-2">{fileTypeIcon(r.file_type)}<span>{r.title}</span></div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteResource.mutate({ id: r.id, chapter_id: chapter.id })}><X className="w-3 h-3" /></Button>
            </div>
          ))}
          {showResForm && (
            <div className="space-y-2 p-3 bg-secondary/30 rounded">
              <Input placeholder="Titre" value={resForm.title} onChange={e => setResForm(p => ({ ...p, title: e.target.value }))} />
              <Input placeholder="URL du fichier" value={resForm.file_url} onChange={e => setResForm(p => ({ ...p, file_url: e.target.value }))} />
              <Select value={resForm.file_type} onValueChange={v => setResForm(p => ({ ...p, file_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="link">Lien</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddResource} disabled={addResource.isPending}>Ajouter</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowResForm(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </div>

        {/* Quizzes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Quiz ({quizzes?.length || 0})</span>
            <Button variant="outline" size="sm" onClick={() => setShowQuizForm(true)}>
              <HelpCircle className="w-3 h-3 mr-1" />Ajouter
            </Button>
          </div>
          {quizzes?.map(q => (
            <div key={q.id} className="flex items-center justify-between bg-secondary/50 rounded p-2 text-sm">
              <span className="truncate flex-1">{q.question}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteQuiz.mutate({ id: q.id, chapter_id: chapter.id })}><X className="w-3 h-3" /></Button>
            </div>
          ))}
          {showQuizForm && (
            <div className="space-y-2 p-3 bg-secondary/30 rounded">
              <Input placeholder="Question" value={quizForm.question} onChange={e => setQuizForm(p => ({ ...p, question: e.target.value }))} />
              {quizForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${chapter.id}`} checked={quizForm.correct_answer === i} onChange={() => setQuizForm(p => ({ ...p, correct_answer: i }))} />
                  <Input placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...quizForm.options]; opts[i] = e.target.value; setQuizForm(p => ({ ...p, options: opts })); }} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Sélectionnez la bonne réponse avec le bouton radio</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddQuiz} disabled={addQuiz.isPending}>Ajouter</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowQuizForm(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentsTab({ courseId }: { courseId: string }) {
  const { data: students, isLoading } = useEnrolledStudents(courseId);
  const { data: chapters } = useChapters(courseId);
  const { data: allProgress } = useAllStudentProgress(courseId);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");

  if (isLoading) return <Skeleton className="h-40" />;

  const totalChapters = chapters?.length || 1;

  const studentProgress = (userId: string) => {
    const completed = (allProgress || []).filter((p: any) => p.user_id === userId && p.completed).length;
    return Math.round((completed / totalChapters) * 100);
  };

  let filtered = (students || []).filter((s: any) => {
    const name = ((s.profiles as any)?.full_name || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (sortBy === "progress") {
    filtered.sort((a: any, b: any) => studentProgress(b.user_id) - studentProgress(a.user_id));
  } else {
    filtered.sort((a: any, b: any) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un étudiant..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date d'inscription</SelectItem>
            <SelectItem value="progress">Progression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <p className="text-center text-muted-foreground py-8">Aucun étudiant trouvé</p>
      ) : filtered.map((s: any) => {
        const pct = studentProgress(s.user_id);
        const completedCount = (allProgress || []).filter((p: any) => p.user_id === s.user_id && p.completed).length;
        return (
          <Card key={s.id} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={(s.profiles as any)?.avatar_url} />
                <AvatarFallback>{((s.profiles as any)?.full_name || "?")[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{(s.profiles as any)?.full_name || "Utilisateur"}</p>
                <p className="text-xs text-muted-foreground">
                  Inscrit le {new Date(s.enrolled_at).toLocaleDateString("fr-FR")} · {completedCount}/{totalChapters} chapitres
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Progress value={pct} className="w-24 h-2" />
                <span className="text-sm font-medium text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QuizResultsTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useAllQuizAttempts(courseId);
  const { data: students } = useEnrolledStudents(courseId);

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data || !('quizzes' in data) || !data.quizzes?.length) return <p className="text-center text-muted-foreground py-8">Aucun quiz</p>;

  const studentAttempts: Record<string, { name: string; attempts: number; correct: number; lastDate: string }> = {};
  for (const a of data.attempts) {
    if (!studentAttempts[a.user_id]) {
      const st = (students || []).find((s: any) => s.user_id === a.user_id);
      studentAttempts[a.user_id] = { name: (st?.profiles as any)?.full_name || "Étudiant", attempts: 0, correct: 0, lastDate: a.created_at };
    }
    studentAttempts[a.user_id].attempts++;
    if (a.is_correct) studentAttempts[a.user_id].correct++;
    if (a.created_at > studentAttempts[a.user_id].lastDate) studentAttempts[a.user_id].lastDate = a.created_at;
  }
  const studentRows = Object.entries(studentAttempts).map(([uid, s]) => ({ uid, ...s, score: s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0 }));

  const exportCSV = () => {
    const header = "Nom,Tentatives,Score (%),Dernière tentative\n";
    const rows = studentRows.map(r => `"${r.name}",${r.attempts},${r.score},${new Date(r.lastDate).toLocaleDateString("fr-FR")}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quiz-results.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ CSV exporté");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Exporter CSV</Button>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Étudiant</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Tentatives</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Score moyen</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Dernière tentative</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map(r => (
                <tr key={r.uid} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 text-foreground font-medium">{r.name}</td>
                  <td className="p-3 text-center text-muted-foreground">{r.attempts}</td>
                  <td className="p-3 text-center">
                    <Badge className={r.score >= 70 ? "bg-success/10 text-success border-0" : r.score >= 40 ? "bg-warning/10 text-warning border-0" : "bg-destructive/10 text-destructive border-0"}>
                      {r.score}%
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{new Date(r.lastDate).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h3 className="text-lg font-semibold text-foreground">Détail par question</h3>
      {data.quizzes.map((q: any) => {
        const qAttempts = data.attempts.filter((a: any) => a.quiz_id === q.id);
        const correct = qAttempts.filter((a: any) => a.is_correct).length;
        const rate = qAttempts.length ? Math.round((correct / qAttempts.length) * 100) : 0;
        const wrongAnswers = qAttempts.filter((a: any) => !a.is_correct).map((a: any) => a.selected_answer);
        const wrongCounts: Record<number, number> = {};
        wrongAnswers.forEach((a: number) => { wrongCounts[a] = (wrongCounts[a] || 0) + 1; });
        const mostCommonWrong = Object.entries(wrongCounts).sort((a, b) => b[1] - a[1])[0];

        return (
          <Card key={q.id} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="font-medium text-foreground text-sm">{q.question}</p>
              <div className="flex items-center gap-3 mt-2">
                <Progress value={rate} className="h-2 flex-1" />
                <span className="text-sm text-muted-foreground">{rate}% correct ({qAttempts.length} réponses)</span>
              </div>
              {mostCommonWrong && (
                <p className="text-xs text-muted-foreground mt-1">Erreur la plus fréquente : Option {Number(mostCommonWrong[0]) + 1} ({mostCommonWrong[1]} fois)</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function CourseManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: course, isLoading } = useCourseDetail(id);
  const { data: chapters } = useChapters(id);
  const { data: enrolledStudents } = useEnrolledStudents(id);
  const addChapter = useAddChapter();
  const deleteChapter = useDeleteChapter();
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "", accessMode: "public" as "public" | "code" | "private" });

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;
  if (!course) return <div className="p-6 text-center text-muted-foreground">Cours non trouvé</div>;
  if (course.created_by !== user?.id) {
    toast.error("Accès refusé — vous n'êtes pas le créateur de ce cours");
    navigate("/courses");
    return null;
  }

  const handleAddChapter = () => {
    if (!newChapter.title.trim()) { toast.error("Titre requis"); return; }
    addChapter.mutate({ course_id: id!, title: newChapter.title, description: newChapter.description, order_index: chapters?.length || 0 }, {
      onSuccess: () => { setNewChapter({ title: "", description: "" }); setDialogOpen(false); toast.success("✅ Chapitre ajouté"); },
      onError: (e: any) => toast.error(`❌ Erreur : ${e.message}`),
    });
  };

  const handleEditCourse = async () => {
    try {
      const { error } = await supabase.from("courses").update({
        title: editForm.title, description: editForm.description,
        category: editForm.category,
        is_published: editForm.accessMode !== "private",
      } as any).eq("id", id!);
      if (error) throw error;
      toast.success("✅ Cours modifié");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["course", id] });
    } catch (err: any) {
      toast.error(`❌ Erreur : ${err.message}`);
    }
  };

  const handleDeleteCourse = async () => {
    if (deleteConfirm !== course.title) { toast.error("Le titre ne correspond pas"); return; }
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id!);
      if (error) throw error;
      toast.success("✅ Cours supprimé");
      navigate("/courses");
    } catch (err: any) {
      toast.error(`❌ Erreur : ${err.message}`);
    }
  };

  const handleRegenerateCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from("courses").update({ description: "code:" + newCode } as any).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Nouveau code généré. L'ancien code ne fonctionnera plus.");
    qc.invalidateQueries({ queryKey: ["course", id] });
  };

  const openEditDialog = () => {
    const at = (course as any).access_type || "open";
    const vis = (course as any).visibility || "public";
    const accessMode = vis === "private" ? "private" : at === "code" ? "code" : "public";
    setEditForm({
      title: course.title, description: course.description || "",
      category: course.category || "", accessMode: accessMode as any,
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground">Gestion du cours · {enrolledStudents?.length || 0} inscrits</p>
        </div>
        <div className="flex gap-2">
          {(course as any).access_type === "code" && (course as any).join_code && (
            <div className="flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5">
              <KeyRound className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-mono text-foreground">{(course as any).join_code}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText((course as any).join_code); toast.success("Code copié"); }}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRegenerateCode}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={openEditDialog}><Settings className="w-3 h-3 mr-1" />Modifier</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30"><Trash2 className="w-3 h-3 mr-1" />Supprimer</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le cours ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. {enrolledStudents?.length || 0} étudiants inscrits perdront leur accès.
                  Tapez « {course.title} » pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={course.title} />
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive text-destructive-foreground" disabled={deleteConfirm !== course.title}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Modifier le cours</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Titre</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div>
              <Label>Accès au cours</Label>
              <div className="space-y-2 mt-2">
                {([
                  { value: "public", label: "Public", desc: "Visible et accessible à tous" },
                  { value: "code", label: "Code requis", desc: "Visible mais accès par code" },
                  { value: "private", label: "Privé", desc: "Invisible et accessible par lien uniquement" },
                ] as const).map(opt => (
                  <label key={opt.value} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", editForm.accessMode === opt.value ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="radio" name="accessMode" checked={editForm.accessMode === opt.value} onChange={() => setEditForm(p => ({ ...p, accessMode: opt.value }))} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {editForm.accessMode !== "public" && (course as any).join_code && (
                <p className="text-xs text-muted-foreground mt-2">Code d'accès actuel : <span className="font-mono font-semibold">{(course as any).join_code}</span></p>
              )}
            </div>
            <Button className="w-full" onClick={handleEditCourse}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="chapters">
        <TabsList>
          <TabsTrigger value="chapters">Chapitres</TabsTrigger>
          <TabsTrigger value="students"><Users className="w-4 h-4 mr-1" />Étudiants</TabsTrigger>
          <TabsTrigger value="quiz-results"><BarChart3 className="w-4 h-4 mr-1" />Résultats Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Ajouter un chapitre</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Nouveau chapitre</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Titre du chapitre" value={newChapter.title} onChange={e => setNewChapter(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Description (optionnel)" value={newChapter.description} onChange={e => setNewChapter(p => ({ ...p, description: e.target.value }))} rows={2} />
                  <Button className="w-full" onClick={handleAddChapter} disabled={addChapter.isPending}>{addChapter.isPending ? "..." : "Ajouter"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!chapters?.length ? (
            <p className="text-center text-muted-foreground py-12">Aucun chapitre. Ajoutez votre premier chapitre !</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((ch, i) => (
                <motion.div key={ch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <ChapterCard chapter={ch} courseId={id!} onDelete={() => deleteChapter.mutate({ id: ch.id, course_id: id! })} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students">
          <StudentsTab courseId={id!} />
        </TabsContent>

        <TabsContent value="quiz-results">
          <QuizResultsTab courseId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
