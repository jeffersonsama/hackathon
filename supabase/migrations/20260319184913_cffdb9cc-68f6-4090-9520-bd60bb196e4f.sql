
-- BLOCK 2: notification_preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "posts": true, "events": true, "class_activity": true, "announcements": true, "endorsements": true, "recommendations": true, "sound_enabled": true, "sound_volume": 40}';

-- BLOCK 4: onboarding_completed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- BLOCK 8: class_messages table
CREATE TABLE IF NOT EXISTS class_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  file_url text,
  file_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE class_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read class messages" ON class_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = class_messages.classroom_id AND user_id = auth.uid()));

CREATE POLICY "members send class messages" ON class_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = class_messages.classroom_id AND user_id = auth.uid()));

CREATE POLICY "owner deletes class messages" ON class_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM classrooms WHERE id = class_messages.classroom_id AND created_by = auth.uid()));

-- BLOCK 6: Add content_type and description columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description text;

-- Enable realtime on class_messages
ALTER PUBLICATION supabase_realtime ADD TABLE class_messages;

-- BLOCK 9: Add messages UPDATE policy so read receipts work
CREATE POLICY "users update own received messages" ON messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid() OR EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid())));

-- BLOCK 9: Allow establishment_admin same powers as admin for documents
DROP POLICY IF EXISTS "admins insert docs" ON official_documents;
CREATE POLICY "admins insert docs" ON official_documents FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

DROP POLICY IF EXISTS "admins update docs" ON official_documents;
CREATE POLICY "admins update docs" ON official_documents FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

DROP POLICY IF EXISTS "admins delete docs" ON official_documents;
CREATE POLICY "admins delete docs" ON official_documents FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

-- BLOCK 9: Allow establishment_admin for announcements
DROP POLICY IF EXISTS "admins insert announcements" ON announcements;
CREATE POLICY "admins insert announcements" ON announcements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

DROP POLICY IF EXISTS "admins update announcements" ON announcements;
CREATE POLICY "admins update announcements" ON announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

DROP POLICY IF EXISTS "admins delete announcements" ON announcements;
CREATE POLICY "admins delete announcements" ON announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

-- BLOCK 9: Allow establishment_admin to delete posts (moderation)
DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts FOR DELETE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));

-- BLOCK 9: Allow establishment_admin to delete comments (moderation)
DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin') OR has_role(auth.uid(), 'establishment_admin'));
