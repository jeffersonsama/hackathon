import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTeacherCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTeacherCoursesWithStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-courses-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!courses?.length) return [];

      const courseIds = courses.map(c => c.id);
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id, user_id")
        .in("course_id", courseIds);

      // Get quiz stats
      const { data: chapters } = await supabase
        .from("course_chapters")
        .select("id, course_id")
        .in("course_id", courseIds);
      
      let avgScores: Record<string, number> = {};
      if (chapters?.length) {
        const chapterIds = chapters.map(c => c.id);
        const { data: quizzes } = await supabase
          .from("course_quizzes")
          .select("id, chapter_id")
          .in("chapter_id", chapterIds);
        if (quizzes?.length) {
          const quizIds = quizzes.map(q => q.id);
          const { data: attempts } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, is_correct")
            .in("quiz_id", quizIds);
          
          // Map quiz -> course
          const quizToCourse: Record<string, string> = {};
          for (const q of quizzes) {
            const ch = chapters.find(c => c.id === q.chapter_id);
            if (ch) quizToCourse[q.id] = ch.course_id;
          }
          
          const courseAttempts: Record<string, { correct: number; total: number }> = {};
          for (const a of (attempts || [])) {
            const cid = quizToCourse[a.quiz_id];
            if (!cid) continue;
            if (!courseAttempts[cid]) courseAttempts[cid] = { correct: 0, total: 0 };
            courseAttempts[cid].total++;
            if (a.is_correct) courseAttempts[cid].correct++;
          }
          for (const [cid, stats] of Object.entries(courseAttempts)) {
            avgScores[cid] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          }
        }
      }

      return courses.map(c => ({
        ...c,
        enrolledCount: (enrollments || []).filter(e => e.course_id === c.id).length,
        avgQuizScore: avgScores[c.id] ?? null,
      }));
    },
  });
}

export function useTeacherClassrooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-classrooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classrooms")
        .select("*, classroom_members(count)")
        .eq("created_by", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTeacherRecentActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get teacher's course IDs
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .eq("created_by", user!.id);
      if (!courses?.length) return { enrollments: [], attempts: [] };

      const courseIds = courses.map(c => c.id);
      const courseMap = Object.fromEntries(courses.map(c => [c.id, c.title]));

      // Recent enrollments
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id, enrolled_at, user_id, profiles:user_id(full_name)")
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
        .limit(5);

      // Recent quiz attempts
      const { data: chapters } = await supabase
        .from("course_chapters")
        .select("id, course_id")
        .in("course_id", courseIds);
      
      let recentAttempts: any[] = [];
      if (chapters?.length) {
        const chapterIds = chapters.map(c => c.id);
        const chapterToCourse = Object.fromEntries(chapters.map(c => [c.id, c.course_id]));
        const { data: quizzes } = await supabase
          .from("course_quizzes")
          .select("id, chapter_id")
          .in("chapter_id", chapterIds);
        if (quizzes?.length) {
          const quizToCourse: Record<string, string> = {};
          for (const q of quizzes) quizToCourse[q.id] = chapterToCourse[q.chapter_id];
          
          const quizIds = quizzes.map(q => q.id);
          const { data: attempts } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, is_correct, created_at, user_id")
            .in("quiz_id", quizIds)
            .order("created_at", { ascending: false })
            .limit(20);
          
          // Get unique user_ids for profile lookup
          const userIds = [...new Set((attempts || []).map(a => a.user_id))];
          let profileMap: Record<string, string> = {};
          if (userIds.length) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", userIds);
            profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
          }

          recentAttempts = (attempts || []).slice(0, 5).map((a: any) => ({
            ...a,
            studentName: profileMap[a.user_id] || "Étudiant",
            courseTitle: courseMap[quizToCourse[a.quiz_id]] || "Cours",
          }));
        }
      }

      return {
        enrollments: (enrollments || []).map(e => ({
          ...e,
          studentName: (e.profiles as any)?.full_name || "Étudiant",
          courseTitle: courseMap[e.course_id] || "Cours",
        })),
        attempts: recentAttempts,
      };
    },
  });
}
