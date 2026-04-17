
-- Add completed/completed_at to course_enrollments
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Create event_rsvp table
CREATE TABLE IF NOT EXISTS public.event_rsvp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own rsvp" ON public.event_rsvp FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anyone can read rsvp" ON public.event_rsvp FOR SELECT USING (true);

-- Add unique constraint on course_progress for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_progress_user_chapter_unique'
  ) THEN
    ALTER TABLE public.course_progress ADD CONSTRAINT course_progress_user_chapter_unique UNIQUE (user_id, chapter_id);
  END IF;
END $$;

-- Add unique constraint on quiz_attempts for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_user_quiz_unique'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_user_quiz_unique UNIQUE (user_id, quiz_id);
  END IF;
END $$;

-- Update enrollment policy to allow students to update their own enrollments (for completion)
CREATE POLICY "students update own enrollments" ON public.course_enrollments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
