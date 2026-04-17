
CREATE TABLE public.exam_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads exam comments" ON public.exam_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own comments" ON public.exam_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own comments" ON public.exam_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users update own comments" ON public.exam_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
