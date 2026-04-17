
-- Part 1: Profile enhancements
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_info jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"publications": true, "cours": true, "epreuves": true, "groupes": true}';

-- Part 2: Posts enhancements  
ALTER TABLE posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_preview jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

-- Part 3: Profile experiences
CREATE TABLE IF NOT EXISTS profile_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  organization text NOT NULL,
  exp_type text DEFAULT 'emploi',
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  location text,
  created_at timestamptz DEFAULT NOW()
);
ALTER TABLE profile_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read experiences" ON profile_experiences FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner insert experiences" ON profile_experiences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner update experiences" ON profile_experiences FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner delete experiences" ON profile_experiences FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Part 4: Profile education
CREATE TABLE IF NOT EXISTS profile_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  degree text NOT NULL,
  field_of_study text,
  institution text NOT NULL,
  start_year integer,
  end_year integer,
  is_current boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT NOW()
);
ALTER TABLE profile_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read education" ON profile_education FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner insert education" ON profile_education FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner update education" ON profile_education FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner delete education" ON profile_education FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Part 5: Profile skills
CREATE TABLE IF NOT EXISTS profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_name text NOT NULL,
  skill_level text DEFAULT 'intermédiaire',
  category text DEFAULT 'Autre',
  endorsement_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read skills" ON profile_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner insert skills" ON profile_skills FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner update skills" ON profile_skills FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner delete skills" ON profile_skills FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Part 6: Skill endorsements
CREATE TABLE IF NOT EXISTS skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES profile_skills(id) ON DELETE CASCADE NOT NULL,
  endorsed_by uuid NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(skill_id, endorsed_by)
);
ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads endorsements" ON skill_endorsements FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated users endorse" ON skill_endorsements FOR INSERT TO authenticated WITH CHECK (endorsed_by = auth.uid());
CREATE POLICY "users remove own endorsement" ON skill_endorsements FOR DELETE TO authenticated USING (endorsed_by = auth.uid());

-- Endorsement count sync trigger
CREATE OR REPLACE FUNCTION sync_endorsement_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profile_skills SET endorsement_count = endorsement_count + 1 WHERE id = NEW.skill_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profile_skills SET endorsement_count = GREATEST(endorsement_count - 1, 0) WHERE id = OLD.skill_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER on_endorsement_change AFTER INSERT OR DELETE ON skill_endorsements FOR EACH ROW EXECUTE FUNCTION sync_endorsement_count();

-- Part 7: Peer recommendations
CREATE TABLE IF NOT EXISTS profile_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  relationship text,
  content text NOT NULL,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);
ALTER TABLE profile_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read visible recs" ON profile_recommendations FOR SELECT TO authenticated USING (is_visible = true OR to_user_id = auth.uid());
CREATE POLICY "auth write recs" ON profile_recommendations FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid() AND from_user_id != to_user_id);
CREATE POLICY "recipient controls recs" ON profile_recommendations FOR UPDATE TO authenticated USING (to_user_id = auth.uid());
CREATE POLICY "author deletes rec" ON profile_recommendations FOR DELETE TO authenticated USING (from_user_id = auth.uid());

-- Part 8: Official documents
CREATE TABLE IF NOT EXISTS official_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Autre',
  file_url text NOT NULL,
  file_size_kb integer,
  version text,
  published boolean DEFAULT false,
  published_at timestamptz,
  published_by uuid,
  target_roles text[] DEFAULT ARRAY['student','teacher','alumni','admin'],
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);
ALTER TABLE official_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targeted roles read docs" ON official_documents FOR SELECT TO authenticated USING (
  (published = true AND EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(official_documents.target_roles)
  )) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin')
);
CREATE POLICY "admins insert docs" ON official_documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));
CREATE POLICY "admins update docs" ON official_documents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));
CREATE POLICY "admins delete docs" ON official_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));

-- Part 9: Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text DEFAULT 'info',
  cover_image_url text,
  published boolean DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  published_by uuid,
  target_roles text[] DEFAULT ARRAY['student','teacher','alumni','admin'],
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targeted roles read announcements" ON announcements FOR SELECT TO authenticated USING (
  (published = true AND (expires_at IS NULL OR expires_at > NOW()) AND EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(announcements.target_roles)
  )) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin')
);
CREATE POLICY "admins insert announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));
CREATE POLICY "admins update announcements" ON announcements FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));
CREATE POLICY "admins delete announcements" ON announcements FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));

-- Storage bucket for official docs
INSERT INTO storage.buckets (id, name, public) VALUES ('official-docs', 'official-docs', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "admins upload official docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-docs' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin')));
CREATE POLICY "authenticated read official docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'official-docs');
CREATE POLICY "admins delete official docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'official-docs' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin')));

-- Covers bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "users upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
