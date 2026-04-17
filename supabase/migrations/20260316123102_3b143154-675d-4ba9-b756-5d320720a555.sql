
-- Clean orphan posts
DELETE FROM public.posts WHERE user_id NOT IN (SELECT user_id FROM public.profiles);

-- Add unique constraint on profiles.user_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_unique') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- FK posts -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_user_id_profiles_fkey') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author_name text;
BEGIN
  SELECT full_name INTO _author_name FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO notifications (user_id, title, content, type, link)
  SELECT p.user_id, 'Nouvelle publication',
         COALESCE(_author_name, 'Quelqu''un') || ' a publié quelque chose',
         'post'::notification_type, '/feed'
  FROM profiles p WHERE p.user_id != NEW.user_id AND p.account_status = 'active';
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sender_name text;
BEGIN
  SELECT full_name INTO _sender_name FROM profiles WHERE user_id = NEW.sender_id;
  IF NEW.receiver_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (NEW.receiver_id, 'Nouveau message',
            COALESCE(_sender_name, 'Quelqu''un') || ' vous a envoyé un message',
            'message'::notification_type, '/messages');
  END IF;
  IF NEW.group_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    SELECT gm.user_id, 'Message dans le groupe',
           COALESCE(_sender_name, 'Quelqu''un') || ' a envoyé un message',
           'message'::notification_type, '/messages'
    FROM group_members gm WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.sender_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_classroom_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_name text; _classroom_name text; _creator_id uuid;
BEGIN
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name, created_by INTO _classroom_name, _creator_id FROM classrooms WHERE id = NEW.classroom_id;
  IF _creator_id IS NOT NULL AND _creator_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (_creator_id, 'Nouvel étudiant', COALESCE(_user_name,'Quelqu''un') || ' a rejoint ' || COALESCE(_classroom_name,'la classe'), 'course_update'::notification_type, '/classrooms');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_group_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_name text; _group_name text; _creator_id uuid;
BEGIN
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name, created_by INTO _group_name, _creator_id FROM groups WHERE id = NEW.group_id;
  IF _creator_id IS NOT NULL AND _creator_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (_creator_id, 'Nouveau membre', COALESCE(_user_name,'Quelqu''un') || ' a rejoint ' || COALESCE(_group_name,'le groupe'), 'group_invite'::notification_type, '/groups');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_new_post ON public.posts;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS on_classroom_join ON public.classroom_members;
DROP TRIGGER IF EXISTS on_group_join ON public.group_members;

CREATE TRIGGER on_new_post AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_new_post();
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
CREATE TRIGGER on_classroom_join AFTER INSERT ON public.classroom_members FOR EACH ROW EXECUTE FUNCTION public.notify_classroom_join();
CREATE TRIGGER on_group_join AFTER INSERT ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.notify_group_join();

-- Add cover_url to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cover_url') THEN
    ALTER TABLE public.profiles ADD COLUMN cover_url text DEFAULT '';
  END IF;
END $$;
