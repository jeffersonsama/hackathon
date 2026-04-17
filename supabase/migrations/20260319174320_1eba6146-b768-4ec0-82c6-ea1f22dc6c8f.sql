
-- =============================================
-- SECTION 1: EVENT SCOPES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.event_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('school','class','department','role')),
  scope_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads event scopes" ON public.event_scopes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "creators manage own event scopes" ON public.event_scopes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events WHERE id = event_scopes.event_id AND created_by = auth.uid()
  ));

CREATE POLICY "creators delete own event scopes" ON public.event_scopes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events WHERE id = event_scopes.event_id AND created_by = auth.uid()
  ));

-- Add location column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location text DEFAULT '';

-- Add cover_image_url column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image_url text;

-- =============================================
-- SECTION 2: NOTIFICATIONS - add related_id column
-- =============================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id uuid;

-- =============================================
-- SECTION 3: CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users access own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "users create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "users delete own conversations" ON public.conversations
  FOR DELETE TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Add conversation_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Enable realtime on conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- =============================================
-- SECTION 4: GROUP MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  file_url text,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read messages" ON public.group_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "group members send messages" ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "group members delete own messages" ON public.group_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Enable realtime on group_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- =============================================
-- SECTION 5: STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('messages-files', 'messages-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('groups-files', 'groups-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for events bucket
CREATE POLICY "Anyone can read event images" ON storage.objects
  FOR SELECT USING (bucket_id = 'events');

CREATE POLICY "Authenticated users upload event images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'events' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for messages-files bucket
CREATE POLICY "Message participants read files" ON storage.objects
  FOR SELECT USING (bucket_id = 'messages-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users upload message files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'messages-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for groups-files bucket
CREATE POLICY "Group members read group files" ON storage.objects
  FOR SELECT USING (bucket_id = 'groups-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users upload group files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'groups-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- SECTION 6: UPDATE EVENTS RLS
-- =============================================
-- Drop existing select policy on events and replace with scope-aware one
DROP POLICY IF EXISTS "events_select" ON public.events;

CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.event_scopes es
      WHERE es.event_id = events.id
      AND (
        es.scope_type = 'school'
        OR (es.scope_type = 'class' AND EXISTS (
          SELECT 1 FROM public.classroom_members cm
          WHERE cm.classroom_id = es.scope_value::uuid AND cm.user_id = auth.uid()
        ))
        OR (es.scope_type = 'department' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.department = es.scope_value
        ))
        OR (es.scope_type = 'role' AND
          public.has_role(auth.uid(), es.scope_value::app_role)
        )
      )
    )
  );

-- =============================================
-- SECTION 7: Notification trigger for new messages
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_on_conversation_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT CASE
    WHEN c.user1_id = NEW.sender_id THEN c.user2_id
    ELSE c.user1_id
  END INTO recipient_id
  FROM conversations c WHERE c.id = NEW.conversation_id;
  
  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
  
  INSERT INTO notifications (user_id, title, content, type, related_id, link)
  VALUES (
    recipient_id,
    COALESCE(sender_name, 'Quelqu''un'),
    LEFT(NEW.content, 80),
    'message'::notification_type,
    NEW.id,
    '/messages?conversation=' || NEW.conversation_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_conversation_message_insert ON public.messages;
CREATE TRIGGER on_conversation_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_on_conversation_message();

-- Enable realtime on messages and event_scopes
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_scopes;
