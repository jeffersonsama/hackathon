
-- 1. Enhance conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type text DEFAULT 'direct';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview text;

CREATE OR REPLACE FUNCTION validate_conversation_type() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('direct', 'group') THEN RAISE EXCEPTION 'Invalid conversation type: %', NEW.type; END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_validate_conversation_type ON conversations;
CREATE TRIGGER trg_validate_conversation_type BEFORE INSERT OR UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION validate_conversation_type();

-- 2. Create conversation_participants table FIRST
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. Now create security definer functions that reference the table
CREATE OR REPLACE FUNCTION is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = _conversation_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION is_conversation_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = _conversation_id AND user_id = _user_id AND is_admin = true)
$$;

-- 4. RLS policies on conversation_participants
CREATE POLICY "cp_select" ON conversation_participants FOR SELECT TO authenticated
  USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cp_insert" ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_conversation_admin(conversation_id, auth.uid()));
CREATE POLICY "cp_delete" ON conversation_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_conversation_admin(conversation_id, auth.uid()));
CREATE POLICY "cp_update" ON conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 5. Migrate existing conversations to participants
INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
SELECT id, user1_id, true FROM conversations WHERE user1_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;
INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
SELECT id, user2_id, false FROM conversations WHERE user2_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 6. Enhance messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_sender boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS call_status text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once boolean DEFAULT false;

CREATE OR REPLACE FUNCTION validate_message_type() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.message_type NOT IN ('text', 'file', 'image', 'video', 'audio_note', 'call_log', 'system') THEN
    RAISE EXCEPTION 'Invalid message_type: %', NEW.message_type; END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_validate_message_type ON messages;
CREATE TRIGGER trg_validate_message_type BEFORE INSERT OR UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION validate_message_type();

-- 7. Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_select" ON message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "mr_insert" ON message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mr_delete" ON message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 8. User presence
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY,
  status text DEFAULT 'offline',
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_select" ON user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence_insert" ON user_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_update" ON user_presence FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION validate_presence_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('online', 'away', 'busy', 'offline') THEN
    RAISE EXCEPTION 'Invalid presence status: %', NEW.status; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_validate_presence ON user_presence;
CREATE TRIGGER trg_validate_presence BEFORE INSERT OR UPDATE ON user_presence FOR EACH ROW EXECUTE FUNCTION validate_presence_status();

-- 9. Call sessions
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  initiated_by uuid,
  call_type text NOT NULL DEFAULT 'audio',
  status text DEFAULT 'ringing',
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer
);
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_select" ON call_sessions FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cs_insert" ON call_sessions FOR INSERT TO authenticated WITH CHECK (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cs_update" ON call_sessions FOR UPDATE TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION validate_call_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.call_type NOT IN ('audio', 'video') THEN RAISE EXCEPTION 'Invalid call_type'; END IF;
  IF NEW.status NOT IN ('ringing', 'active', 'ended', 'missed', 'declined') THEN RAISE EXCEPTION 'Invalid call status'; END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_validate_call ON call_sessions;
CREATE TRIGGER trg_validate_call BEFORE INSERT OR UPDATE ON call_sessions FOR EACH ROW EXECUTE FUNCTION validate_call_session();

-- 10. Update messages RLS
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "users update own received messages" ON messages;

CREATE POLICY "messages_select_v2" ON messages FOR SELECT TO authenticated USING (
  (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, auth.uid()) AND (deleted_for_everyone IS NOT TRUE) AND NOT (deleted_for_sender = true AND sender_id = auth.uid()))
  OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid()))
  OR sender_id = auth.uid()
  OR receiver_id = auth.uid()
);
CREATE POLICY "messages_insert_v2" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update_v2" ON messages FOR UPDATE TO authenticated USING (
  sender_id = auth.uid()
  OR (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, auth.uid()))
);

-- 11. Triggers
CREATE OR REPLACE FUNCTION update_conversation_last_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _sender_name text;
BEGIN
  IF NEW.conversation_id IS NOT NULL AND NEW.message_type != 'system' THEN
    SELECT full_name INTO _sender_name FROM profiles WHERE user_id = NEW.sender_id;
    UPDATE conversations SET last_message_at = NEW.sent_at, last_message_preview = COALESCE(_sender_name, '') || ': ' || LEFT(NEW.content, 80) WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_update_conv_last_msg ON messages;
CREATE TRIGGER trg_update_conv_last_msg AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

CREATE OR REPLACE FUNCTION log_call_end() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.status IN ('ended','missed','declined') AND OLD.status != NEW.status THEN
    INSERT INTO messages (conversation_id, sender_id, message_type, call_status, duration_seconds, content)
    VALUES (NEW.conversation_id, NEW.initiated_by, 'call_log', NEW.status, NEW.duration_seconds,
      CASE NEW.call_type WHEN 'audio' THEN 'Appel audio' WHEN 'video' THEN 'Appel vidéo' END);
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS on_call_end ON call_sessions;
CREATE TRIGGER on_call_end AFTER UPDATE ON call_sessions FOR EACH ROW EXECUTE FUNCTION log_call_end();

-- 12. Enable realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_presence; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
