import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Lock,
  Globe,
  Plus,
  Settings,
  PlayCircle,
  CheckCircle2,
  RotateCcw,
  KeyRound,
  Upload,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCourses, useEnrollCourse, useMyEnrollments } from "@/hooks/use-courses";
import { useStudentEnrollments } from "@/hooks/use-student-data";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const categories = ["Tous", "Informatique", "Mathématiques", "Sciences", "Langues", "Droit", "Gestion", "Autre"];
const studentFilters = ["Tous", "Mes cours", "En cours", "Terminés"];
const teacherFilters = ["Tous", "Mes cours"];
const courseCategories = categories.filter((c) => c !== "Tous");

export default function CoursesPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();

  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("Tous");
  const [teacherFilter, setTeacherFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("filter") === "mine" ? "Mes cours" : "Tous";
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "Informatique",
    accessMode: "public" as "public" | "code" | "private",
    cover_image: null as string | null,
  });

  const { data: courses, isLoading } = useCourses(searchQuery || undefined, activeCategory);
  const { data: enrollments } = useMyEnrollments();
  const { data: studentEnrollments } = useStudentEnrollments();
  const enrollMutation = useEnrollCourse();

  const isTeacher =
    hasRole("teacher") || hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");
  const isStudent = !isTeacher;

  const enrolledIds = new Set((enrollments || []).map((e) => e.course_id));
  const enrollmentMap = new Map((studentEnrollments || []).map((e: any) => [e.course_id, e]));

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate(courseId, {
      onSuccess: () => {
        toast.success("Inscription réussie !");
        navigate(`/courses/${courseId}`);
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || !joiningCourseId) return;
    // join_code not in schema, just enroll directly
    handleEnroll(joiningCourseId);
    setJoinOpen(false);
    setJoinCode("");
    setJoiningCourseId(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-resources").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("course-resources").getPublicUrl(path);
    setNewCourse((p) => ({ ...p, cover_image: urlData.publicUrl }));
    setUploading(false);
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (newCourse.description.length < 20) {
      toast.error("La description doit faire au moins 20 caractères");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: newCourse.title,
          description: newCourse.description,
          category: newCourse.category,
          is_published: newCourse.accessMode !== "private",
          cover_image: newCourse.cover_image || "",
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success("Cours créé avec succès !");
      setCreateOpen(false);
      setNewCourse({
        title: "",
        description: "",
        category: "Informatique",
        accessMode: "public",
        cover_image: null,
      });
      qc.invalidateQueries({ queryKey: ["courses"] });
      navigate(`/courses/${data.id}/manage`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  let filteredCourses = courses || [];
  if (isStudent && studentFilter !== "Tous") {
    if (studentFilter === "Mes cours") filteredCourses = filteredCourses.filter((c) => enrolledIds.has(c.id));
    else if (studentFilter === "En cours")
      filteredCourses = filteredCourses.filter((c) => {
        const e = enrollmentMap.get(c.id);
        return e && !e.completed;
      });
    else if (studentFilter === "Terminés")
      filteredCourses = filteredCourses.filter((c) => {
        const e = enrollmentMap.get(c.id);
        return e && e.completed;
      });
  }
  if (isTeacher && teacherFilter === "Mes cours") {
    filteredCourses = filteredCourses.filter((c) => c.created_by === user?.id);
  }

return (
    <div className="flex min-h-full w-full flex-1 flex-col overflow-y-auto bg-background pb-16 hide-scrollbar lg:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div>
            <h1 className="text-xl font-bold leading-tight text-foreground">Explorer les cours</h1>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">Trouvez les ressources de votre filières</p>
          </div>

          {isTeacher && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-[2rem] border border-border bg-card p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">Créer un nouveau cours</DialogTitle>
                </DialogHeader>
                <div className="mt-4 max-h-[65vh] space-y-4 overflow-y-auto hide-scrollbar">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-foreground">Titre *</label>
                    <input
                      value={newCourse.title}
                      onChange={(e) => setNewCourse((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Introduction à Python"
                      maxLength={100}
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-[14px] font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-card"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-foreground">
                      Description * <span className="font-normal text-muted-foreground">(min 20 car.)</span>
                    </label>
                    <textarea
                      value={newCourse.description}
                      onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Décrivez le contenu du cours..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-2.5 text-[14px] font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-card"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-foreground">Catégorie</label>
                    <select
                      value={newCourse.category}
                      onChange={(e) => setNewCourse((p) => ({ ...p, category: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-[14px] font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-card"
                    >
                      {courseCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-bold text-foreground">Accès au cours</label>
                    <div className="space-y-2">
                      {(
                        [
                          { value: "public", label: "Public", desc: "Visible et accessible à tous" },
                          { value: "code", label: "Code requis", desc: "Visible mais accès par code" },
                          { value: "private", label: "Privé", desc: "Invisible, accessible par lien uniquement" },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className={clsx(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                            newCourse.accessMode === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-muted-foreground/30"
                          )}
                        >
                          <input
                            type="radio"
                            name="accessMode"
                            checked={newCourse.accessMode === opt.value}
                            onChange={() => setNewCourse((p) => ({ ...p, accessMode: opt.value }))}
                            className="mt-0.5 h-4 w-4 accent-primary"
                          />
                          <div>
                            <p className="text-[13px] font-bold leading-tight text-foreground">{opt.label}</p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-foreground">
                      Image de couverture <span className="font-normal text-muted-foreground">(optionnel)</span>
                    </label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 text-[13px] font-bold text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-card"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Envoi en cours..." : "Choisir une image"}
                    </button>
                    {newCourse.cover_image && (
                      <img
                        src={newCourse.cover_image}
                        alt=""
                        className="mt-3 h-28 w-full rounded-2xl border border-border object-cover"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateCourse}
                    disabled={creating}
                    className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-foreground py-3.5 font-bold text-background transition-all active:scale-[0.98] hover:bg-foreground/90"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Création...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Publier le cours
                      </>
                    )}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="px-4 md:px-6 pb-3">
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Rechercher un module, un cours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[1.5rem] border border-border bg-muted py-2.5 pl-11 pr-4 text-[14px] font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>
        </div>

        {(isStudent || isTeacher) && (
          <div className="flex gap-2 overflow-x-auto pb-2 px-4">
            {(isStudent ? studentFilters : teacherFilters).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => (isStudent ? setStudentFilter(f) : setTeacherFilter(f))}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  (isStudent ? studentFilter : teacherFilter) === f
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 px-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Code requis</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-[13px] text-muted-foreground">Ce cours nécessite un code d&apos;accès.</p>
          <input
            placeholder="Ex: ABC123XP"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={8}
            className="mt-3 w-full rounded-xl border border-border bg-muted px-4 py-3 text-[14px] font-medium uppercase tracking-widest text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-card"
          />
          <button
            type="button"
            onClick={handleJoinByCode}
            className="mt-3 w-full rounded-xl bg-foreground py-3 font-bold text-background transition-all hover:bg-foreground/90"
          >
            Déverrouiller
          </button>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 py-4 w-full max-w-2xl mx-auto px-4 md:px-6">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          </div>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course: any) => {
            const isOwner = course.created_by === user?.id;
            const isEnrolled = enrolledIds.has(course.id);
            const enrollment = enrollmentMap.get(course.id);
            const isCompleted = enrollment?.completed;
            const isCodeAccess = course.access_type === "code";

            return (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/courses/${course.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/courses/${course.id}`);
                  }
                }}
                className="group relative flex cursor-pointer gap-4 overflow-hidden border border-border bg-card p-4 shadow-sm rounded-[2rem] transition-all hover:border-border hover:shadow-md"
              >
                {course.cover_image && (
                  <div className="absolute inset-0 opacity-[0.06] transition-opacity group-hover:opacity-[0.12]">
                    <img src={course.cover_image} alt="" className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="relative z-10 flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-gradient-to-br from-primary/10 to-primary/20 text-primary shadow-inner">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="h-8 w-8 opacity-50 transition-transform group-hover:scale-110" />
                  )}
                </div>

                <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                      {course.category || "Matière"}
                    </span>
                    <div className="flex items-center gap-1">
                      {course.is_public ? (
                        <Globe className="h-3 w-3 text-muted-foreground/50" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      )}
                      {isCodeAccess && !isOwner && !isEnrolled && <KeyRound className="h-3 w-3 text-amber-500" />}
                      {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    </div>
                  </div>

                  <h3 className="mb-1 truncate text-[15px] font-bold leading-tight text-foreground">{course.title}</h3>
                  <p className="truncate text-[12px] font-medium text-muted-foreground">
                    {course.description || "Aucune description"}
                  </p>

                  <div className="mt-2.5 flex">
                    {isOwner ? (
                      <span className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                        <Settings className="h-3 w-3" /> Gérer
                      </span>
                    ) : isCompleted ? (
                      <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <RotateCcw className="h-3 w-3" /> Revoir
                      </span>
                    ) : isEnrolled ? (
                      <span className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        <PlayCircle className="h-3 w-3" /> Continuer
                      </span>
                    ) : isCodeAccess ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJoiningCourseId(course.id);
                          setJoinOpen(true);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-muted"
                      >
                        <KeyRound className="h-3 w-3 text-amber-500" /> Déverrouiller
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnroll(course.id);
                        }}
                        disabled={enrollMutation.isPending}
                        className="rounded-lg bg-foreground px-3 py-1 text-[11px] font-bold text-background transition-colors hover:bg-foreground/90"
                      >
                        S&apos;inscrire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
              <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-bold text-foreground">Aucun cours trouvé</p>
            <p className="mt-1 max-w-[250px] text-sm text-muted-foreground">
              Aucun cours pour &quot;{searchQuery || activeCategory}&quot; pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
