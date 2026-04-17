
-- Add media support to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls jsonb DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'text';

-- Add attachment support to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type text;

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  subject text DEFAULT '',
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cover_image text DEFAULT '',
  is_active boolean DEFAULT true
);

-- Classroom members
CREATE TABLE IF NOT EXISTS classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'student',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, user_id)
);

-- RLS
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classrooms_select" ON classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "classrooms_insert" ON classrooms FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "classrooms_update" ON classrooms FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "classrooms_delete" ON classrooms FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cm_select" ON classroom_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "cm_insert" ON classroom_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cm_delete" ON classroom_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Open course creation to all authenticated users
DROP POLICY IF EXISTS "courses_insert" ON courses;
CREATE POLICY "courses_insert" ON courses FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Trigger for updated_at on classrooms
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
