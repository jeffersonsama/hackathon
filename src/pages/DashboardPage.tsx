import { motion } from "framer-motion";
import { BookOpen, Users, Bell, Calendar, Clock, FileText, ArrowRight, MessageSquare, GraduationCap, PlayCircle, Settings, Plus, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEnrollments } from "@/hooks/use-courses";
import { useNotifications } from "@/hooks/use-notifications";
import { useEvents } from "@/hooks/use-events";
import { useStudentEnrollments, useStudentClassrooms } from "@/hooks/use-student-data";
import { useTeacherCoursesWithStats, useTeacherClassrooms, useTeacherRecentActivity } from "@/hooks/use-teacher-data";
import { useConversations } from "@/hooks/use-messages";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function StatCard({ label, value, icon: Icon, iconBg }: { label: string; value: any; icon: any; iconBg: string }) {
  return (
    <div className="bg-card px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-border shadow-card flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 ${iconBg} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-lg sm:text-xl font-black text-foreground leading-none mb-0.5 sm:mb-1">{value}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, linkTo, linkLabel = "Tout voir" }: { title: string; icon: any; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ==================== TEACHER DASHBOARD ====================
function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: courses, isLoading: coursesLoading } = useTeacherCoursesWithStats();
  const { data: classrooms, isLoading: classLoading } = useTeacherClassrooms();
  const { data: activity, isLoading: activityLoading } = useTeacherRecentActivity();
  const { data: notifications, isLoading: notifLoading } = useNotifications();

  const firstName = (profile?.full_name || "").split(" ")[0] || "Professeur";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col w-full max-w-[480px] md:max-w-2xl lg:max-w-4xl mx-auto px-4 animate-in fade-in duration-500 pb-24 pt-4">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-8 px-1">
        <StatCard label="Mes cours" value={courses?.length || 0} icon={BookOpen} iconBg="bg-primary/10 text-primary" />
        <StatCard label="Mes classes" value={classrooms?.length || 0} icon={GraduationCap} iconBg="bg-blue-500/10 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" />
        <StatCard label="Inscriptions" value={activity?.enrollments?.length || 0} icon={Users} iconBg="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" />
        <StatCard label="Score moyen" value={courses?.length ? `${Math.round((courses.filter((c: any) => c.avgQuizScore !== null).reduce((s: number, c: any) => s + (c.avgQuizScore || 0), 0) / Math.max(courses.filter((c: any) => c.avgQuizScore !== null).length, 1)))}%` : "-"} icon={BarChart3} iconBg="bg-amber-500/10 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" />
      </motion.div>

      {/* Mes cours */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Mes cours" icon={BookOpen} linkTo="/courses?filter=mine" />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {coursesLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : courses && courses.length > 0 ? (
            <div className="divide-y divide-border">
              {courses.slice(0, 3).map((course: any) => (
                <div key={course.id} className="p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors">
                  <div className="w-2 h-10 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Users className="w-3 h-3 inline mr-1" />{course.enrolledCount} inscrits
                      {course.avgQuizScore !== null && <> · {course.avgQuizScore}% score</>}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate(`/courses/${course.id}/manage`)}>
                    <Settings className="w-3 h-3 mr-1" />Gérer
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun cours créé.</p>
              <Link to="/courses" className="text-sm text-primary font-bold hover:underline">Créer un cours →</Link>
            </div>
          )}
        </div>
      </motion.section>

      {/* Mes classes */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Mes classes" icon={GraduationCap} linkTo="/classrooms" />
        <div className="flex flex-col gap-3">
          {classLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
          ) : classrooms && classrooms.length > 0 ? (
            classrooms.map((cls: any) => {
              const memberCount = cls.classroom_members?.[0]?.count || 0;
              return (
                <div key={cls.id} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-80 mb-1 block">
                      <Users className="w-3 h-3 inline mr-1" />{memberCount} · Code: {cls.invite_code}
                    </span>
                    <h3 className="font-bold text-base">{cls.name}</h3>
                  </div>
                  <button onClick={() => navigate(`/classrooms/${cls.id}/manage`)} className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-primary-foreground/30 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Aucune classe</p>
              <Link to="/classrooms" className="text-sm text-primary font-bold hover:underline">Créer une classe</Link>
            </div>
          )}
        </div>
      </motion.section>

      {/* Notifications */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Notifications" icon={Bell} linkTo="/notifications" />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {notifLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className="p-4 flex gap-3 hover:bg-secondary/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read_at ? "bg-muted-foreground" : "bg-primary"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(notif.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucune notification</p>
          )}
        </div>
      </motion.section>

      {/* Activité récente */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Activité récente" icon={Clock} />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {activityLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {activity?.enrollments?.map((e: any, i: number) => (
                <div key={`e-${i}`} className="p-4 flex gap-3 hover:bg-secondary/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-bold">{e.studentName}</span> a rejoint <span className="font-bold">{e.courseTitle}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(e.enrolled_at).toLocaleDateString("fr-FR")}</span>
                  </p>
                </div>
              ))}
              {activity?.attempts?.map((a: any, i: number) => (
                <div key={`a-${i}`} className="p-4 flex gap-3 hover:bg-secondary/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.is_correct ? "bg-emerald-500" : "bg-destructive"}`} />
                  <p className="text-sm text-foreground">
                    <span className="font-bold">{a.studentName}</span> — quiz {a.is_correct ? "✅" : "❌"} sur <span className="font-bold">{a.courseTitle}</span>
                  </p>
                </div>
              ))}
              {(!activity?.enrollments?.length && !activity?.attempts?.length) && (
                <p className="text-sm text-muted-foreground p-5">Aucune activité récente</p>
              )}
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

// ==================== STUDENT DASHBOARD ====================
function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: enrollments, isLoading: enrollLoading } = useStudentEnrollments();
  const { data: classrooms, isLoading: classLoading } = useStudentClassrooms();
  const { data: notifications, isLoading: notifLoading } = useNotifications();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: conversations } = useConversations();

  const firstName = (profile?.full_name || "").split(" ")[0] || "Étudiant";
  const inProgressCourses = (enrollments || []).filter((e: any) => !e.completed && e.totalChapters > 0);
  const unreadNotifs = (notifications || []).filter((n: any) => !n.read_at);
  const unreadMessages = (conversations || []).filter((c: any) => c.unread > 0);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col w-full max-w-[680px] md:max-w-2xl lg:max-w-3xl mx-auto px-6 animate-in fade-in duration-500 pb-24 pt-4">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-8 px-1">
        <StatCard label="Cours en cours" value={inProgressCourses.length} icon={BookOpen} iconBg="bg-primary/10 text-primary" />
        <StatCard label="Classes" value={classrooms?.length || 0} icon={GraduationCap} iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
        <StatCard label="Notifications" value={unreadNotifs.length} icon={Bell} iconBg="bg-destructive/10 text-destructive" />
        <StatCard label="Messages" value={unreadMessages.length} icon={MessageSquare} iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
      </motion.div>

      {/* Mes cours en cours */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Mes cours en cours" icon={BookOpen} linkTo="/courses" />
        <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4">
          {enrollLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="min-w-[280px] h-44 rounded-3xl" />)
          ) : inProgressCourses.length > 0 ? (
            inProgressCourses.slice(0, 5).map((enrollment: any) => {
              const pct = enrollment.totalChapters > 0 ? Math.round((enrollment.completedChapters / enrollment.totalChapters) * 100) : 0;
              return (
                <div key={enrollment.id} className="min-w-[280px] bg-card rounded-3xl p-5 shadow-card border border-border flex flex-col">
                  <h3 className="font-bold text-foreground text-[15px] mb-1">{enrollment.courses?.title || "Cours"}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{enrollment.teacherName} · {enrollment.completedChapters}/{enrollment.totalChapters} chapitres</p>
                  <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progression</span>
                    <span className="text-[11px] font-bold text-primary">{pct}%</span>
                  </div>
                  <button onClick={() => navigate(`/courses/${enrollment.course_id}`)} className="mt-auto w-full bg-primary/10 text-primary font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                    <PlayCircle className="w-4 h-4" /> Continuer
                  </button>
                </div>
              );
            })
          ) : (
            <div className="w-full bg-card rounded-3xl p-5 shadow-card border border-border text-center">
              <p className="text-sm text-muted-foreground">Aucun cours en cours. <Link to="/courses" className="text-primary font-bold hover:underline">Découvrir →</Link></p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Mes classes */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Mes classes" icon={GraduationCap} linkTo="/classrooms" />
        <div className="flex flex-col gap-3">
          {classLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
          ) : classrooms && classrooms.length > 0 ? (
            classrooms.slice(0, 4).map((m: any) => (
              <div key={m.id} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-80 mb-1 block">
                    <Users className="w-3 h-3 inline mr-1" />{m.memberCount} membres
                  </span>
                  <h3 className="font-bold text-base">{m.classrooms?.name}</h3>
                </div>
                <button onClick={() => navigate("/classrooms")} className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-primary-foreground/30 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <Link to="/classrooms" className="flex items-center justify-center py-3 bg-secondary text-muted-foreground hover:text-foreground border border-dashed border-border rounded-2xl font-bold text-sm transition-colors">
              + Rejoindre une classe
            </Link>
          )}
        </div>
      </motion.section>

      {/* Événements */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Événements à venir" icon={Calendar} linkTo="/calendar" linkLabel="Voir l'agenda" />
        <div className="bg-card rounded-3xl border border-border shadow-card overflow-hidden">
          {eventsLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : events && events.length > 0 ? (
            <div className="divide-y divide-border">
              {events.slice(0, 5).map((event) => {
                const d = new Date(event.start_time);
                const month = d.toLocaleDateString("fr-FR", { month: "short" });
                const day = d.getDate();
                return (
                  <div key={event.id} className="p-4 flex gap-4 hover:bg-secondary/50 transition-colors">
                    <div className="w-12 h-14 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary shrink-0">
                      <span className="text-[10px] font-bold uppercase">{month}</span>
                      <span className="text-lg font-bold">{day}</span>
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucun événement à venir</p>
          )}
        </div>
      </motion.section>

      {/* Notifications & Messages */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Notifications" icon={Bell} linkTo="/notifications" />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {notifLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.slice(0, 3).map((notif) => (
                <div key={notif.id} className="p-4 flex gap-3 hover:bg-secondary/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read_at ? "bg-muted-foreground" : "bg-primary"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(notif.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucune notification</p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

// ==================== DEFAULT DASHBOARD ====================
function DefaultDashboard() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const { data: notifications, isLoading: notifLoading } = useNotifications();
  const { data: events, isLoading: eventsLoading } = useEvents();

  const firstName = (profile?.full_name || "").split(" ")[0] || "Utilisateur";
  const isAlumni = hasRole("alumni");
  const isAdmin = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col w-full max-w-[480px] md:max-w-2xl lg:max-w-4xl mx-auto px-4 animate-in fade-in duration-500 pb-24 pt-4">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-8 px-1">
        <StatCard label="Cours inscrits" value={enrollments?.length || 0} icon={BookOpen} iconBg="bg-primary/10 text-primary" />
        <StatCard label="Notifications" value={notifications?.filter((n: any) => !n.read_at).length || 0} icon={Bell} iconBg="bg-destructive/10 text-destructive" />
        <StatCard label="Événements" value={events?.length || 0} icon={Calendar} iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
        <StatCard label="Épreuves" value="-" icon={FileText} iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
      </motion.div>

      {/* Mes cours */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Mes cours" icon={BookOpen} linkTo="/courses" />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {enrollLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="divide-y divide-border">
              {enrollments.slice(0, 5).map((enrollment) => (
                <div key={enrollment.id} className="p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors">
                  <div className="w-2 h-10 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{(enrollment.courses as any)?.title || "Cours"}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Progress value={Number((enrollment as any).progress) || 0} className="w-20 h-2" />
                    <span className="text-xs font-bold text-muted-foreground w-8">{Math.round(Number((enrollment as any).progress) || 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun cours inscrit. <Link to="/courses" className="text-primary font-bold hover:underline">Explorer →</Link></p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Notifications */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Notifications" icon={Bell} linkTo="/notifications" />
        <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
          {notifLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className="p-4 flex gap-3 hover:bg-secondary/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read_at ? "bg-muted-foreground" : "bg-primary"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(notif.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucune notification</p>
          )}
        </div>
      </motion.section>

      {/* Événements */}
      <motion.section variants={fadeUp} className="px-1 mb-8">
        <SectionHeader title="Événements à venir" icon={Calendar} linkTo="/calendar" />
        <div className="bg-card rounded-3xl border border-border shadow-card overflow-hidden">
          {eventsLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : events && events.length > 0 ? (
            <div className="divide-y divide-border">
              {events.slice(0, 6).map((event) => {
                const d = new Date(event.start_time);
                return (
                  <div key={event.id} className="p-4 flex gap-4 hover:bg-secondary/50 transition-colors">
                    <div className="w-12 h-14 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary shrink-0">
                      <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
                      <span className="text-lg font-bold">{d.getDate()}</span>
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {d.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-5">Aucun événement à venir</p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const isTeacher = hasRole("teacher") && !hasRole("admin") && !hasRole("global_admin") && !hasRole("establishment_admin");
  const isStudent = hasRole("student") && !hasRole("teacher") && !hasRole("admin") && !hasRole("global_admin") && !hasRole("establishment_admin");

  return (
    <div className="flex flex-col min-h-full w-full bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl  px-4 pt-5 pb-4">
          <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bienvenue sur votre espace académique personnel.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {isTeacher ? <TeacherDashboard /> : isStudent ? <StudentDashboard /> : <DefaultDashboard />}
      </div>
    </div>
  );
}
