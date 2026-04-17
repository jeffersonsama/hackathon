import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---- Course detail ----
export function useCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
  });
}

// ---- Chapters ----
export function useChapters(courseId: string | undefined) {
  return useQuery({
    queryKey: ["chapters", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_chapters")
        .select("*")
        .eq("course_id", courseId!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { course_id: string; title: string; description: string; order_index: number }) => {
      const { error } = await supabase.from("course_chapters").insert(vars);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapters", v.course_id] }),
  });
}

export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; course_id: string }) => {
      const { error } = await supabase.from("course_chapters").delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapters", v.course_id] }),
  });
}

export function useUpdateChapterOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { chapters: { id: string; order_index: number }[]; course_id: string }) => {
      for (const ch of vars.chapters) {
        await supabase.from("course_chapters").update({ order_index: ch.order_index }).eq("id", ch.id);
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapters", v.course_id] }),
  });
}

// ---- Chapter Resources ----
export function useChapterResources(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-resources", chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_resources")
        .select("*")
        .eq("chapter_id", chapterId!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { chapter_id: string; title: string; file_url: string; file_type: string; order_index: number }) => {
      const { error } = await supabase.from("chapter_resources").insert(vars);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapter-resources", v.chapter_id] }),
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; chapter_id: string }) => {
      const { error } = await supabase.from("chapter_resources").delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapter-resources", v.chapter_id] }),
  });
}

// ---- Quizzes ----
export function useChapterQuizzes(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-quizzes", chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quizzes")
        .select("*")
        .eq("chapter_id", chapterId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { chapter_id: string; question: string; options: string[]; correct_answer: number }) => {
      const { error } = await supabase.from("course_quizzes").insert({
        chapter_id: vars.chapter_id,
        question: vars.question,
        options: vars.options,
        correct_answer: vars.correct_answer,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapter-quizzes", v.chapter_id] }),
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; chapter_id: string }) => {
      const { error } = await supabase.from("course_quizzes").delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chapter-quizzes", v.chapter_id] }),
  });
}

// ---- Progress ----
export function useCourseProgress(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkChapterComplete() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { course_id: string; chapter_id: string }) => {
      const { error } = await supabase.from("course_progress").upsert({
        user_id: user!.id,
        course_id: vars.course_id,
        chapter_id: vars.chapter_id,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,chapter_id" });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["course-progress", v.course_id] }),
  });
}

// ---- All student progress (for course creator) ----
export function useAllStudentProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: ["all-progress", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*, profiles!course_progress_user_id_fkey(full_name, avatar_url)")
        .eq("course_id", courseId!);
      // If FK join fails, just get without join
      if (error) {
        const { data: d2, error: e2 } = await supabase.from("course_progress").select("*").eq("course_id", courseId!);
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
  });
}

// ---- Enrolled students ----
export function useEnrolledStudents(courseId: string | undefined) {
  return useQuery({
    queryKey: ["enrolled-students", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, profiles:user_id(full_name, avatar_url, user_id)")
        .eq("course_id", courseId!);
      if (error) throw error;
      return data;
    },
  });
}

// ---- Quiz attempts ----
export function useMyQuizAttempts(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz-attempts", courseId, user?.id],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitQuizAnswer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { quiz_id: string; selected_answer: number; is_correct: boolean }) => {
      const { error } = await supabase.from("quiz_attempts").upsert({
        user_id: user!.id,
        quiz_id: vars.quiz_id,
        selected_answer: vars.selected_answer,
        is_correct: vars.is_correct,
      }, { onConflict: "user_id,quiz_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quiz-attempts"] }),
  });
}

// ---- All quiz attempts for course creator ----
export function useAllQuizAttempts(courseId: string | undefined) {
  return useQuery({
    queryKey: ["all-quiz-attempts", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      // Get all quizzes for this course first
      const { data: chapters } = await supabase.from("course_chapters").select("id").eq("course_id", courseId!);
      if (!chapters?.length) return [];
      const chapterIds = chapters.map(c => c.id);
      const { data: quizzes } = await supabase.from("course_quizzes").select("id, question, chapter_id").in("chapter_id", chapterIds);
      if (!quizzes?.length) return [];
      const quizIds = quizzes.map(q => q.id);
      const { data: attempts, error } = await supabase.from("quiz_attempts").select("*").in("quiz_id", quizIds);
      if (error) throw error;
      return { quizzes, attempts: attempts || [] };
    },
  });
}
