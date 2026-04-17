
-- Course chapters
CREATE TABLE public.course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapters_select" ON public.course_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters_insert" ON public.course_chapters FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()));
CREATE POLICY "chapters_update" ON public.course_chapters FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()));
CREATE POLICY "chapters_delete" ON public.course_chapters FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()));

-- Chapter resources
CREATE TABLE public.chapter_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'link',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chapter_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources2_select" ON public.chapter_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources2_insert" ON public.chapter_resources FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "resources2_update" ON public.chapter_resources FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "resources2_delete" ON public.chapter_resources FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));

-- Course progress
CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, chapter_id)
);
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select" ON public.course_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM courses WHERE id = course_id AND created_by = auth.uid()));
CREATE POLICY "progress_insert" ON public.course_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update" ON public.course_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "progress_delete" ON public.course_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Course quizzes
CREATE TABLE public.course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_select" ON public.course_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quizzes_insert" ON public.course_quizzes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "quizzes_update" ON public.course_quizzes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "quizzes_delete" ON public.course_quizzes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM course_chapters ch JOIN courses c ON c.id = ch.course_id
    WHERE ch.id = chapter_id AND c.created_by = auth.uid()
  ));

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  selected_answer INT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempts_select" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM course_quizzes q JOIN course_chapters ch ON ch.id = q.chapter_id JOIN courses c ON c.id = ch.course_id
    WHERE q.id = quiz_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "attempts_insert" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "attempts_update" ON public.quiz_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "attempts_delete" ON public.quiz_attempts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('course-resources', 'course-resources', true);

CREATE POLICY "course_resources_read" ON storage.objects FOR SELECT USING (bucket_id = 'course-resources');
CREATE POLICY "course_resources_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-resources');
CREATE POLICY "course_resources_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-resources');
CREATE POLICY "course_resources_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-resources');
