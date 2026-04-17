
-- 1. Notification trigger for NEW EVENTS
CREATE OR REPLACE FUNCTION public.notify_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _creator_name text;
BEGIN
  SELECT full_name INTO _creator_name FROM profiles WHERE user_id = NEW.created_by;
  INSERT INTO notifications (user_id, title, content, type, related_id, link)
  SELECT p.user_id,
    'Nouvel événement',
    COALESCE(_creator_name, 'Quelqu''un') || ' a créé : ' || NEW.title,
    'event'::notification_type, NEW.id, '/calendar'
  FROM profiles p
  WHERE p.user_id != NEW.created_by AND p.account_status = 'active'
  LIMIT 200;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_event_trigger ON events;
CREATE TRIGGER notify_on_event_trigger
  AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION notify_on_event();

-- 2. Notification trigger for COMMENTS on posts
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _post_owner uuid; _commenter_name text; _post_title text;
BEGIN
  SELECT user_id, COALESCE(title, LEFT(content, 40)) INTO _post_owner, _post_title FROM posts WHERE id = NEW.post_id;
  IF _post_owner IS NULL OR _post_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT full_name INTO _commenter_name FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO notifications (user_id, title, content, type, related_id, link)
  VALUES (_post_owner,
    COALESCE(_commenter_name, 'Quelqu''un') || ' a commenté votre publication',
    LEFT(NEW.content, 80),
    'comment'::notification_type, NEW.post_id, '/feed');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_comment_trigger ON comments;
CREATE TRIGGER notify_on_comment_trigger
  AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- 3. Notification trigger for OFFICIAL DOCUMENTS published
CREATE OR REPLACE FUNCTION public.notify_on_official_doc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.published = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.published IS NULL OR OLD.published = false))) THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    SELECT p.user_id,
      'Nouveau document officiel',
      NEW.title,
      'system'::notification_type,
      '/documents'
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE p.account_status = 'active'
      AND (ur.role)::text = ANY(NEW.target_roles)
      AND p.user_id != COALESCE(NEW.published_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 200;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_official_doc_trigger ON official_documents;
CREATE TRIGGER notify_on_official_doc_trigger
  AFTER INSERT OR UPDATE ON official_documents FOR EACH ROW EXECUTE FUNCTION notify_on_official_doc();

-- 4. Fix group conversation message notification to handle group participants
CREATE OR REPLACE FUNCTION public.notify_on_conversation_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  sender_name text;
  conv_type text;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.message_type = 'system' THEN RETURN NEW; END IF;

  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
  SELECT type INTO conv_type FROM conversations WHERE id = NEW.conversation_id;

  IF conv_type = 'group' THEN
    -- Notify all group participants except sender
    INSERT INTO notifications (user_id, title, content, type, related_id, link)
    SELECT cp.user_id,
      COALESCE(sender_name, 'Quelqu''un'),
      LEFT(NEW.content, 80),
      'message'::notification_type,
      NEW.id,
      '/messages?conversation=' || NEW.conversation_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id != NEW.sender_id;
  ELSE
    -- Direct: notify the other participant
    INSERT INTO notifications (user_id, title, content, type, related_id, link)
    SELECT cp.user_id,
      COALESCE(sender_name, 'Quelqu''un'),
      LEFT(NEW.content, 80),
      'message'::notification_type,
      NEW.id,
      '/messages?conversation=' || NEW.conversation_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id != NEW.sender_id;
  END IF;
  RETURN NEW;
END; $$;
