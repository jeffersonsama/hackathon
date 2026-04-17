import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Circle, Download, ExternalLink, FileText, Image, Video, BookOpen, Trophy, RefreshCw, GraduationCap, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCourseDetail, useChapters, useChapterResources, useChapterQuizzes,
  useCourseProgress, useMarkChapterComplete, useMyQuizAttempts, useSubmitQuizAnswer,
} from "@/hooks/use-course-content";
import { useMyEnrollments, useEnrollCourse } from "@/hooks/use-courses";
import { useCompleteCourse } from "@/hooks/use-student-data";
import { useAuth } from "@/contexts/AuthContext";

function ChapterContent({ chapter, courseId, onChapterComplete }: { chapter: any; courseId: string; onChapterComplete?: () => void }) {
  const { data: resources } = useChapterResources(chapter.id);
  const { data: quizzes } = useChapterQuizzes(chapter.id);
  const { data: progress } = useCourseProgress(courseId);
  const { data: attempts } = useMyQuizAttempts(courseId);
  const markComplete = useMarkChapterComplete();
  const submitAnswer = useSubmitQuizAnswer();
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  const isCompleted = progress?.some((p: any) => p.chapter_id === chapter.id && p.completed);

  const handleMarkComplete = () => {
    markComplete.mutate({ course_id: courseId, chapter_id: chapter.id }, {
      onSuccess: () => {
        toast.success("Chapitre complété !");
        if (quizzes?.length) {
          setShowQuiz(true);
        } else {
          onChapterComplete?.();
        }
      },
    });
  };

  const currentQuiz = quizzes?.[quizIdx];
  const attemptedQuizIds = new Set((attempts || []).map((a: any) => a.quiz_id));

  const handleSubmitAnswer = () => {
    if (!currentQuiz || selectedAnswer === null) return;
    const answerIdx = parseInt(selectedAnswer);
    const isCorrect = answerIdx === currentQuiz.correct_answer;
    submitAnswer.mutate({ quiz_id: currentQuiz.id, selected_answer: answerIdx, is_correct: isCorrect }, {
      onSuccess: () => {
        toast(isCorrect ? "✅ Bonne réponse !" : "❌ Mauvaise réponse", { description: isCorrect ? undefined : `La bonne réponse était l'option ${currentQuiz.correct_answer + 1}` });
        setSelectedAnswer(null);
        if (quizIdx < (quizzes?.length || 0) - 1) {
          setQuizIdx(quizIdx + 1);
        } else {
          setQuizDone(true);
          onChapterComplete?.();
        }
      },
    });
  };

  const quizScore = useMemo(() => {
    if (!quizzes?.length || !attempts?.length) return null;
    const relevant = attempts.filter((a: any) => quizzes.some((q: any) => q.id === a.quiz_id));
    if (!relevant.length) return null;
    const correct = relevant.filter((a: any) => a.is_correct).length;
    return { correct, total: relevant.length, pct: Math.round((correct / relevant.length) * 100) };
  }, [quizzes, attempts]);

  const fileIcon = (ft: string) => {
    if (ft === "video") return <Video className="w-4 h-4" />;
    if (ft === "image") return <Image className="w-4 h-4" />;
    if (ft === "link") return <ExternalLink className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const renderResource = (r: any) => {
    if (r.file_type === "video") {
      return (
        <div key={r.id} className="space-y-2">
          <p className="text-sm font-medium text-foreground">{r.title}</p>
          <video controls className="w-full rounded-lg max-h-[400px] bg-black">
            <source src={r.file_url} />
          </video>
        </div>
      );
    }
    if (r.file_type === "image") {
      return (
        <div key={r.id} className="space-y-2">
          <p className="text-sm font-medium text-foreground">{r.title}</p>
          <img src={r.file_url} alt={r.title} className="w-full rounded-lg max-h-[400px] object-contain" />
        </div>
      );
    }
    if (r.file_type === "pdf") {
      return (
        <div key={r.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> {r.title}</p>
            <a href={r.file_url} download className="text-primary hover:underline text-sm flex items-center gap-1"><Download className="w-3 h-3" /> Télécharger</a>
          </div>
          <iframe src={r.file_url} className="w-full h-[500px] rounded-lg border border-border" title={r.title} />
        </div>
      );
    }
    // link or other
    return (
      <a key={r.id} href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
        {fileIcon(r.file_type)}
        <span className="text-sm text-foreground flex-1">{r.title}</span>
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </a>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{chapter.title}</h2>
        {chapter.description && <p className="text-muted-foreground mt-1">{chapter.description}</p>}
      </div>

      {/* Resources */}
      {resources && resources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Ressources</h3>
          {resources.map((r: any) => renderResource(r))}
        </div>
      )}

      {/* Mark complete */}
      {isCompleted ? (
        <Badge className="bg-success/10 text-success border-0"><CheckCircle2 className="w-4 h-4 mr-1" />Chapitre complété</Badge>
      ) : (
        <Button onClick={handleMarkComplete} disabled={markComplete.isPending} className="bg-gradient-primary text-primary-foreground">
          <Check className="w-4 h-4 mr-2" />Marquer comme terminé
        </Button>
      )}

      {/* Quiz section */}
      {quizzes && quizzes.length > 0 && (isCompleted || showQuiz) && !quizDone && !attemptedQuizIds.has(quizzes[quizzes.length - 1]?.id) && currentQuiz && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quiz — Question {quizIdx + 1}/{quizzes.length}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium text-foreground">{currentQuiz.question}</p>
            <RadioGroup value={selectedAnswer || ""} onValueChange={setSelectedAnswer}>
              {(currentQuiz.options as string[]).map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30">
                  <RadioGroupItem value={String(i)} id={`opt-${i}`} />
                  <label htmlFor={`opt-${i}`} className="text-sm cursor-pointer flex-1">{opt}</label>
                </div>
              ))}
            </RadioGroup>
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null || submitAnswer.isPending}>Répondre</Button>
          </CardContent>
        </Card>
      )}

      {/* Quiz score */}
      {quizScore && (quizDone || attemptedQuizIds.has(quizzes?.[quizzes.length - 1]?.id)) && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <Trophy className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-semibold text-foreground">Score: {quizScore.correct}/{quizScore.total} ({quizScore.pct}%)</p>
              <p className="text-xs text-muted-foreground">Quiz terminé pour ce chapitre</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CourseLearnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: course, isLoading } = useCourseDetail(id);
  const { data: chapters } = useChapters(id);
  const { data: progress } = useCourseProgress(id);
  const { data: attempts } = useMyQuizAttempts(id);
  const { data: enrollments } = useMyEnrollments();
  const enrollMutation = useEnrollCourse();
  const completeCourse = useCompleteCourse();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const isEnrolled = enrollments?.some(e => e.course_id === id);
  const completedChapterIds = new Set((progress || []).filter((p: any) => p.completed).map((p: any) => p.chapter_id));
  const totalChapters = chapters?.length || 0;
  const completedCount = chapters?.filter(ch => completedChapterIds.has(ch.id)).length || 0;
  const progressPct = totalChapters ? Math.round((completedCount / totalChapters) * 100) : 0;

  const activeChapter = chapters?.find(ch => ch.id === selectedChapter) || chapters?.[0];

  // Calculate quiz average
  const quizAverage = useMemo(() => {
    if (!attempts?.length) return 0;
    const correct = attempts.filter((a: any) => a.is_correct).length;
    return Math.round((correct / attempts.length) * 100);
  }, [attempts]);

  const handleChapterComplete = useCallback(() => {
    // Check if all chapters are now completed (including the one just marked)
    if (!chapters) return;
    const newCompletedCount = completedCount + 1;
    if (newCompletedCount >= totalChapters && totalChapters > 0) {
      // Course complete!
      completeCourse.mutate({
        courseId: id!,
        courseTitle: course?.title || "Cours",
        quizAverage,
      }, {
        onSuccess: () => {
          setShowCompletionModal(true);
        },
      });
    } else {
      // Move to next chapter
      const currentIdx = chapters.findIndex(ch => ch.id === activeChapter?.id);
      if (currentIdx >= 0 && currentIdx < chapters.length - 1) {
        setSelectedChapter(chapters[currentIdx + 1].id);
      }
    }
  }, [chapters, completedCount, totalChapters, id, course, quizAverage, activeChapter, completeCourse]);

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;
  if (!course) return <div className="p-6 text-center text-muted-foreground">Cours non trouvé</div>;

  // Enrollment prompt for non-enrolled students
  if (!isEnrolled && course.created_by !== user?.id) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6 px-4">
        <BookOpen className="w-16 h-16 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">{course.title}</h2>
        <p className="text-muted-foreground">{course.description}</p>
        <p className="text-sm text-muted-foreground">Vous devez vous inscrire pour accéder au contenu de ce cours.</p>
        <Button
          className="bg-primary text-primary-foreground"
          onClick={() => enrollMutation.mutate(id!, {
            onSuccess: () => toast.success("✅ Inscription réussie !"),
            onError: (err: any) => toast.error(`❌ Erreur : ${err.message}`),
          })}
          disabled={enrollMutation.isPending}
        >
          S'inscrire au cours
        </Button>
      </div>
    );
  }

  const qc = useQueryClient();

  const handleUnenroll = async () => {
    try {
      // Delete quiz attempts for this course
      const { data: chapters } = await supabase.from("course_chapters").select("id").eq("course_id", id!);
      if (chapters?.length) {
        const { data: quizzes } = await supabase.from("course_quizzes").select("id").in("chapter_id", chapters.map(c => c.id));
        if (quizzes?.length) {
          await supabase.from("quiz_attempts").delete().eq("user_id", user!.id).in("quiz_id", quizzes.map(q => q.id));
        }
      }
      await supabase.from("course_progress").delete().eq("user_id", user!.id).eq("course_id", id!);
      await supabase.from("course_enrollments").delete().eq("user_id", user!.id).eq("course_id", id!);
      toast.success("Vous avez été désinscrit du cours");
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["student-enrollments"] });
      navigate("/courses");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 lg:p-6 p-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${id}`)}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
            <p className="text-sm text-muted-foreground">{course.description}</p>
          </div>
        </div>
        {isEnrolled && course.created_by !== user?.id && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 px-4 py-2 bg-secondary rounded-lg">
                <LogOut className="w-3 h-3" /> Se désinscrire
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Se désinscrire du cours ?</AlertDialogTitle>
                <AlertDialogDescription>Votre progression sera perdue. Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnenroll} className="bg-destructive text-destructive-foreground">Se désinscrire</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Progress summary */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground">{completedCount} / {totalChapters} chapitres complétés</span>
            <span className="text-sm font-bold text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Use flex-col-reverse on mobile so content is above the menu, and flex-row for desktop */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-[280px_1fr] gap-6">
        
        {/* Sidebar */}
        <Card className="bg-card border-border h-fit lg:sticky lg:top-4 overflow-hidden shadow-sm">
          <CardHeader className="bg-secondary/30 p-4 border-b border-border">
            <CardTitle className="text-sm">Sommaire du cours</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[50vh] lg:max-h-none overflow-y-auto">
            {!chapters?.length ? (
              <p className="text-sm text-muted-foreground p-3">Aucun chapitre disponible</p>
            ) : chapters.map((ch, i) => {
              const done = completedChapterIds.has(ch.id);
              const isActive = activeChapter?.id === ch.id;
              const started = progress?.some((p: any) => p.chapter_id === ch.id && !p.completed);
              return (
                <button key={ch.id} onClick={() => setSelectedChapter(ch.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm transition-colors ${isActive ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary/50 text-foreground font-medium"}`}>
                  {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : started ? <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center shrink-0"><span className="text-[10px]">{i+1}</span></div>}
                  <span className="truncate">{ch.title}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Main content */}
        <Card className="bg-card border-border shadow-sm p-4 lg:p-8">
          {activeChapter ? (
            <ChapterContent chapter={activeChapter} courseId={id!} onChapterComplete={handleChapterComplete} />
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Sélectionnez un chapitre pour commencer</p>
            </div>
          )}
        </Card>
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="bg-card border-border text-center space-y-4 max-w-md">
          <GraduationCap className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Félicitations {(profile?.full_name || "").split(" ")[0]} !</h2>
          <p className="text-muted-foreground">Vous avez terminé le cours <strong className="text-foreground">« {course?.title} »</strong></p>
          {quizAverage > 0 && (
            <p className="text-sm font-bold bg-secondary py-2 rounded-lg text-foreground mt-2">Score moyen aux quiz : <span className="text-primary">{quizAverage}%</span></p>
          )}
          <div className="flex flex-col lg:flex-row gap-3 justify-center pt-4">
            <Button onClick={() => navigate(`/courses/${id}/certificate`)} className="bg-primary text-primary-foreground font-bold">
              <GraduationCap className="w-4 h-4 mr-2" /> Certificat
            </Button>
            <Button variant="outline" onClick={() => { setShowCompletionModal(false); navigate("/courses"); }}>
              Retour au catalogue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
