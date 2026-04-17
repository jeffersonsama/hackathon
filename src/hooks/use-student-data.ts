import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enrollments with course + teacher info
export function useStudentEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, courses(id, title, description, cover_image, category, created_by)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      // Get teacher names
      const teacherIds = [...new Set((data || []).map((e: any) => e.courses?.created_by).filter(Boolean))];
      let teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherIds);
        (profiles || []).forEach(p => teacherMap.set(p.user_id, p.full_name));
      }

      // Get chapter counts + progress per course
      const courseIds = (data || []).map((e: any) => e.course_id);
      let chapterCountMap = new Map<string, number>();
      let progressMap = new Map<string, number>();

      if (courseIds.length > 0) {
        const { data: chapters } = await supabase
          .from("course_chapters")
          .select("id, course_id")
          .in("course_id", courseIds);
        
        const countByCourse = new Map<string, number>();
        (chapters || []).forEach(ch => {
          countByCourse.set(ch.course_id, (countByCourse.get(ch.course_id) || 0) + 1);
        });
        chapterCountMap = countByCourse;

        const { data: progress } = await supabase
          .from("course_progress")
          .select("course_id, chapter_id, completed")
          .eq("user_id", user!.id)
          .eq("completed", true)
          .in("course_id", courseIds);

        const completedByCourse = new Map<string, number>();
        (progress || []).forEach(p => {
          completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) || 0) + 1);
        });
        progressMap = completedByCourse;
      }

      return (data || []).map((enrollment: any) => ({
        ...enrollment,
        teacherName: teacherMap.get(enrollment.courses?.created_by) || "Enseignant",
        totalChapters: chapterCountMap.get(enrollment.course_id) || 0,
        completedChapters: progressMap.get(enrollment.course_id) || 0,
      }));
    },
  });
}

// Student classrooms with teacher name + member count
export function useStudentClassrooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student-classrooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_members")
        .select("*, classrooms(id, name, subject, created_by, invite_code, classroom_members(count))")
        .eq("user_id", user!.id);
      if (error) throw error;

      const teacherIds = [...new Set((data || []).map((m: any) => m.classrooms?.created_by).filter(Boolean))];
      let teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
        (profiles || []).forEach(p => teacherMap.set(p.user_id, p.full_name));
      }

      return (data || []).map((m: any) => ({
        ...m,
        teacherName: teacherMap.get(m.classrooms?.created_by) || "Enseignant",
        memberCount: m.classrooms?.classroom_members?.[0]?.count || 0,
      }));
    },
  });
}

// Complete course enrollment
export function useCompleteCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ courseId, courseTitle, quizAverage }: { courseId: string; courseTitle: string; quizAverage: number }) => {
      // Update enrollment
      const { error } = await supabase
        .from("course_enrollments")
        .update({ completed: true, completed_at: new Date().toISOString(), progress: 100 } as any)
        .eq("course_id", courseId)
        .eq("user_id", user!.id);
      if (error) throw error;

      // Insert notification
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: "Cours terminé ! 🎓",
        content: `Vous avez complété le cours "${courseTitle}". Score moyen aux quiz : ${quizAverage}%`,
        type: "system" as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["course-progress"] });
    },
  });
}

// RSVP management
export function useEventRsvp(eventId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event-rsvp", eventId, user?.id],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_rsvp" as any)
        .select("*")
        .eq("event_id", eventId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useToggleRsvp() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: "attending" | "declined" }) => {
      const { error } = await supabase
        .from("event_rsvp" as any)
        .upsert({ event_id: eventId, user_id: user!.id, status } as any, { onConflict: "event_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-rsvp", vars.eventId] });
    },
  });
}

// Completed courses for profile
export function useCompletedCourses(userId: string | undefined) {
  return useQuery({
    queryKey: ["completed-courses", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, courses(title, created_by)")
        .eq("user_id", userId!)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      const teacherIds = [...new Set((data || []).map((e: any) => e.courses?.created_by).filter(Boolean))];
      let teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
        (profiles || []).forEach(p => teacherMap.set(p.user_id, p.full_name));
      }

      return (data || []).map((e: any) => ({
        ...e,
        teacherName: teacherMap.get(e.courses?.created_by) || "Enseignant",
      }));
    },
  });
}

// Course certificate data
export function useCertificateData(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["certificate", courseId, user?.id],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const [enrollmentRes, courseRes, profileRes] = await Promise.all([
        supabase.from("course_enrollments").select("*").eq("course_id", courseId!).eq("user_id", user!.id).single(),
        supabase.from("courses").select("title, created_by").eq("id", courseId!).single(),
        supabase.from("profiles").select("full_name").eq("user_id", user!.id).single(),
      ]);

      if (enrollmentRes.error || courseRes.error) throw new Error("Données introuvables");

      let teacherName = "Enseignant";
      if (courseRes.data?.created_by) {
        const { data: tp } = await supabase.from("profiles").select("full_name").eq("user_id", courseRes.data.created_by).single();
        if (tp) teacherName = tp.full_name;
      }

      // Calculate quiz average
      const { data: chapters } = await supabase.from("course_chapters").select("id").eq("course_id", courseId!);
      let quizAvg = 0;
      if (chapters?.length) {
        const { data: quizzes } = await supabase.from("course_quizzes").select("id").in("chapter_id", chapters.map(c => c.id));
        if (quizzes?.length) {
          const { data: attempts } = await supabase.from("quiz_attempts").select("is_correct").eq("user_id", user!.id).in("quiz_id", quizzes.map(q => q.id));
          if (attempts?.length) {
            quizAvg = Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100);
          }
        }
      }

      return {
        studentName: profileRes.data?.full_name || "Étudiant",
        courseTitle: courseRes.data?.title || "Cours",
        teacherName,
        completedAt: (enrollmentRes.data as any)?.completed_at || enrollmentRes.data?.enrolled_at,
        quizAverage: quizAvg,
        completed: (enrollmentRes.data as any)?.completed || false,
      };
    },
  });
}
