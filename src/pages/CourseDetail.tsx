import { ChevronLeft, BookOpen, FileText, Download, Lock, Users, CheckCircle2, Loader2, PlayCircle, HelpCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useCourseDetail, useChapters, useChapterResources, useCourseProgress, useMarkChapterComplete, useEnrolledStudents } from '@/hooks/use-course-content';
import { useMyEnrollments, useEnrollCourse } from '@/hooks/use-courses';
import { useExams } from '@/hooks/use-exams';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';

function ChapterSection({ chapter, isEnrolled, courseId }: { chapter: any; isEnrolled: boolean; courseId: string }) {
  const { data: resources } = useChapterResources(chapter.id);
  const { data: progress } = useCourseProgress(courseId);
  const markComplete = useMarkChapterComplete();
  const isChapterComplete = (progress || []).some((p: any) => p.chapter_id === chapter.id && p.completed);

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20">
        <div className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          isChapterComplete ? "bg-green-100 text-green-600" : "bg-secondary text-muted-foreground"
        )}>
          {isChapterComplete ? <CheckCircle2 className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
        </div>
        <h3 className="text-sm font-black text-foreground flex-1">{chapter.title}</h3>
        {isEnrolled && !isChapterComplete && (
          <button
            onClick={() => markComplete.mutate({ course_id: courseId, chapter_id: chapter.id }, {
              onSuccess: () => toast.success('Chapitre marqué comme terminé'),
              onError: (e: any) => toast.error(e.message),
            })}
            className="text-xs text-primary font-bold hover:underline"
          >
            Terminé
          </button>
        )}
      </div>
      {chapter.description && (
        <p className="text-xs text-muted-foreground px-4 pt-2">{chapter.description}</p>
      )}
      <div className="flex flex-col gap-2 p-3">
        {(resources || []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">Aucune ressource pour ce chapitre.</p>
        ) : (
          (resources || []).map((res: any) => {
            const isPdf = res.file_type === 'pdf' || res.file_url?.match(/\.pdf(\?|$)/i);
            return (
              <div key={res.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group hover:shadow-sm transition-all">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  isPdf ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                )}>
                  {isPdf ? <FileText className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{res.title}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{res.file_type || 'document'}</p>
                </div>
                {isEnrolled ? (
                  <a href={res.file_url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary text-muted-foreground opacity-60">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DocumentCard({ exam, isEnrolled }: { exam: any; isEnrolled: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all group">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{exam.title}</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{exam.exam_type} · {exam.annee}</p>
      </div>
      {isEnrolled ? (
        <a href={exam.file_url} target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
          <Download className="w-4 h-4" />
        </a>
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary text-muted-foreground opacity-60 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

type TabKey = 'cours' | 'tp' | 'exercices';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: course, isLoading } = useCourseDetail(id);
  const { data: chapters } = useChapters(id);
  const { data: enrollments } = useMyEnrollments();
  const { data: enrolledStudents } = useEnrolledStudents(id);
  const { data: allExams } = useExams();
  const enrollCourse = useEnrollCourse();

  const isEnrolled = (enrollments || []).some((e: any) => e.course_id === id);
  const isOwner = (course as any)?.created_by === user?.id;
  const studentCount = enrolledStudents?.length || 0;

  const courseExams = allExams?.filter((e: any) => e.matiere === (course as any)?.category) || [];
  const tps = courseExams.filter((e: any) => e.exam_type === 'TP');
  const exercices = courseExams.filter((e: any) => e.exam_type === 'Exercices');

  const [activeTab, setActiveTab] = useState<TabKey>('cours');

  const handleEnroll = () => {
    if (!id) return;
    enrollCourse.mutate(id, {
      onSuccess: () => toast.success('Inscription réussie !'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full max-w-2xl mx-auto p-6 gap-4">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground opacity-50" />
        <p className="font-bold text-muted-foreground">Cours introuvable</p>
        <button onClick={() => navigate('/courses')} className="text-primary font-bold hover:underline">← Retour aux cours</button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'cours', label: 'Le Cours', count: chapters?.length || 0 },
    { key: 'tp', label: 'TP', count: tps.length },
    { key: 'exercices', label: 'Exercices', count: exercices.length },
  ];

  return (
    <div className="flex min-h-full w-full flex-1 flex-col bg-background pb-24 lg:pb-8">

      {/* Hero Banner */}
      <div className="h-52 md:h-64 w-full shrink-0 bg-gradient-to-br from-purple-800 to-indigo-900 relative overflow-hidden">
        {(course as any).cover_image && (
          <img src={(course as any).cover_image} alt={(course as any).title} className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/courses')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          {isOwner && (
            <span className="px-3 py-1.5 bg-amber-400 text-amber-900 rounded-full text-xs font-black">Votre cours</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6">

        {/* Course Info Card — overlaps the banner */}
        <div className="bg-card rounded-3xl p-5 shadow-xl shadow-black/5 border border-border relative z-10 -mt-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 mb-3 inline-block">
            {(course as any).category || 'Cours'}
          </span>
          <h1 className="text-xl font-black text-foreground mb-3 leading-tight">{(course as any).title}</h1>
          <div className="flex gap-6 border-t border-border pt-3">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Users className="w-4 h-4" />
              {studentCount} inscrits
            </div>
            {chapters && (
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                {chapters.length} chapitre{chapters.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {(course as any).description && (
          <div className="mt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">{(course as any).description}</p>
          </div>
        )}

        {/* ── Horizontal Tab Bar ── */}
        <div className="mt-8 flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "relative flex-1 pb-3 pt-1 text-sm font-bold transition-colors",
                activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="mt-6 flex flex-col gap-4">
          {activeTab === 'cours' && (
            !chapters || chapters.length === 0 ? (
              <div className="py-14 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun chapitre disponible pour l'instant.</p>
              </div>
            ) : (
              chapters.map((chapter: any) => (
                <ChapterSection key={chapter.id} chapter={chapter} isEnrolled={isEnrolled || isOwner} courseId={id!} />
              ))
            )
          )}

          {activeTab === 'tp' && (
            tps.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-border rounded-2xl bg-secondary/10">
                <FileText className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-bold">Aucun TP disponible pour cette matière.</p>
              </div>
            ) : (
              tps.map((exam: any) => <DocumentCard key={exam.id} exam={exam} isEnrolled={isEnrolled || isOwner} />)
            )
          )}

          {activeTab === 'exercices' && (
            exercices.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-border rounded-2xl bg-secondary/10">
                <HelpCircle className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-bold">Aucun exercice disponible pour cette matière.</p>
              </div>
            ) : (
              exercices.map((exam: any) => <DocumentCard key={exam.id} exam={exam} isEnrolled={isEnrolled || isOwner} />)
            )
          )}
        </div>

      </div>

      {/* Sticky Enroll Button */}
      {!isOwner && !isEnrolled && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 p-4 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleEnroll}
              disabled={enrollCourse.isPending}
              className="w-full h-12 font-bold rounded-2xl flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {enrollCourse.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</>
              ) : (
                "S'inscrire au module"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
